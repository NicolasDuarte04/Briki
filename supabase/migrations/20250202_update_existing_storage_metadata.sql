-- =====================================================
-- MIGRACIÓN: ACTUALIZAR METADATA DE ARCHIVOS EXISTENTES
-- Objetivo: Añadir org_id a metadata de TODOS los archivos persistentes que no lo tienen
-- Fecha: 2025-02-02
-- Prioridad: ALTA - Requerido antes de aplicar FASE 3
-- Estado: Cantidad exacta a verificar con queries de análisis (Paso 4.5)
-- Nota: Este script migra TODOS los archivos persistentes sin org_id en metadata
-- =====================================================

-- =====================================================
-- VERIFICACIÓN PRE-MIGRACIÓN: Contar archivos a migrar
-- =====================================================

-- Ejecutar esta query primero para ver cuántos archivos se migrarán
SELECT 
    COUNT(*) as archivos_a_migrar
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%';

-- =====================================================
-- MIGRACIÓN: Actualizar metadata de archivos persistentes
-- =====================================================

-- Función helper para actualizar metadata de archivos existentes
DO $$
DECLARE
    file_record RECORD;
    org_id_from_path TEXT;
    case_id_from_path TEXT;
    updated_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    -- Iterar sobre archivos en bucket 'artifacts' que no tienen org_id en metadata
    FOR file_record IN
        SELECT 
            id,
            name,
            metadata
        FROM storage.objects
        WHERE bucket_id = 'artifacts'
        AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
        AND name NOT LIKE 'temp/%' -- Excluir archivos temporales
    LOOP
        -- Extraer org_id del path (formato: {orgId}/{caseId}/...)
        org_id_from_path := split_part(file_record.name, '/', 1);
        case_id_from_path := split_part(file_record.name, '/', 2);
        
        -- Validar que org_id_from_path es un UUID válido
        IF org_id_from_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            -- Actualizar metadata con org_id (CRÍTICO: convertir a string explícitamente)
            UPDATE storage.objects
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'org_id', org_id_from_path::text,  -- ✅ CRÍTICO: Asegurar que sea string
                'case_id', case_id_from_path::text, -- ✅ CRÍTICO: Asegurar que sea string
                'migrated_at', now()::text
            )
            WHERE id = file_record.id;
            
            updated_count := updated_count + 1;
            RAISE NOTICE '✅ Archivo actualizado: % (org_id: %)', file_record.name, org_id_from_path;
        ELSE
            skipped_count := skipped_count + 1;
            RAISE NOTICE '⚠️ Archivo con path inválido (no UUID): %', file_record.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Migración completada:';
    RAISE NOTICE '   - Archivos actualizados: %', updated_count;
    RAISE NOTICE '   - Archivos omitidos (path inválido): %', skipped_count;
END $$;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- Query para verificar que todos los archivos ahora tienen org_id en metadata
-- Ejecutar esta query después de la migración para confirmar éxito
-- Resultado esperado: con_metadata_despues = 8, sin_metadata_despues = 0

SELECT 
    COUNT(*) FILTER (
        WHERE metadata->>'org_id' IS NOT NULL 
        AND metadata->>'org_id' != '' 
        AND name NOT LIKE 'temp/%'
    ) as con_metadata_despues,
    COUNT(*) FILTER (
        WHERE (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '') 
        AND name NOT LIKE 'temp/%'
    ) as sin_metadata_despues
FROM storage.objects
WHERE bucket_id = 'artifacts';

