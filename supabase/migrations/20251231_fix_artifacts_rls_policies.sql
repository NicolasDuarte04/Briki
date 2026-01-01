-- =====================================================
-- MIGRACIÓN: Corrección de Políticas RLS para Artifacts
-- Fecha: 2025-12-31
-- Objetivo: Corregir políticas RLS que referencian columna org_id inexistente
-- =====================================================
-- 
-- PROBLEMA DETECTADO:
-- La tabla 'artifacts' NO tiene columna 'org_id', pero las políticas RLS
-- existentes intentan usarla. Esto causa que las políticas fallen.
--
-- SOLUCIÓN:
-- Las políticas deben verificar permisos a través de la relación:
-- artifacts.case_id → cases.org_id → org_members.user_id
--
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Eliminar políticas RLS incorrectas de artifacts
-- =====================================================

DROP POLICY IF EXISTS "org_members_can_view_artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "org_members_can_insert_artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "org_members_can_update_artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "org_admins_can_delete_artifacts" ON public.artifacts;

-- =====================================================
-- PASO 2: Crear políticas RLS corregidas para artifacts
-- Usamos la relación: artifacts → cases → org_members
-- =====================================================

-- Política SELECT: Miembros de la org pueden ver artifacts de sus casos
CREATE POLICY "org_members_can_view_artifacts" 
    ON public.artifacts FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = artifacts.case_id 
              AND om.user_id = auth.uid()
        )
    );

-- Política INSERT: Miembros de la org pueden crear artifacts en sus casos
CREATE POLICY "org_members_can_insert_artifacts" 
    ON public.artifacts FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = artifacts.case_id 
              AND om.user_id = auth.uid()
        )
    );

-- Política UPDATE: Miembros de la org pueden actualizar artifacts de sus casos
CREATE POLICY "org_members_can_update_artifacts" 
    ON public.artifacts FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = artifacts.case_id 
              AND om.user_id = auth.uid()
        )
    );

-- Política DELETE: Solo admins/owners pueden eliminar artifacts
CREATE POLICY "org_admins_can_delete_artifacts" 
    ON public.artifacts FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            INNER JOIN public.org_members om ON c.org_id = om.org_id
            WHERE c.id = artifacts.case_id 
              AND om.user_id = auth.uid()
              AND om.role IN ('admin', 'owner')
        )
    );

-- =====================================================
-- PASO 3: Verificación de políticas creadas
-- =====================================================

-- Esta query mostrará las políticas activas en artifacts
-- Ejecutar después del COMMIT para verificar:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'artifacts';

COMMIT;

-- =====================================================
-- NOTAS DE MIGRACIÓN
-- =====================================================
-- Esta migración es IDEMPOTENTE. Se puede ejecutar múltiples veces.
-- 
-- ANTES: Políticas usaban artifacts.org_id (columna inexistente)
-- DESPUÉS: Políticas usan artifacts.case_id → cases.org_id
--
-- VERIFICACIÓN POST-MIGRACIÓN:
-- 1. Probar subida de PDF en un caso
-- 2. Verificar que solo usuarios de la org pueden ver el artifact
-- 3. Verificar que solo admins/owners pueden eliminar
-- =====================================================

