-- =====================================================
-- MIGRACIÓN: PERMITIR A OWNERS CAMBIAR ROLES DE MIEMBROS
-- =====================================================
-- Objetivo: Habilitar que usuarios con rol 'owner' puedan promover
--           miembros a 'admin' o degradar admins a 'member'
-- Fecha: 2025-12-15
-- Autor: Sistema
-- Restricciones:
--   - Solo OWNERS pueden cambiar roles
--   - No se puede cambiar el propio rol
--   - No se puede promover a 'owner' (solo via script manual)
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICA EXISTENTE (si existe)
-- =====================================================
DROP POLICY IF EXISTS "owners_can_update_member_roles" ON public.org_members;

-- =====================================================
-- PASO 2: CREAR POLÍTICA PARA UPDATE DE ROLES
-- =====================================================
CREATE POLICY "owners_can_update_member_roles"
ON public.org_members
FOR UPDATE
USING (
  -- Condición 1: El usuario que hace la request debe ser OWNER de la misma org
  EXISTS (
    SELECT 1 FROM public.org_members AS requester
    WHERE requester.org_id = org_members.org_id
    AND requester.user_id = auth.uid()
    AND requester.role = 'owner'
  )
  AND
  -- Condición 2: No puede cambiar su propio rol (prevenir auto-degradación)
  org_members.user_id != auth.uid()
)
WITH CHECK (
  -- Condición 3: El nuevo rol solo puede ser 'admin' o 'member'
  -- (no permitir promover a 'owner' via UI)
  role IN ('admin', 'member')
);

-- =====================================================
-- PASO 3: DOCUMENTACIÓN
-- =====================================================
COMMENT ON POLICY "owners_can_update_member_roles" ON public.org_members IS 
    'Permite a OWNERS cambiar roles de miembros entre admin y member. No permite cambiar el propio rol ni promover a owner.';

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================
-- Ejecutar en Supabase SQL Editor para verificar:
-- 
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   cmd as command,
--   qual as using_expression,
--   with_check as with_check_expression
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename = 'org_members'
-- AND policyname = 'owners_can_update_member_roles';
--
-- Resultado esperado:
-- - policyname: owners_can_update_member_roles
-- - command: UPDATE
-- - using_expression: (EXISTS ... AND org_members.user_id != auth.uid())
-- - with_check_expression: (role = ANY (ARRAY['admin'::text, 'member'::text]))
-- =====================================================
