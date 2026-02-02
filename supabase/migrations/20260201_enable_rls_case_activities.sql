-- ============================================================================
-- MIGRACIÓN: Habilitar RLS en case_activities
-- Fecha: 2026-02-01
-- Tabla: public.case_activities
-- 
-- OBJETIVO: Implementar Row Level Security para la tabla case_activities
-- que almacena el registro de trabajos en background (jobs de análisis, etc.)
-- 
-- MODELO DE ACCESO:
-- - case_activities pertenece a un Case (via case_id)
-- - Case pertenece a una Organization (via org_id)
-- - Usuario debe ser miembro de la organización del caso para acceder
-- - DELETE restringido a admins/owners
-- ============================================================================

-- ============================================================================
-- PASO 1: HABILITAR RLS EN LA TABLA
-- ============================================================================

ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: CREAR POLÍTICAS RLS
-- Usamos subquery optimizada con (SELECT auth.uid()) para mejor rendimiento
-- y join a cases para verificar org_id del caso padre
-- ============================================================================

-- Política SELECT: Miembros de la organización del caso pueden ver actividades
CREATE POLICY "org_members_can_view_case_activities"
    ON public.case_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = case_activities.case_id
            AND om.user_id = (SELECT auth.uid())
        )
    );

-- Política INSERT: Miembros de la organización pueden crear actividades
-- Además, el user_id del registro debe coincidir con el usuario autenticado
CREATE POLICY "org_members_can_insert_case_activities"
    ON public.case_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- El usuario debe ser miembro de la org del caso
        EXISTS (
            SELECT 1 
            FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = case_activities.case_id
            AND om.user_id = (SELECT auth.uid())
        )
        -- Y el user_id del registro debe ser el usuario autenticado
        AND user_id = (SELECT auth.uid())
    );

-- Política UPDATE: Solo el usuario que creó la actividad puede actualizarla
-- (o miembros de la organización para actualizaciones de progreso)
CREATE POLICY "org_members_can_update_case_activities"
    ON public.case_activities
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = case_activities.case_id
            AND om.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = case_activities.case_id
            AND om.user_id = (SELECT auth.uid())
        )
    );

-- Política DELETE: Solo admins/owners de la organización pueden eliminar actividades
CREATE POLICY "org_admins_can_delete_case_activities"
    ON public.case_activities
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = case_activities.case_id
            AND om.user_id = (SELECT auth.uid())
            AND om.role IN ('admin', 'owner')
        )
    );

-- ============================================================================
-- PASO 3: CREAR ÍNDICE PARA OPTIMIZAR LAS POLÍTICAS RLS
-- El índice en case_id ya existe según el schema de Prisma
-- Verificamos que user_id también tenga índice (ya existe)
-- ============================================================================

-- Índice compuesto para optimizar la verificación de políticas
-- Comentado porque los índices individuales ya existen en el schema
-- CREATE INDEX IF NOT EXISTS idx_case_activities_case_user 
--     ON public.case_activities(case_id, user_id);

-- ============================================================================
-- PASO 4: VERIFICACIÓN
-- ============================================================================

-- Comentario de verificación post-migración:
-- 1. Verificar RLS está habilitado:
--    SELECT relrowsecurity FROM pg_class WHERE relname = 'case_activities';
--    Debe retornar: true
--
-- 2. Listar políticas creadas:
--    SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'case_activities';
--    Debe mostrar 4 políticas: SELECT, INSERT, UPDATE, DELETE
--
-- 3. Probar con usuario autenticado:
--    - Crear un caso en una organización
--    - Insertar una actividad
--    - Verificar que solo miembros de esa org pueden ver la actividad
-- ============================================================================

COMMENT ON TABLE public.case_activities IS 
'Registro de trabajos en background (análisis de pólizas, extracciones, etc.). 
RLS habilitado: acceso restringido a miembros de la organización del caso padre.';
