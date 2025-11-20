-- =====================================================
-- SCRIPT DE ANÁLISIS EXHAUSTIVO: MULTI-TENANCY EN profiles
-- Objetivo: Analizar todos los aspectos de multi-tenancy en profiles
-- Fecha: 2025-01-08
-- =====================================================

-- =====================================================
-- 1. ESTRUCTURA ACTUAL DE profiles
-- =====================================================
SELECT '=== 1. ESTRUCTURA DE profiles ===' as seccion;

SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- =====================================================
-- 2. RELACIONES Y FOREIGN KEYS
-- =====================================================
SELECT '=== 2. RELACIONES Y FOREIGN KEYS ===' as seccion;

SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'profiles'
ORDER BY tc.constraint_type, tc.constraint_name;

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================
SELECT '=== 3. ROW LEVEL SECURITY ===' as seccion;

-- Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS NO HABILITADO'
    END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- Verificar políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- 4. ANÁLISIS DE RELACIÓN CON ORGANIZACIONES
-- =====================================================
SELECT '=== 4. RELACIÓN CON ORGANIZACIONES ===' as seccion;

-- Verificar si hay columna org_id
SELECT 
    column_name,
    CASE 
        WHEN column_name = 'org_id' THEN '✅ Existe columna org_id'
        ELSE '❌ No existe columna org_id'
    END as estado
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'org_id';

-- Análisis: ¿Cuántos usuarios están en múltiples organizaciones?
SELECT 
    '=== USUARIOS EN MÚLTIPLES ORGANIZACIONES ===' as analisis;

SELECT 
    user_id,
    COUNT(DISTINCT org_id) as total_organizaciones,
    STRING_AGG(DISTINCT org_id::text, ', ') as org_ids
FROM org_members
GROUP BY user_id
HAVING COUNT(DISTINCT org_id) > 1
ORDER BY total_organizaciones DESC
LIMIT 10;

-- =====================================================
-- 5. ANÁLISIS DE CASOS DE USO MULTI-TENANT
-- =====================================================
SELECT '=== 5. CASOS DE USO MULTI-TENANT ===' as seccion;

-- Caso 1: ¿Cuántos perfiles hay por organización?
SELECT 
    '=== PERFILES POR ORGANIZACIÓN (vía org_members) ===' as caso;

SELECT 
    om.org_id,
    o.name as org_name,
    COUNT(DISTINCT p.id) as total_perfiles,
    COUNT(DISTINCT om.user_id) as total_miembros
FROM org_members om
JOIN organizations o ON om.org_id = o.id
LEFT JOIN profiles p ON om.user_id = p.id
GROUP BY om.org_id, o.name
ORDER BY total_perfiles DESC
LIMIT 10;

-- Caso 2: ¿Hay perfiles sin organización?
SELECT 
    '=== PERFILES SIN ORGANIZACIÓN ===' as caso;

SELECT 
    COUNT(*) as perfiles_sin_org
FROM profiles p
LEFT JOIN org_members om ON p.id = om.user_id
WHERE om.user_id IS NULL;

-- =====================================================
-- 6. ANÁLISIS DE SEGURIDAD ACTUAL
-- =====================================================
SELECT '=== 6. ANÁLISIS DE SEGURIDAD ===' as seccion;

-- Verificar si las políticas actuales permiten acceso cruzado
SELECT 
    '=== POLÍTICAS ACTUALES ===' as analisis;

SELECT 
    policyname,
    cmd,
    qual as using_expression,
    CASE 
        WHEN qual LIKE '%auth.uid() = id%' THEN '✅ Solo propio perfil'
        WHEN qual LIKE '%org_members%' THEN '✅ Considera organizaciones'
        ELSE '⚠️  Política desconocida'
    END as tipo_politica
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- =====================================================
-- 7. ANÁLISIS DE CIFRADO
-- =====================================================
SELECT '=== 7. VERIFICACIÓN DE CIFRADO ===' as seccion;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'bytea' THEN '✅ ENCRIPTADO (BYTEA)'
        ELSE '❌ NO ENCRIPTADO'
    END as estado_cifrado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('name_enc', 'phone', 'address');

-- =====================================================
-- 8. RESUMEN FINAL
-- =====================================================
SELECT '=== RESUMEN FINAL ===' as seccion;

SELECT 
    'profiles' as tabla,
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') as rls_habilitado,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') as total_politicas_rls,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'org_id') as tiene_org_id,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND table_name = 'profiles' AND constraint_type = 'FOREIGN KEY' AND constraint_name LIKE '%org%') as tiene_fk_org;

