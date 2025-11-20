-- =====================================================
-- SCRIPT DE VERIFICACIÓN: RLS Y MEJORAS EN messages
-- Objetivo: Verificar que las migraciones se aplicaron correctamente
-- Fecha: 2025-01-08
-- =====================================================
-- 
-- INSTRUCCIONES:
-- 1. Ejecutar este script DESPUÉS de aplicar las migraciones
-- 2. Verificar que todos los checks muestren ✅
-- 3. Si hay ❌, revisar los logs de migración
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
        ELSE '❌ RLS NO HABILITADO - CRÍTICO'
    END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'messages';

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
        ELSE cmd
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'messages'
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- Verificar que hay exactamente 4 políticas
SELECT 
    COUNT(*) as total_politicas,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ Todas las políticas creadas'
        ELSE '❌ Faltan políticas (esperado: 4)'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'messages';

-- =====================================================
-- VERIFICACIÓN 3: CONSTRAINT DE ROLE
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 3: CONSTRAINT ROLE ===' as verificacion;

SELECT 
    constraint_name,
    constraint_type,
    CASE 
        WHEN constraint_name = 'messages_role_check' THEN '✅ Constraint creado'
        ELSE '⚠️  Constraint diferente'
    END as estado
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
  AND table_name = 'messages'
  AND constraint_name = 'messages_role_check';

-- =====================================================
-- VERIFICACIÓN 4: TRIGGER updated_at
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 4: TRIGGER updated_at ===' as verificacion;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    CASE 
        WHEN trigger_name = 'update_messages_updated_at_trigger' THEN '✅ Trigger creado'
        ELSE '⚠️  Trigger diferente'
    END as estado
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'messages'
  AND trigger_name = 'update_messages_updated_at_trigger';

-- =====================================================
-- VERIFICACIÓN 5: FUNCIÓN updated_at
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 5: FUNCIÓN updated_at ===' as verificacion;

SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name = 'update_messages_updated_at' THEN '✅ Función creada'
        ELSE '⚠️  Función diferente'
    END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_messages_updated_at';

-- =====================================================
-- VERIFICACIÓN 6: DATOS EXISTENTES (NO DESTRUCTIVO)
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 6: DATOS EXISTENTES ===' as verificacion;

SELECT 
    COUNT(*) as total_mensajes,
    COUNT(DISTINCT case_id) as casos_unicos,
    COUNT(DISTINCT role) as roles_unicos,
    COUNT(CASE WHEN role NOT IN ('user', 'assistant', 'system') THEN 1 END) as roles_invalidos
FROM public.messages;

-- =====================================================
-- VERIFICACIÓN 7: INTEGRIDAD REFERENCIAL
-- =====================================================
SELECT 
    '=== VERIFICACIÓN 7: INTEGRIDAD REFERENCIAL ===' as verificacion;

SELECT 
    COUNT(*) as mensajes_huerfanos,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No hay mensajes huérfanos'
        ELSE '⚠️  Hay mensajes huérfanos (revisar)'
    END as estado
FROM public.messages m
LEFT JOIN public.cases c ON m.case_id = c.id
WHERE c.id IS NULL;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================
SELECT 
    '=== RESUMEN FINAL ===' as verificacion;

SELECT 
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') as rls_habilitado,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages') as total_politicas,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND table_name = 'messages' AND constraint_name = 'messages_role_check') as constraint_role,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_schema = 'public' AND event_object_table = 'messages' AND trigger_name = 'update_messages_updated_at_trigger') as trigger_updated_at,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_messages_updated_at') as funcion_updated_at;

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Para probar RLS en acción, necesitas:
-- 1. Autenticarte como Usuario A (Org A)
-- 2. Intentar SELECT * FROM messages;
-- 3. Debe retornar SOLO mensajes de casos de Org A
-- 4. Autenticarte como Usuario B (Org B)
-- 5. Intentar SELECT * FROM messages;
-- 6. Debe retornar SOLO mensajes de casos de Org B (no debe ver nada de Org A)

