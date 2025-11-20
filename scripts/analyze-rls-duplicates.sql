-- =====================================================
-- SCRIPT DE ANÁLISIS: POLÍTICAS RLS DUPLICADAS
-- Objetivo: Identificar políticas duplicadas en cases y artifacts
-- Fecha: 2025-01-08
-- =====================================================

-- =====================================================
-- 1. POLÍTICAS RLS EN CASES
-- =====================================================
SELECT '=== POLÍTICAS RLS EN CASES ===' as seccion;

SELECT 
    policyname,
    cmd as operacion,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cases'
ORDER BY cmd, policyname;

-- Contar políticas por operación
SELECT 
    cmd as operacion,
    COUNT(*) as total_politicas,
    STRING_AGG(policyname, ', ') as nombres_politicas
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

-- =====================================================
-- 2. POLÍTICAS RLS EN ARTIFACTS
-- =====================================================
SELECT '=== POLÍTICAS RLS EN ARTIFACTS ===' as seccion;

SELECT 
    policyname,
    cmd as operacion,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'artifacts'
ORDER BY cmd, policyname;

-- Contar políticas por operación
SELECT 
    cmd as operacion,
    COUNT(*) as total_politicas,
    STRING_AGG(policyname, ', ') as nombres_politicas
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
-- 3. VERIFICAR FUNCIONES HELPER
-- =====================================================
SELECT '=== FUNCIONES HELPER ===' as seccion;

SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_org_member', 'is_org_admin', 'get_user_role')
ORDER BY routine_name;

-- =====================================================
-- 4. VERIFICAR RLS HABILITADO
-- =====================================================
SELECT '=== RLS HABILITADO ===' as seccion;

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
-- 5. IDENTIFICAR DUPLICADOS
-- =====================================================
SELECT '=== IDENTIFICACIÓN DE DUPLICADOS ===' as seccion;

-- Políticas duplicadas en cases (misma operación, diferentes nombres)
SELECT 
    cmd as operacion,
    COUNT(*) as total,
    CASE 
        WHEN COUNT(*) > 1 THEN '⚠️  DUPLICADAS'
        ELSE '✅ ÚNICA'
    END as estado,
    STRING_AGG(policyname, ', ') as politicas
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cases'
GROUP BY cmd
HAVING COUNT(*) > 1
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- Políticas duplicadas en artifacts (misma operación, diferentes nombres)
SELECT 
    cmd as operacion,
    COUNT(*) as total,
    CASE 
        WHEN COUNT(*) > 1 THEN '⚠️  DUPLICADAS'
        ELSE '✅ ÚNICA'
    END as estado,
    STRING_AGG(policyname, ', ') as politicas
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'artifacts'
GROUP BY cmd
HAVING COUNT(*) > 1
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- =====================================================
-- 6. COMPARAR LÓGICA DE POLÍTICAS
-- =====================================================
SELECT '=== COMPARACIÓN DE LÓGICA ===' as seccion;

-- Comparar políticas SELECT en cases
SELECT 
    policyname,
    qual as using_expression,
    CASE 
        WHEN qual LIKE '%is_org_member%' THEN '✅ Usa función helper'
        WHEN qual LIKE '%org_members%' THEN '⚠️  Subconsulta directa'
        ELSE '❓ Desconocida'
    END as tipo_implementacion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cases'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Comparar políticas SELECT en artifacts
SELECT 
    policyname,
    qual as using_expression,
    CASE 
        WHEN qual LIKE '%case_id%' THEN '✅ Verifica a través de cases'
        WHEN qual LIKE '%org_id%' THEN '⚠️  Verifica org_id directamente (puede no existir)'
        ELSE '❓ Desconocida'
    END as tipo_implementacion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'artifacts'
  AND cmd = 'SELECT'
ORDER BY policyname;

