-- =====================================================
-- SCRIPT DE VERIFICACIÓN: MULTI-TENANCY EN profiles
-- Objetivo: Verificar que las mejoras de multi-tenancy se aplicaron correctamente
-- Fecha: 2025-01-08
-- =====================================================

-- =====================================================
-- VERIFICACIÓN 1: RLS HABILITADO
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 1: RLS ===' as verificacion;

SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS NO HABILITADO'
    END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- =====================================================
-- VERIFICACIÓN 2: POLÍTICAS RLS CREADAS
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 2: POLÍTICAS RLS ===' as verificacion;

SELECT 
    policyname,
    cmd as operacion,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ SELECT'
        WHEN cmd = 'INSERT' THEN '✅ INSERT'
        WHEN cmd = 'UPDATE' THEN '✅ UPDATE'
        WHEN cmd = 'DELETE' THEN '✅ DELETE'
    END as estado,
    CASE 
        WHEN policyname LIKE '%own%' THEN 'Política original (propio perfil)'
        WHEN policyname LIKE '%colleague%' OR policyname LIKE '%member%' THEN 'Política nueva (multi-tenant)'
        ELSE 'Otra política'
    END as tipo_politica
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END,
    policyname;

-- Verificar que hay políticas para multi-tenancy
SELECT 
    COUNT(*) FILTER (WHERE policyname LIKE '%colleague%' OR policyname LIKE '%member%') as politicas_multitenancy,
    CASE 
        WHEN COUNT(*) FILTER (WHERE policyname LIKE '%colleague%' OR policyname LIKE '%member%') > 0 
        THEN '✅ Políticas multi-tenant creadas'
        ELSE '❌ Faltan políticas multi-tenant'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- =====================================================
-- VERIFICACIÓN 3: ÍNDICES
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 3: ÍNDICES ===' as verificacion;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'org_members'
  AND indexname = 'idx_org_members_org_user';

-- =====================================================
-- VERIFICACIÓN 4: ESTRUCTURA DE profiles
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 4: ESTRUCTURA ===' as verificacion;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'org_id' THEN '⚠️  Tiene org_id (no recomendado)'
        ELSE '✅ Sin org_id (correcto - relación indirecta)'
    END as estado
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'org_id';

-- =====================================================
-- VERIFICACIÓN 5: RELACIÓN CON ORGANIZACIONES
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 5: RELACIÓN CON ORGANIZACIONES ===' as verificacion;

-- Verificar que la relación indirecta funciona
SELECT 
    COUNT(DISTINCT p.id) as total_perfiles,
    COUNT(DISTINCT om.org_id) as total_organizaciones,
    COUNT(DISTINCT om.user_id) as usuarios_con_org
FROM profiles p
LEFT JOIN org_members om ON p.id = om.user_id;

-- =====================================================
-- VERIFICACIÓN 6: CASOS DE USO MULTI-TENANT
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 6: CASOS DE USO ===' as verificacion;

-- Verificar que hay usuarios en múltiples organizaciones
SELECT 
    COUNT(*) as usuarios_multi_org,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Hay usuarios en múltiples organizaciones'
        ELSE 'ℹ️  Todos los usuarios están en una sola organización'
    END as estado
FROM (
    SELECT user_id
    FROM org_members
    GROUP BY user_id
    HAVING COUNT(DISTINCT org_id) > 1
) multi_org_users;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================
SELECT 
    '=== RESUMEN FINAL ===' as verificacion;

SELECT 
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') as rls_habilitado,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') as total_politicas,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT') as politicas_select,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'UPDATE') as politicas_update,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'DELETE') as politicas_delete,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'org_members' AND indexname = 'idx_org_members_org_user') as indice_org_user;

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Para probar multi-tenancy en acción:
-- 1. Autenticarte como Usuario A (Org A, role: admin/owner)
-- 2. Intentar SELECT * FROM profiles WHERE id IN (SELECT user_id FROM org_members WHERE org_id = '[ORG_A_ID]');
-- 3. Debe retornar perfiles de todos los miembros de Org A
-- 4. Autenticarte como Usuario B (Org B)
-- 5. Intentar la misma consulta con ORG_A_ID
-- 6. NO debe retornar perfiles de Org A (solo de Org B)

