-- =====================================================
-- SCRIPT DE ANÁLISIS: ESTRUCTURA REAL DE LA BASE DE DATOS
-- FASE 1: Análisis y Diagnóstico
-- Fecha: 31 de Enero, 2025
-- =====================================================
-- 
-- INSTRUCCIONES:
-- 1. Ejecutar este script completo en Supabase SQL Editor
-- 2. Copiar todos los resultados
-- 3. Documentar en docs/ESTRUCTURA_BD_REAL.md
--
-- =====================================================

-- =====================================================
-- PARTE 1: ESTRUCTURA DE LA TABLA messages
-- =====================================================

SELECT 
    '=== ESTRUCTURA DE messages ===' as seccion;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- Verificar tipo específico de content_enc (o content si existe)
SELECT 
    '=== TIPO DE content/content_enc EN messages ===' as seccion;

SELECT 
    column_name,
    data_type,
    udt_name,
    CASE 
        WHEN data_type = 'bytea' THEN 'ENCRIPTADO (BYTEA)'
        WHEN data_type = 'text' THEN 'TEXTO PLANO (TEXT)'
        WHEN data_type = 'character varying' THEN 'TEXTO PLANO (VARCHAR)'
        ELSE data_type
    END as tipo_detectado
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND (column_name = 'content' OR column_name = 'content_enc');

-- Verificar si hay datos existentes y su formato
SELECT 
    '=== DATOS EXISTENTES EN messages ===' as seccion;

SELECT 
    COUNT(*) as total_mensajes,
    COUNT(CASE WHEN content_enc IS NULL THEN 1 END) as mensajes_null,
    COUNT(CASE WHEN content_enc IS NOT NULL THEN 1 END) as mensajes_con_contenido
FROM public.messages;

-- Si hay mensajes, verificar formato (solo primeros 5 para no sobrecargar)
SELECT 
    '=== MUESTRA DE MENSAJES (primeros 5) ===' as seccion;

SELECT 
    id,
    case_id,
    role,
    CASE 
        WHEN pg_typeof(content_enc)::text = 'bytea' THEN 'ENCRIPTADO (BYTEA)'
        WHEN pg_typeof(content_enc)::text = 'text' THEN 'TEXTO PLANO (TEXT)'
        ELSE pg_typeof(content_enc)::text
    END as content_type,
    CASE 
        WHEN pg_typeof(content_enc)::text = 'bytea' THEN LENGTH(content_enc::bytea)
        WHEN pg_typeof(content_enc)::text = 'text' THEN LENGTH(content_enc::text)
        ELSE 0
    END as content_length,
    created_at
FROM public.messages
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- PARTE 2: ESTRUCTURA DE LA TABLA profiles
-- =====================================================

SELECT 
    '=== ESTRUCTURA DE profiles ===' as seccion;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Verificar tipos específicos de phone_enc y address_enc (o phone/address si existen)
SELECT 
    '=== TIPOS DE phone/phone_enc Y address/address_enc EN profiles ===' as seccion;

SELECT 
    column_name,
    data_type,
    udt_name,
    CASE 
        WHEN data_type = 'bytea' THEN 'ENCRIPTADO (BYTEA)'
        WHEN data_type = 'text' THEN 'TEXTO PLANO (TEXT)'
        WHEN data_type = 'character varying' THEN 'TEXTO PLANO (VARCHAR)'
        ELSE data_type
    END as tipo_detectado
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND (column_name IN ('phone', 'phone_enc', 'address', 'address_enc'));

-- Verificar si hay datos existentes
SELECT 
    '=== DATOS EXISTENTES EN profiles ===' as seccion;

SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN phone_enc IS NOT NULL THEN 1 END) as profiles_con_phone,
    COUNT(CASE WHEN address_enc IS NOT NULL THEN 1 END) as profiles_con_address
FROM public.profiles;

-- =====================================================
-- PARTE 3: FUNCIONES DE ENCRIPTACIÓN DISPONIBLES
-- =====================================================

SELECT 
    '=== FUNCIONES DE ENCRIPTACIÓN ===' as seccion;

SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%encrypt%' 
    OR routine_name LIKE '%decrypt%'
  )
ORDER BY routine_name;

-- Obtener definición completa de funciones de encriptación
SELECT 
    '=== DEFINICIONES DE FUNCIONES ===' as seccion;

SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%encrypt%' 
    OR p.proname LIKE '%decrypt%'
  )
ORDER BY p.proname;

-- =====================================================
-- PARTE 4: VERIFICAR ESTRUCTURA DE clients (REFERENCIA)
-- =====================================================

SELECT 
    '=== ESTRUCTURA DE clients (REFERENCIA) ===' as seccion;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    CASE 
        WHEN data_type = 'bytea' THEN 'ENCRIPTADO (BYTEA)'
        WHEN data_type = 'text' THEN 'TEXTO PLANO (TEXT)'
        ELSE data_type
    END as tipo_detectado
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clients'
  AND column_name LIKE '%_enc'
ORDER BY ordinal_position;

-- =====================================================
-- PARTE 5: VERIFICAR CONFIGURACIÓN DE ENCRIPTACIÓN
-- =====================================================

SELECT 
    '=== CONFIGURACIÓN DE ENCRIPTACIÓN ===' as seccion;

-- Verificar si existe la configuración app.encryption_key
SELECT 
    name,
    setting,
    CASE 
        WHEN setting IS NOT NULL AND setting != '' THEN 'CONFIGURADA'
        ELSE 'NO CONFIGURADA'
    END as estado
FROM pg_settings
WHERE name = 'app.encryption_key'
LIMIT 1;

-- Verificar extensión pgcrypto
SELECT 
    '=== EXTENSIÓN pgcrypto ===' as seccion;

SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension
WHERE extname = 'pgcrypto';

-- =====================================================
-- PARTE 6: RESUMEN DE HALLAZGOS
-- =====================================================

SELECT 
    '=== RESUMEN DE HALLAZGOS ===' as seccion;

-- Resumen de messages
SELECT 
    'messages' as tabla,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'bytea' THEN 'ENCRIPTADO'
        ELSE 'NO ENCRIPTADO'
    END as estado_encriptacion
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND (column_name = 'content' OR column_name = 'content_enc');

-- Resumen de profiles
SELECT 
    'profiles' as tabla,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'bytea' THEN 'ENCRIPTADO'
        ELSE 'NO ENCRIPTADO'
    END as estado_encriptacion
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('phone', 'phone_enc', 'address', 'address_enc')
ORDER BY column_name;

-- Resumen de clients (referencia)
SELECT 
    'clients' as tabla,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'bytea' THEN 'ENCRIPTADO'
        ELSE 'NO ENCRIPTADO'
    END as estado_encriptacion
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clients'
  AND column_name LIKE '%_enc'
ORDER BY column_name;

