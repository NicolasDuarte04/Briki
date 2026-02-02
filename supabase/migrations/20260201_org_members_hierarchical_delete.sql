-- ============================================================================
-- MIGRACIÓN: Política RLS para eliminación jerárquica de miembros
-- Fecha: 2026-02-01
-- Tabla: public.org_members
-- 
-- OBJETIVO: Permitir eliminación de miembros respetando jerarquía de roles
-- 
-- JERARQUÍA DE PERMISOS:
--   - OWNER puede eliminar: admin, member
--   - ADMIN puede eliminar: member
--   - MEMBER no puede eliminar: (nadie)
--   - NADIE puede eliminar: owner (PROTECCIÓN ABSOLUTA)
--   - NADIE puede eliminarse: a sí mismo
-- ============================================================================

-- ============================================================================
-- PASO 1: ELIMINAR POLÍTICA EXISTENTE (si existe)
-- ============================================================================
DROP POLICY IF EXISTS "hierarchical_member_removal" ON public.org_members;
DROP POLICY IF EXISTS "org_members_delete" ON public.org_members;

-- ============================================================================
-- PASO 2: CREAR POLÍTICA DELETE CON JERARQUÍA
-- ============================================================================
CREATE POLICY "hierarchical_member_removal" 
ON public.org_members
FOR DELETE 
TO authenticated
USING (
    -- =====================================================
    -- PROTECCIÓN ABSOLUTA: Owners NUNCA pueden ser eliminados
    -- =====================================================
    role != 'owner'
    
    AND
    
    -- =====================================================
    -- PROTECCIÓN: No auto-eliminación
    -- =====================================================
    user_id != (SELECT auth.uid())
    
    AND
    
    -- =====================================================
    -- JERARQUÍA DE PERMISOS
    -- =====================================================
    (
        -- CASO 1: Owner puede eliminar admin y member
        EXISTS (
            SELECT 1 
            FROM public.org_members AS requester
            WHERE requester.org_id = org_members.org_id
            AND requester.user_id = (SELECT auth.uid())
            AND requester.role = 'owner'
        )
        
        OR
        
        -- CASO 2: Admin puede eliminar SOLO members (no otros admins)
        (
            org_members.role = 'member'
            AND EXISTS (
                SELECT 1 
                FROM public.org_members AS requester
                WHERE requester.org_id = org_members.org_id
                AND requester.user_id = (SELECT auth.uid())
                AND requester.role = 'admin'
            )
        )
    )
);

-- ============================================================================
-- PASO 3: DOCUMENTACIÓN
-- ============================================================================
COMMENT ON POLICY "hierarchical_member_removal" ON public.org_members IS 
'Permite eliminación jerárquica de miembros:
- Owner puede eliminar admin/member
- Admin puede eliminar member
- Member no puede eliminar a nadie
- Owner NUNCA puede ser eliminado
- Nadie puede eliminarse a sí mismo';

-- ============================================================================
-- PASO 4: VERIFICACIÓN
-- ============================================================================
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'org_members' 
        AND policyname = 'hierarchical_member_removal'
        AND cmd = 'DELETE'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '============================================';
        RAISE NOTICE '✅ POLÍTICA DELETE CREADA EXITOSAMENTE';
        RAISE NOTICE '============================================';
        RAISE NOTICE 'Tabla: org_members';
        RAISE NOTICE 'Política: hierarchical_member_removal';
        RAISE NOTICE 'Comando: DELETE';
        RAISE NOTICE '';
        RAISE NOTICE 'Jerarquía implementada:';
        RAISE NOTICE '  - Owner → puede eliminar admin, member';
        RAISE NOTICE '  - Admin → puede eliminar member';
        RAISE NOTICE '  - Member → no puede eliminar';
        RAISE NOTICE '  - Owner → PROTEGIDO (no eliminable)';
        RAISE NOTICE '============================================';
    ELSE
        RAISE EXCEPTION 'ERROR: La política no se creó correctamente';
    END IF;
END $$;
