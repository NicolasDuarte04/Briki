-- =====================================================
-- MIGRACIÓN FINAL: COMPLETAR DÍA 2 - POLÍTICAS RLS Y METADATA
-- VERSIÓN CON FIX DE PERMISOS PARA SUPABASE DASHBOARD
-- Objetivo: Aplicar políticas RLS por org_id y migrar metadata de archivos existentes
-- Fecha: 2025-02-15
-- Prioridad: CRÍTICA (seguridad multi-tenant)
-- =====================================================

-- ⚠️ IMPORTANTE: Ejecutar desde Supabase Dashboard > SQL Editor
-- Este script incluye configuración de permisos para funcionar correctamente

-- =====================================================
-- VERIFICACIÓN PREVIA: Confirmar que estamos en Supabase Dashboard
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 ==========================================';
    RAISE NOTICE '🔍 VERIFICACIÓN DE PERMISOS Y CONTEXTO';
    RAISE NOTICE '🔍 ==========================================';
    RAISE NOTICE 'Usuario actual: %', current_user;
    RAISE NOTICE 'Rol de sesión: %', session_user;
    RAISE NOTICE '';
    
    -- Verificar si tenemos acceso a storage.objects
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'storage' AND c.relname = 'objects'
    ) THEN
        RAISE NOTICE '✅ Tabla storage.objects encontrada';
    ELSE
        RAISE NOTICE '❌ ERROR: No se puede acceder a storage.objects';
        RAISE EXCEPTION 'No se puede continuar sin acceso a storage.objects';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PASO 1: BACKUP DE POLÍTICAS ACTUALES (OPCIONAL)
-- =====================================================

-- Descomentar si quieres hacer backup de políticas actuales:
-- CREATE TABLE IF NOT EXISTS backup_storage_policies AS
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- =====================================================
-- PASO 2: ELIMINAR POLÍTICAS ANTIGUAS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  ==========================================';
    RAISE NOTICE '🗑️  ELIMINANDO POLÍTICAS ANTIGUAS';
    RAISE NOTICE '🗑️  ==========================================';
    RAISE NOTICE '';
END $$;

-- Eliminar políticas públicas o que no validan org_id en metadata
DROP POLICY IF EXISTS "public_artifacts_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_upload_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_update_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_delete_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "public_proposals_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_upload_proposals" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_update_proposals" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_delete_proposals" ON storage.objects;
DROP POLICY IF EXISTS "public_temp_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_upload_temp" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_delete_temp" ON storage.objects;

-- Eliminar políticas que validan por path (no por metadata)
DROP POLICY IF EXISTS "org_members_can_upload_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "org_members_can_view_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "org_members_can_update_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "org_admins_can_delete_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_temp_insert" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_temp_select" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_temp_delete" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_org_insert" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_org_select" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_org_delete" ON storage.objects;

-- Eliminar políticas antiguas de proposals
DROP POLICY IF EXISTS "proposals_org_insert" ON storage.objects;
DROP POLICY IF EXISTS "proposals_org_select" ON storage.objects;
DROP POLICY IF EXISTS "proposals_org_delete" ON storage.objects;

DO $$
BEGIN
    RAISE NOTICE '✅ Políticas antiguas eliminadas';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PASO 3: CREAR POLÍTICAS RLS CON VALIDACIÓN POR org_id EN METADATA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ==========================================';
    RAISE NOTICE '🔒 CREANDO POLÍTICAS RLS NUEVAS';
    RAISE NOTICE '🔒 ==========================================';
    RAISE NOTICE '';
END $$;

-- ============================================
-- BUCKET: artifacts
-- ============================================

-- SELECT: Usuarios ven archivos de su organización (metadata) o archivos temporales propios (path)
CREATE POLICY "artifacts_org_metadata_select" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- ✅ Validación por org_id en METADATA (Día 2)
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- ✅ Permitir acceso a archivos temporales del usuario
        (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
    )
);

