-- =====================================================
-- MIGRACIÓN: REFINAR POLÍTICAS RLS PARA TABLA CLIENTS
-- Objetivo: Implementar políticas RLS finas que diferencien permisos por rol
-- Fecha: 2025-01-27
-- =====================================================

-- =====================================================
-- ELIMINAR POLÍTICA GENERAL (TOO BROAD)
-- =====================================================

-- La política actual "org_members_can_view_clients" usa FOR ALL (too broad)
-- Esto permite TODAS las operaciones (SELECT, INSERT, UPDATE, DELETE) a todos los miembros
DROP POLICY IF EXISTS "org_members_can_view_clients" ON public.clients;

-- =====================================================
-- CREAR POLÍTICAS RLS FINAS (GRANULAR)
-- =====================================================

-- Política 1: SELECT (Lectura) - Todos los miembros pueden leer
CREATE POLICY "clients_org_isolation_select" ON public.clients
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
    ));

-- Política 2: INSERT (Inserción) - Todos los miembros pueden crear
CREATE POLICY "clients_org_isolation_insert" ON public.clients
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
    ));

-- Política 3: UPDATE (Actualización) - Solo admins y owners pueden actualizar
CREATE POLICY "clients_org_isolation_update" ON public.clients
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    ));

-- Política 4: DELETE (Eliminación) - Solo admins pueden eliminar
CREATE POLICY "clients_org_isolation_delete" ON public.clients
    FOR DELETE
    USING (org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ));

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON POLICY "clients_org_isolation_select" ON public.clients IS 
    'Permite a todos los miembros de la organización leer clientes (SELECT)';

COMMENT ON POLICY "clients_org_isolation_insert" ON public.clients IS 
    'Permite a todos los miembros de la organización crear clientes (INSERT)';

COMMENT ON POLICY "clients_org_isolation_update" ON public.clients IS 
    'Solo permite a administradores y propietarios actualizar clientes (UPDATE)';

COMMENT ON POLICY "clients_org_isolation_delete" ON public.clients IS 
    'Solo permite a administradores eliminar clientes (DELETE)';

