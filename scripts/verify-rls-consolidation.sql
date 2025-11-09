-- =====================================================
-- SCRIPT DE VERIFICACIÓN: CONSOLIDACIÓN DE POLÍTICAS RLS
-- Objetivo: Verificar que la consolidación se aplicó correctamente
-- Fecha: 2025-01-08
-- =====================================================

-- =====================================================
-- VERIFICACIÓN 1: RLS HABILITADO
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 1: RLS HABILITADO ===' as verificacion;

SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS NO HABILITADO'
    END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('cases', 'artifacts')
ORDER BY tablename;

-- =====================================================
-- VERIFICACIÓN 2: POLÍTICAS CORRECTAS EXISTEN
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 2: POLÍTICAS CORRECTAS ===' as verificacion;

-- Políticas correctas en cases
SELECT 
    'cases' as tabla,
    policyname,
    cmd as operacion,
    CASE 
        WHEN policyname LIKE 'cases_org_isolation_%' THEN '✅ CORRECTA'
        ELSE '⚠️  Otra política'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cases'
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END,
    policyname;

-- Políticas correctas en artifacts
SELECT 
    'artifacts' as tabla,
    policyname,
    cmd as operacion,
    CASE 
        WHEN policyname LIKE 'artifacts_org_isolation_%' THEN '✅ CORRECTA'
        ELSE '⚠️  Otra política'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'artifacts'
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END,
    policyname;

-- =====================================================
-- VERIFICACIÓN 3: NO HAY POLÍTICAS DUPLICADAS
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 3: DUPLICADOS ===' as verificacion;

-- Verificar duplicados en cases
SELECT 
    'cases' as tabla,
    cmd as operacion,
    COUNT(*) as total_politicas,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ ÚNICA'
        WHEN COUNT(*) > 1 THEN '⚠️  DUPLICADAS'
        ELSE '❌ FALTA'
    END as estado,
    STRING_AGG(policyname, ', ') as politicas
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cases'
GROUP BY cmd
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- Verificar duplicados en artifacts
SELECT 
    'artifacts' as tabla,
    cmd as operacion,
    COUNT(*) as total_politicas,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ ÚNICA'
        WHEN COUNT(*) > 1 THEN '⚠️  DUPLICADAS'
        ELSE '❌ FALTA'
    END as estado,
    STRING_AGG(policyname, ', ') as politicas
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'artifacts'
GROUP BY cmd
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- =====================================================
-- VERIFICACIÓN 4: POLÍTICAS ELIMINADAS NO EXISTEN
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 4: POLÍTICAS ELIMINADAS ===' as verificacion;

-- Verificar que políticas antiguas de cases no existen
SELECT 
    'cases' as tabla,
    policyname,
    CASE 
        WHEN policyname LIKE 'org_members_can_%' THEN '❌ DEBE SER ELIMINADA'
        ELSE '✅ OK'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cases'
  AND policyname LIKE 'org_members_can_%'
ORDER BY policyname;

-- Verificar que políticas antiguas de artifacts no existen
SELECT 
    'artifacts' as tabla,
    policyname,
    CASE 
        WHEN policyname LIKE 'org_members_can_%' THEN '❌ DEBE SER ELIMINADA'
        ELSE '✅ OK'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'artifacts'
  AND policyname LIKE 'org_members_can_%'
ORDER BY policyname;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================
SELECT 
    '=== RESUMEN FINAL ===' as verificacion;

SELECT 
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases') as total_politicas_cases,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'artifacts') as total_politicas_artifacts,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname LIKE 'cases_org_isolation_%') as politicas_correctas_cases,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'artifacts' AND policyname LIKE 'artifacts_org_isolation_%') as politicas_correctas_artifacts,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname LIKE 'org_members_can_%') as politicas_antiguas_cases,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'artifacts' AND policyname LIKE 'org_members_can_%') as politicas_antiguas_artifacts;