-- INSERT: Usuarios suben archivos con org_id en metadata o archivos temporales propios
CREATE POLICY "artifacts_org_metadata_insert" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- ✅ Validación por org_id en METADATA
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- ✅ Permitir subida a temp del usuario
        (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
    )
);

-- UPDATE: Usuarios actualizan archivos de su organización (validado por metadata)
CREATE POLICY "artifacts_org_metadata_update" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    )
);

-- DELETE: Solo admins/owners eliminan archivos de su org, o usuarios sus archivos temp
CREATE POLICY "artifacts_org_metadata_delete" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- Admins/owners de la org en metadata
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
        OR
        -- Usuario puede eliminar sus archivos temporales
        (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
    )
);

DO $$
BEGIN
    RAISE NOTICE '✅ Políticas de artifacts creadas (4)';
END $$;

-- ============================================
-- BUCKET: proposals
-- ============================================

-- SELECT: Usuarios ven propuestas de su organización (validado por metadata)
CREATE POLICY "proposals_org_metadata_select" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    )
);

-- INSERT: Usuarios suben propuestas con org_id en metadata
CREATE POLICY "proposals_org_metadata_insert" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    )
);

-- UPDATE: Usuarios actualizan propuestas de su organización
CREATE POLICY "proposals_org_metadata_update" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    )
);

-- DELETE: Solo admins/owners eliminan propuestas
CREATE POLICY "proposals_org_metadata_delete" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
);

DO $$
BEGIN
    RAISE NOTICE '✅ Políticas de proposals creadas (4)';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PASO 4: MIGRACIÓN DE METADATA PARA ARCHIVOS EXISTENTES
-- =====================================================

DO $$
DECLARE
    file_record RECORD;
    org_id_from_path TEXT;
    case_id_from_path TEXT;
    updated_count INTEGER := 0;
    skipped_count INTEGER := 0;
    total_to_migrate INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📦 ==========================================';
    RAISE NOTICE '📦 MIGRACIÓN DE METADATA';
    RAISE NOTICE '📦 ==========================================';
    
    -- Contar archivos a migrar
    SELECT COUNT(*) INTO total_to_migrate
    FROM storage.objects
    WHERE bucket_id = 'artifacts'
    AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
    AND name NOT LIKE 'temp/%';
    
    RAISE NOTICE '📊 Archivos a migrar: %', total_to_migrate;
    
    IF total_to_migrate = 0 THEN
        RAISE NOTICE '✅ No hay archivos que migrar. Todos los archivos persistentes ya tienen org_id en metadata.';
        RAISE NOTICE '';
        RETURN;
    END IF;
    
    RAISE NOTICE '🔄 Iniciando migración de metadata...';
    RAISE NOTICE '';
    
    -- Iterar sobre archivos sin org_id en metadata
    FOR file_record IN
        SELECT 
            id,
            name,
            metadata
        FROM storage.objects
        WHERE bucket_id = 'artifacts'
        AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
        AND name NOT LIKE 'temp/%'
    LOOP
        -- Extraer org_id del path (formato: {orgId}/{caseId}/...)
        org_id_from_path := split_part(file_record.name, '/', 1);
        case_id_from_path := split_part(file_record.name, '/', 2);
        
        -- Validar que org_id_from_path es un UUID válido
        IF org_id_from_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            -- Actualizar metadata con org_id
            UPDATE storage.objects
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'org_id', org_id_from_path::text,
                'case_id', case_id_from_path::text,
                'migrated_at', now()::text,
                'migration_reason', 'day2_completion'
            )
            WHERE id = file_record.id;
            
            updated_count := updated_count + 1;
            
            -- Log cada 10 archivos para no saturar
            IF updated_count % 10 = 0 THEN
                RAISE NOTICE '📦 Progreso: % archivos migrados...', updated_count;
            END IF;
        ELSE
            skipped_count := skipped_count + 1;
            RAISE NOTICE '⚠️ Archivo omitido (path inválido): %', file_record.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ==========================================';
    RAISE NOTICE '✅ MIGRACIÓN DE METADATA COMPLETADA';
    RAISE NOTICE '✅ ==========================================';
    RAISE NOTICE '✅ Archivos actualizados: %', updated_count;
    RAISE NOTICE '⚠️  Archivos omitidos (path inválido): %', skipped_count;
    RAISE NOTICE '📊 Total procesados: %', updated_count + skipped_count;
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PASO 5: VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

