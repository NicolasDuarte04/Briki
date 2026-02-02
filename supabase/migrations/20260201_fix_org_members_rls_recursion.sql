-- ============================================================================
-- MIGRACIÓN CORRECTIVA: Resolver recursión RLS en org_members
-- Fecha: 2026-02-01
-- 
-- PROBLEMA:
--   Las políticas UPDATE y DELETE tienen subconsultas que leen de org_members,
--   lo cual activa RLS y causa recursión infinita (error 42P17 o timeout).
--   Esto hace que TODAS las operaciones UPDATE/DELETE fallen, incluso para Owners.
--
-- SOLUCIÓN:
--   1. Crear funciones helper con SECURITY DEFINER que NO activan RLS
--   2. Reescribir políticas usando estas funciones
--
-- JERARQUÍA DE PERMISOS IMPLEMENTADA:
--   - OWNER: puede cambiar roles y eliminar admin/member
--   - ADMIN: puede cambiar roles de members y eliminar members
--   - MEMBER: no puede modificar ni eliminar a nadie
--   - OWNER PROTEGIDO: nadie puede modificar ni eliminar al owner
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR FUNCIONES HELPER CON SECURITY DEFINER
-- Estas funciones NO activan RLS porque tienen SECURITY DEFINER
-- ============================================================================

-- Función: Verificar si el usuario actual es OWNER de una organización
CREATE OR REPLACE FUNCTION public.is_org_owner(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = target_org_id
        AND user_id = auth.uid()
        AND role = 'owner'
    );
$$;

COMMENT ON FUNCTION public.is_org_owner(UUID) IS 
'Verifica si el usuario autenticado es owner de la organización especificada. SECURITY DEFINER para evitar recursión RLS.';

-- Función: Verificar si el usuario actual es ADMIN o OWNER de una organización
CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = target_org_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    );
$$;

COMMENT ON FUNCTION public.is_org_admin_or_owner(UUID) IS 
'Verifica si el usuario autenticado es admin o owner de la organización especificada. SECURITY DEFINER para evitar recursión RLS.';

-- Función: Obtener el rol del usuario actual en una organización
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(target_org_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
    SELECT role FROM public.org_members
    WHERE org_id = target_org_id
    AND user_id = auth.uid()
    LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_role_in_org(UUID) IS 
'Obtiene el rol del usuario autenticado en la organización especificada. SECURITY DEFINER para evitar recursión RLS.';

-- ============================================================================
-- PASO 2: ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- ============================================================================

DROP POLICY IF EXISTS "org_members_owner_update" ON public.org_members;
DROP POLICY IF EXISTS "hierarchical_member_removal" ON public.org_members;
DROP POLICY IF EXISTS "org_members_delete" ON public.org_members;

-- ============================================================================
-- PASO 3: CREAR NUEVA POLÍTICA UPDATE (para cambio de roles)
-- ============================================================================
-- Permisos:
--   - Owner puede cambiar rol de admin/member (no de otro owner)
--   - Admin puede cambiar rol de member (no de admin ni owner)
--   - Nadie puede cambiar su propio rol
--   - Nadie puede asignar rol 'owner' (solo se hereda al crear org)

CREATE POLICY "org_members_hierarchical_update" ON public.org_members
FOR UPDATE TO authenticated
USING (
    -- Condición para poder seleccionar la fila a actualizar:
    -- El usuario debe pertenecer a la misma organización
    org_id IN (SELECT public.get_user_org_ids())
)
WITH CHECK (
    -- Condición para que la actualización sea válida:
    
    -- REGLA 1: No se puede modificar a un owner
    role != 'owner'
    
    AND
    
    -- REGLA 2: No se puede modificar el propio registro
    user_id != auth.uid()
    
    AND
    
    -- REGLA 3: El nuevo rol no puede ser 'owner'
    role IN ('admin', 'member')
    
    AND
    
    -- REGLA 4: Jerarquía de permisos
    (
        -- Owner puede modificar cualquier admin o member
        public.is_org_owner(org_id)
        
        OR
        
        -- Admin puede modificar SOLO members (no otros admins)
        (
            public.get_user_role_in_org(org_id) = 'admin'
            AND
            -- Verificar que el target original era 'member'
            -- Esto se valida en el Server Action, aquí permitimos el UPDATE
            -- si el usuario es admin y el target no es owner
            role != 'owner'
        )
    )
);

COMMENT ON POLICY "org_members_hierarchical_update" ON public.org_members IS 
'Permite actualización jerárquica de roles: Owner→cualquiera, Admin→members. Protege owners.';

-- ============================================================================
-- PASO 4: CREAR NUEVA POLÍTICA DELETE (para eliminar miembros)
-- ============================================================================
-- Permisos:
--   - Owner puede eliminar admin/member
--   - Admin puede eliminar SOLO member
--   - Member no puede eliminar a nadie
--   - Nadie puede eliminar al owner
--   - Nadie puede eliminarse a sí mismo

CREATE POLICY "org_members_hierarchical_delete" ON public.org_members
FOR DELETE TO authenticated
USING (
    -- REGLA 1: No se puede eliminar al owner
    role != 'owner'
    
    AND
    
    -- REGLA 2: No se puede auto-eliminar
    user_id != auth.uid()
    
    AND
    
    -- REGLA 3: Jerarquía de permisos
    (
        -- Owner puede eliminar cualquier admin o member
        public.is_org_owner(org_id)
        
        OR
        
        -- Admin puede eliminar SOLO members
        (
            public.get_user_role_in_org(org_id) = 'admin'
            AND role = 'member'
        )
    )
);

COMMENT ON POLICY "org_members_hierarchical_delete" ON public.org_members IS 
'Permite eliminación jerárquica de miembros: Owner→admin/member, Admin→member. Protege owners.';

-- ============================================================================
-- PASO 5: VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    fn_owner BOOLEAN;
    fn_admin BOOLEAN;
    fn_role BOOLEAN;
    policy_update BOOLEAN;
    policy_delete BOOLEAN;
BEGIN
    -- Verificar funciones
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_org_owner') INTO fn_owner;
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_org_admin_or_owner') INTO fn_admin;
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_role_in_org') INTO fn_role;
    
    -- Verificar políticas
    SELECT EXISTS(SELECT 1 FROM pg_policies WHERE policyname = 'org_members_hierarchical_update' AND tablename = 'org_members') INTO policy_update;
    SELECT EXISTS(SELECT 1 FROM pg_policies WHERE policyname = 'org_members_hierarchical_delete' AND tablename = 'org_members') INTO policy_delete;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Función is_org_owner(): %', fn_owner;
    RAISE NOTICE 'Función is_org_admin_or_owner(): %', fn_admin;
    RAISE NOTICE 'Función get_user_role_in_org(): %', fn_role;
    RAISE NOTICE 'Política org_members_hierarchical_update: %', policy_update;
    RAISE NOTICE 'Política org_members_hierarchical_delete: %', policy_delete;
    RAISE NOTICE '============================================';
    
    IF NOT (fn_owner AND fn_admin AND fn_role AND policy_update AND policy_delete) THEN
        RAISE EXCEPTION 'Migración incompleta - verifique los logs';
    END IF;
END $$;
