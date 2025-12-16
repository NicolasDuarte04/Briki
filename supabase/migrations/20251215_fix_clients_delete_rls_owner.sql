-- =====================================================
-- MIGRACIÓN: CORREGIR RLS DELETE PARA CLIENTS
-- =====================================================
-- Objetivo: Permitir que owners también puedan eliminar clientes
-- Problema: La política actual solo permite 'admin', pero la API route
--           valida 'admin' OR 'owner', causando error 403 para owners.
-- Solución: Alinear política RLS con la lógica de aplicación.
-- Fecha: 2025-12-15
-- Autor: Sistema
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICA EXISTENTE
-- =====================================================
-- La política actual es muy restrictiva (solo admin)
DROP POLICY IF EXISTS "clients_org_isolation_delete" ON public.clients;

-- =====================================================
-- PASO 2: CREAR POLÍTICA CORREGIDA
-- =====================================================
-- Ahora permite tanto admin como owner (consistente con UPDATE)
CREATE POLICY "clients_org_isolation_delete" ON public.clients
    FOR DELETE
    USING (org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    ));

-- =====================================================
-- PASO 3: ACTUALIZAR DOCUMENTACIÓN
-- =====================================================
COMMENT ON POLICY "clients_org_isolation_delete" ON public.clients IS 
    'Permite a administradores Y propietarios eliminar clientes (DELETE). Corregido 2025-12-15 para alinear con API route.';

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente)
-- =====================================================
-- SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr
-- FROM pg_policy
-- WHERE polrelid = 'public.clients'::regclass
-- AND polname = 'clients_org_isolation_delete';
-- 
-- Resultado esperado: 
-- using_expr debe contener: role IN ('admin'::text, 'owner'::text)
-- =====================================================