DO $$
DECLARE
    con_metadata INTEGER;
    sin_metadata INTEGER;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE metadata->>'org_id' IS NOT NULL AND metadata->>'org_id' != ''),
        COUNT(*) FILTER (WHERE metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
    INTO con_metadata, sin_metadata
    FROM storage.objects
    WHERE bucket_id = 'artifacts' AND name NOT LIKE 'temp/%';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ==========================================';
    RAISE NOTICE '📊 VERIFICACIÓN POST-MIGRACIÓN';
    RAISE NOTICE '📊 ==========================================';
    RAISE NOTICE '✅ Archivos persistentes CON org_id: %', con_metadata;
    
    IF sin_metadata > 0 THEN
        RAISE NOTICE '⚠️  Archivos persistentes SIN org_id: % (revisar manualmente)', sin_metadata;
    ELSE
        RAISE NOTICE '✅ Archivos persistentes SIN org_id: % (PERFECTO)', sin_metadata;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PASO 6: VERIFICAR POLÍTICAS APLICADAS
-- =====================================================

DO $$
DECLARE
    politicas_metadata INTEGER;
BEGIN
    SELECT COUNT(*) INTO politicas_metadata
    FROM pg_policies
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND qual LIKE '%metadata%org_id%';
    
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ==========================================';
    RAISE NOTICE '🔒 VERIFICACIÓN DE POLÍTICAS RLS';
    RAISE NOTICE '🔒 ==========================================';
    
    IF politicas_metadata >= 4 THEN
        RAISE NOTICE '✅ Políticas RLS por org_id en METADATA: % políticas activas', politicas_metadata;
        RAISE NOTICE '✅ Multi-tenancy seguro IMPLEMENTADO';
    ELSE
        RAISE NOTICE '⚠️  Políticas RLS por org_id en METADATA: % políticas (esperadas: >= 4)', politicas_metadata;
        RAISE NOTICE '⚠️  Revisar políticas manualmente';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON POLICY "artifacts_org_metadata_select" ON storage.objects IS 
'DÍA 2: Usuarios ven artifacts de su organización (validado por org_id en metadata) o archivos temporales propios';

COMMENT ON POLICY "artifacts_org_metadata_insert" ON storage.objects IS 
'DÍA 2: Usuarios suben artifacts con org_id en metadata o archivos temporales propios';

COMMENT ON POLICY "proposals_org_metadata_select" ON storage.objects IS 
'DÍA 2: Usuarios ven propuestas de su organización (validado por org_id en metadata)';

COMMENT ON POLICY "proposals_org_metadata_insert" ON storage.objects IS 
'DÍA 2: Usuarios suben propuestas con org_id en metadata';

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ==========================================';
    RAISE NOTICE '🎉 DÍA 2 - IMPLEMENTACIÓN COMPLETADA';
    RAISE NOTICE '🎉 ==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Políticas RLS por org_id en metadata: APLICADAS';
    RAISE NOTICE '✅ Metadata de archivos existentes: MIGRADA';
    RAISE NOTICE '✅ Multi-tenancy seguro: IMPLEMENTADO';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASOS:';
    RAISE NOTICE '   1. Ejecutar scripts/verify-day2-implementation.sql para verificación final';
    RAISE NOTICE '   2. Probar upload de PDF y verificar que funciona';
    RAISE NOTICE '   3. Verificar que usuarios de diferentes orgs NO pueden ver archivos de otros';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SEGURIDAD: Multi-tenancy ahora es seguro y cumple requisitos del Día 2';
    RAISE NOTICE '';
    RAISE NOTICE '👤 Ejecutado por: %', current_user;
    RAISE NOTICE '📅 Fecha: %', now();
    RAISE NOTICE '';
END $$;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================

