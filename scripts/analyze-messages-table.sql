-- =====================================================
-- SCRIPT DE ANÁLISIS EXHAUSTIVO: TABLA messages
-- Objetivo: Analizar todos los aspectos de seguridad y estructura
-- Fecha: 2025-01-08
-- =====================================================

-- =====================================================
-- 1. ESTRUCTURA DE LA TABLA
-- =====================================================
SELECT '=== 1. ESTRUCTURA DE COLUMNAS ===' as seccion;

SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- =====================================================
-- 2. CONSTRAINTS Y FOREIGN KEYS
-- =====================================================
SELECT '=== 2. CONSTRAINTS Y FOREIGN KEYS ===' as seccion;

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
  AND tc.table_name = 'messages'
ORDER BY tc.constraint_type, tc.constraint_name;

-- =====================================================
-- 3. ÍNDICES
-- =====================================================
SELECT '=== 3. ÍNDICES ===' as seccion;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'messages'
ORDER BY indexname;

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================
SELECT '=== 4. ROW LEVEL SECURITY ===' as seccion;

-- Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'messages';

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
  AND tablename = 'messages'
ORDER BY policyname;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================
SELECT '=== 5. TRIGGERS ===' as seccion;

SELECT
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'messages'
ORDER BY trigger_name;

-- =====================================================
-- 6. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================
SELECT '=== 6. COMENTARIOS ===' as seccion;

SELECT
    obj_description('public.messages'::regclass, 'pg_class') as table_comment;

SELECT
    col_description('public.messages'::regclass, ordinal_position) as column_comment,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- =====================================================
-- 7. ESTADÍSTICAS DE DATOS
-- =====================================================
SELECT '=== 7. ESTADÍSTICAS ===' as seccion;

SELECT 
    COUNT(*) as total_mensajes,
    COUNT(DISTINCT case_id) as casos_unicos,
    COUNT(DISTINCT role) as roles_unicos,
    COUNT(CASE WHEN content IS NULL THEN 1 END) as mensajes_sin_contenido,
    COUNT(CASE WHEN content IS NOT NULL THEN 1 END) as mensajes_con_contenido,
    MIN(created_at) as mensaje_mas_antiguo,
    MAX(created_at) as mensaje_mas_reciente
FROM public.messages;

-- =====================================================
-- 8. VERIFICACIÓN DE INTEGRIDAD REFERENCIAL
-- =====================================================
SELECT '=== 8. INTEGRIDAD REFERENCIAL ===' as seccion;

-- Verificar si hay mensajes huérfanos (case_id que no existe en cases)
SELECT 
    COUNT(*) as mensajes_huérfanos
FROM public.messages m
LEFT JOIN public.cases c ON m.case_id = c.id
WHERE c.id IS NULL;

-- =====================================================
-- 9. VERIFICACIÓN DE CIFRADO
-- =====================================================
SELECT '=== 9. VERIFICACIÓN DE CIFRADO ===' as seccion;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'bytea' THEN '✅ ENCRIPTADO (BYTEA)'
        ELSE '❌ NO ENCRIPTADO'
    END as estado_cifrado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messages'
  AND column_name = 'content';

-- =====================================================
-- 10. ANÁLISIS DE SEGURIDAD MULTI-TENANT
-- =====================================================
SELECT '=== 10. ANÁLISIS MULTI-TENANT ===' as seccion;

-- Verificar si hay mensajes de casos que pertenecen a diferentes organizaciones
-- (esto ayudaría a detectar posibles fugas de datos)
SELECT 
    COUNT(DISTINCT c.org_id) as organizaciones_afectadas,
    COUNT(*) as total_mensajes
FROM public.messages m
JOIN public.cases c ON m.case_id = c.id
GROUP BY m.case_id
HAVING COUNT(DISTINCT c.org_id) > 1;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================
SELECT '=== RESUMEN FINAL ===' as seccion;

SELECT 
    'messages' as tabla,
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') as rls_habilitado,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages') as total_politicas_rls,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'messages') as total_indices,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_schema = 'public' AND event_object_table = 'messages') as total_triggers,
    (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content') as tipo_content;

