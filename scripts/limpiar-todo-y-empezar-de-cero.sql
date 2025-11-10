-- =====================================================
-- SCRIPT DE LIMPIEZA COMPLETA: CASES, ARTIFACTS Y STORAGE
-- =====================================================
-- ⚠️  ADVERTENCIA: Este script elimina TODOS los datos
-- ⚠️  Solo ejecutar en desarrollo/testing
-- ⚠️  NO ejecutar en producción sin backup
-- =====================================================

-- PASO 1: Verificar estado actual (ANTES de borrar)
-- =====================================================
SELECT '📊 ESTADO ANTES DE LIMPIEZA' as paso;

SELECT 
    'Cases' as tabla,
    COUNT(*) as total
FROM public.cases
UNION ALL
SELECT 
    'Artifacts' as tabla,
    COUNT(*) as total
FROM public.artifacts
UNION ALL
SELECT 
    'Messages' as tabla,
    COUNT(*) as total
FROM public.messages
UNION ALL
SELECT 
    'Archivos en Storage (todos)' as tabla,
    COUNT(*) as total
FROM storage.objects
WHERE bucket_id = 'artifacts'
UNION ALL
SELECT 
    'Archivos temporales en Storage' as tabla,
    COUNT(*) as total
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND name LIKE 'temp/%'
UNION ALL
SELECT 
    'Archivos persistentes sin metadata' as tabla,
    COUNT(*) as total
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%';

-- =====================================================
-- PASO 2: ELIMINAR ARCHIVOS DE STORAGE
-- =====================================================
-- ⚠️  IMPORTANTE: Esto elimina archivos físicos
-- ⚠️  No se puede deshacer fácilmente

SELECT '🗑️ ELIMINANDO ARCHIVOS DE STORAGE...' as paso;

-- Eliminar todos los archivos temporales
DELETE FROM storage.objects 
WHERE bucket_id = 'artifacts' 
AND name LIKE 'temp/%';

-- Eliminar archivos persistentes sin metadata (huérfanos)
DELETE FROM storage.objects 
WHERE bucket_id = 'artifacts' 
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%';

-- Eliminar TODOS los archivos persistentes (opcional - solo si quieres empezar 100% limpio)
-- ⚠️  DESCOMENTAR SOLO SI QUIERES ELIMINAR TODO:
-- DELETE FROM storage.objects 
-- WHERE bucket_id = 'artifacts';

-- =====================================================
-- PASO 3: ELIMINAR CASES (Y POR CASCADE: ARTIFACTS, MESSAGES, AUDIT_LOGS)
-- =====================================================
-- ⚠️  CASCADE eliminará automáticamente:
--     - Todos los artifacts asociados
--     - Todos los messages asociados
--     - Todos los audit_logs asociados

SELECT '🗑️ ELIMINANDO CASES (Y DATOS RELACIONADOS POR CASCADE)...' as paso;

DELETE FROM public.cases;

-- =====================================================
-- PASO 4: VERIFICAR LIMPIEZA COMPLETA
-- =====================================================

SELECT '✅ VERIFICANDO LIMPIEZA...' as paso;

SELECT 
    'Cases restantes' as verificacion,
    COUNT(*) as total,
    CASE WHEN COUNT(*) = 0 THEN '✅ LIMPIO' ELSE '❌ QUEDAN DATOS' END as estado
FROM public.cases
UNION ALL
SELECT 
    'Artifacts restantes' as verificacion,
    COUNT(*) as total,
    CASE WHEN COUNT(*) = 0 THEN '✅ LIMPIO' ELSE '❌ QUEDAN DATOS' END as estado
FROM public.artifacts
UNION ALL
SELECT 
    'Messages restantes' as verificacion,
    COUNT(*) as total,
    CASE WHEN COUNT(*) = 0 THEN '✅ LIMPIO' ELSE '❌ QUEDAN DATOS' END as estado
FROM public.messages
UNION ALL
SELECT 
    'Archivos en Storage' as verificacion,
    COUNT(*) as total,
    CASE WHEN COUNT(*) = 0 THEN '✅ LIMPIO' ELSE '⚠️ QUEDAN ARCHIVOS' END as estado
FROM storage.objects
WHERE bucket_id = 'artifacts';

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

SELECT '✅ LIMPIEZA COMPLETA' as resultado;

-- Si todos los totales son 0, la limpieza fue exitosa
-- Si quedan datos, revisa las queries anteriores

