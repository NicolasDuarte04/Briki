-- =====================================================
-- FASE 4: LIMPIEZA AUTOMÁTICA DE ARCHIVOS TEMPORALES HUÉRFANOS
-- =====================================================
-- 
-- Objetivo: Eliminar archivos temporales sin artifact asociado
-- 
-- Criterios de eliminación:
-- 1. Archivo está en ruta temporal: temp/{userId}/...
-- 2. NO tiene artifact asociado en BD
-- 3. Tiene más de 24 horas de antigüedad
-- 
-- Seguridad:
-- - Solo elimina archivos huérfanos (sin artifact)
-- - NO elimina archivos asociados a artifacts (aunque estén en temp/)
-- - NO afecta casos existentes ni archivos persistentes
-- - Validaciones exhaustivas antes de eliminar
-- 
-- Ejecución: Automática cada 6 horas vía pg_cron
-- =====================================================

-- =====================================================
-- FUNCIÓN DE LIMPIEZA
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_orphan_temp_files()
RETURNS TABLE(
    deleted_count INTEGER,
    deleted_size BIGINT,
    deleted_files TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    file_record RECORD;
    total_deleted INTEGER := 0;
    total_size BIGINT := 0;
    deleted_paths TEXT[] := ARRAY[]::TEXT[];
    artifact_exists BOOLEAN;
BEGIN
    -- Log de inicio
    RAISE NOTICE '🧹 [cleanup_orphan_temp_files] Iniciando limpieza de archivos temporales huérfanos...';
    
    -- Iterar sobre archivos temporales en Storage
    FOR file_record IN
        SELECT 
            name,
            created_at,
            metadata->>'size' as file_size
        FROM storage.objects
        WHERE bucket_id = 'artifacts'
        AND name LIKE 'temp/%'
        AND created_at < NOW() - INTERVAL '24 hours' -- Solo archivos > 24 horas
    LOOP
        -- ✅ VALIDACIÓN CRÍTICA: Verificar que NO existe artifact asociado
        SELECT EXISTS(
            SELECT 1 
            FROM public.artifacts 
            WHERE file_id = file_record.name
        ) INTO artifact_exists;
        
        -- Solo eliminar si NO tiene artifact asociado
        IF NOT artifact_exists THEN
            -- ✅ VALIDACIÓN ADICIONAL: Verificar que el path es realmente temporal
            IF file_record.name LIKE 'temp/%' THEN
                -- Eliminar archivo
                BEGIN
                    DELETE FROM storage.objects
                    WHERE bucket_id = 'artifacts'
                    AND name = file_record.name;
                    
                    -- Contar eliminación
                    total_deleted := total_deleted + 1;
                    
                    -- Acumular tamaño (si está disponible en metadata)
                    IF file_record.file_size IS NOT NULL THEN
                        total_size := total_size + (file_record.file_size::BIGINT);
                    END IF;
                    
                    -- Agregar a lista de eliminados
                    deleted_paths := array_append(deleted_paths, file_record.name);
                    
                    -- Log de eliminación (solo primeros 10 para no saturar logs)
                    IF total_deleted <= 10 THEN
                        RAISE NOTICE '🗑️ [cleanup_orphan_temp_files] Eliminado: % (creado: %)', 
                            file_record.name, 
                            file_record.created_at;
                    END IF;
                    
                EXCEPTION WHEN OTHERS THEN
                    -- Log error pero continuar con otros archivos
                    RAISE WARNING '⚠️ [cleanup_orphan_temp_files] Error eliminando %: %', 
                        file_record.name, 
                        SQLERRM;
                END;
            ELSE
                -- Path no es temporal (no debería pasar, pero por seguridad)
                RAISE WARNING '⚠️ [cleanup_orphan_temp_files] Path no es temporal (saltado): %', 
                    file_record.name;
            END IF;
        ELSE
            -- Archivo tiene artifact asociado, NO eliminar
            -- (Esto puede pasar si FASE 3 falló y el artifact quedó con ruta temporal)
            -- No es crítico, el archivo se mantiene
            IF total_deleted = 0 THEN -- Solo loggear el primero para no saturar
                RAISE NOTICE 'ℹ️ [cleanup_orphan_temp_files] Archivo con artifact (saltado): %', 
                    file_record.name;
            END IF;
        END IF;
    END LOOP;
    
    -- Log de resumen
    RAISE NOTICE '✅ [cleanup_orphan_temp_files] Limpieza completada: % archivos eliminados, % bytes liberados', 
        total_deleted, 
        total_size;
    
    -- Retornar resultados
    RETURN QUERY SELECT 
        total_deleted,
        total_size,
        deleted_paths;
END;
$$;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION public.cleanup_orphan_temp_files IS 
'Limpia archivos temporales huérfanos (sin artifact asociado) con más de 24 horas de antigüedad. Solo elimina archivos en temp/ que NO tienen artifact en BD. Seguro para ejecutar automáticamente.';

-- =====================================================
-- PROGRAMAR EJECUCIÓN AUTOMÁTICA (pg_cron)
-- =====================================================
-- 
-- Ejecutar cada 6 horas: 00:00, 06:00, 12:00, 18:00
-- 
-- NOTA: pg_cron requiere extensión habilitada en Supabase
-- Si no está habilitada, contactar a Supabase Support
-- =====================================================

-- =====================================================
-- PROGRAMAR EJECUCIÓN AUTOMÁTICA (pg_cron)
-- =====================================================
-- 
-- NOTA: La programación del job debe ejecutarse MANUALMENTE después de esta migración
-- debido a limitaciones de sintaxis con comillas anidadas en bloques DO.
-- 
-- PASO 1: Verificar si pg_cron está disponible:
--   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
-- 
-- PASO 2: Si pg_cron está disponible, ejecutar este comando:
--   SELECT cron.schedule('cleanup-orphan-temp-files', '0 */6 * * *', 'SELECT public.cleanup_orphan_temp_files();');
-- 
-- PASO 3: Verificar que el job fue creado:
--   SELECT * FROM cron.job WHERE jobname = 'cleanup-orphan-temp-files';
-- 
-- Si pg_cron NO está disponible:
--   - Contacta a Supabase Support para habilitarlo
--   - O ejecuta la función manualmente cuando sea necesario:
--     SELECT * FROM public.cleanup_orphan_temp_files();
-- =====================================================

-- =====================================================
-- FUNCIÓN DE VERIFICACIÓN (OPCIONAL)
-- =====================================================
-- Útil para verificar qué archivos serían eliminados
-- sin eliminarlos realmente

CREATE OR REPLACE FUNCTION public.verify_orphan_temp_files()
RETURNS TABLE(
    file_path TEXT,
    created_at TIMESTAMPTZ,
    age_hours NUMERIC,
    has_artifact BOOLEAN,
    file_size BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.name::TEXT as file_path,
        o.created_at,
        EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 3600 as age_hours,
        EXISTS(
            SELECT 1 
            FROM public.artifacts 
            WHERE file_id = o.name
        ) as has_artifact,
        (o.metadata->>'size')::BIGINT as file_size
    FROM storage.objects o
    WHERE o.bucket_id = 'artifacts'
    AND o.name LIKE 'temp/%'
    AND o.created_at < NOW() - INTERVAL '24 hours'
    ORDER BY o.created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.verify_orphan_temp_files IS 
'Verifica qué archivos temporales serían eliminados por cleanup_orphan_temp_files() sin eliminarlos realmente. Útil para testing y auditoría.';

-- =====================================================
-- QUERIES DE VERIFICACIÓN POST-IMPLEMENTACIÓN
-- =====================================================

-- Verificar que la función existe:
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'cleanup_orphan_temp_files';

-- Verificar jobs programados (si pg_cron está disponible):
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-orphan-temp-files';

-- Ejecutar limpieza manualmente (para testing):
-- SELECT * FROM public.cleanup_orphan_temp_files();

-- Verificar archivos que serían eliminados (sin eliminarlos):
-- SELECT * FROM public.verify_orphan_temp_files();

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

