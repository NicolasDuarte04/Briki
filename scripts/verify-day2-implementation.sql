-- =====================================================
-- SCRIPT DE VERIFICACIÓN: ESTADO DEL DÍA 2
-- Objetivo: Verificar qué está implementado y qué falta
-- Fecha: 2025-02-15
-- =====================================================

-- =====================================================
-- 1. VERIFICAR POLÍTICAS RLS ACTUALES EN STORAGE
-- =====================================================

SELECT 
    'POLÍTICAS RLS ACTUALES EN STORAGE' as seccion,
    '' as info;

SELECT 
    policyname as nombre_politica,
    cmd as operacion,
    CASE 
        WHEN qual LIKE '%metadata%org_id%' THEN '✅ Valida org_id en METADATA'
        WHEN qual LIKE '%split_part%' THEN '⚠️ Valida solo por PATH'
        ELSE '❌ Sin validación org_id'
    END as tipo_validacion,
    CASE
        WHEN policyname LIKE '%metadata%' THEN 'NUEVA (Día 2)'
        ELSE 'ANTIGUA'
    END as version
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- =====================================================
-- 2. VERIFICAR ARCHIVOS SIN METADATA org_id
-- =====================================================

SELECT 
    '' as separador,
    'ARCHIVOS SIN METADATA org_id EN ARTIFACTS' as seccion,
    '' as info;

SELECT 
    COUNT(*) as total_archivos_sin_org_id,
    COUNT(*) FILTER (WHERE name LIKE 'temp/%') as archivos_temp,
    COUNT(*) FILTER (WHERE name NOT LIKE 'temp/%') as archivos_persistentes_sin_org_id
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '');

-- =====================================================
-- 3. VERIFICAR ARCHIVOS CON METADATA org_id
-- =====================================================

SELECT 
    '' as separador,
    'ARCHIVOS CON METADATA org_id CORRECTA' as seccion,
    '' as info;

SELECT 
    COUNT(*) as total_archivos_con_org_id,
    COUNT(*) FILTER (WHERE name NOT LIKE 'temp/%') as archivos_persistentes_con_org_id
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND metadata->>'org_id' IS NOT NULL 
AND metadata->>'org_id' != ''
AND name NOT LIKE 'temp/%';

-- =====================================================
-- 4. MUESTRA DE ARCHIVOS QUE NECESITAN MIGRACIÓN
-- =====================================================

SELECT 
    '' as separador,
    'MUESTRA: ARCHIVOS QUE NECESITAN MIGRACIÓN (primeros 10)' as seccion,
    '' as info;

SELECT 
    name as archivo,
    metadata->>'org_id' as org_id_actual,
    split_part(name, '/', 1) as org_id_del_path,
    created_at
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%'
LIMIT 10;

-- =====================================================
-- 5. VERIFICAR TABLAS Y ESTRUCTURA
-- =====================================================

SELECT 
    '' as separador,
    'VERIFICACIÓN DE TABLAS' as seccion,
    '' as info;

SELECT 
    'cases' as tabla,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE status = 'active') as casos_activos,
    COUNT(*) FILTER (WHERE status = 'draft') as casos_draft
FROM public.cases
UNION ALL
SELECT 
    'artifacts' as tabla,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE source_type = 'pdf') as artifacts_pdf,
    COUNT(*) FILTER (WHERE provenance IS NOT NULL) as con_provenance
FROM public.artifacts;

-- =====================================================
-- 6. VERIFICAR ENUM SourceType
-- =====================================================

SELECT 
    '' as separador,
    'VERIFICACIÓN DE ENUM SourceType' as seccion,
    '' as info;

SELECT 
    enumlabel as valor_enum
FROM pg_enum
WHERE enumtypid = 'public.source_type_enum'::regtype
ORDER BY enumsortorder;

-- =====================================================
-- 7. RESUMEN Y RECOMENDACIONES
-- =====================================================

SELECT 
    '' as separador,
    'RESUMEN Y ACCIONES REQUERIDAS' as seccion,
    '' as info;

WITH 
politicas_metadata AS (
    SELECT COUNT(*) as count FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND qual LIKE '%metadata%org_id%'
),
archivos_sin_org AS (
    SELECT COUNT(*) as count FROM storage.objects
    WHERE bucket_id = 'artifacts'
    AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
    AND name NOT LIKE 'temp/%'
)
SELECT 
    CASE 
        WHEN (SELECT count FROM politicas_metadata) > 0 THEN '✅ Políticas RLS por org_id EN METADATA están aplicadas'
        ELSE '❌ CRÍTICO: Aplicar políticas RLS por org_id en metadata'
    END as politicas_rls,
    CASE 
        WHEN (SELECT count FROM archivos_sin_org) = 0 THEN '✅ Todos los archivos persistentes tienen org_id en metadata'
        WHEN (SELECT count FROM archivos_sin_org) > 0 THEN '⚠️ RECOMENDADO: Migrar ' || (SELECT count FROM archivos_sin_org) || ' archivos sin org_id'
        ELSE '✅ Sin archivos para migrar'
    END as metadata_archivos;

-- =====================================================
-- FIN DEL SCRIPT DE VERIFICACIÓN
-- =====================================================

