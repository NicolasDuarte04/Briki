-- =====================================================
-- MIGRACIÓN: CONFIGURACIÓN DE STORAGE BUCKETS
-- Objetivo: Configurar buckets para almacenamiento de PDFs y documentos
-- Fecha: 2025-10-11
-- =====================================================

-- =====================================================
-- CREAR BUCKETS DE STORAGE
-- =====================================================

-- Bucket para artefactos (PDFs, documentos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'artifacts', 
    'artifacts', 
    false, 
    104857600, -- 100MB límite
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png']
);

-- Bucket para propuestas generadas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'proposals', 
    'proposals', 
    false, 
    52428800, -- 50MB límite
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Bucket para archivos temporales de procesamiento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'temp-processing', 
    'temp-processing', 
    false, 
    104857600, -- 100MB límite
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
);

-- =====================================================
-- POLÍTICAS DE ACCESO PARA BUCKET ARTIFACTS
-- =====================================================

-- Política para subir archivos: Solo miembros de la organización
CREATE POLICY "org_members_can_upload_artifacts" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'artifacts' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Política para ver archivos: Solo miembros de la organización
CREATE POLICY "org_members_can_view_artifacts" 
    ON storage.objects FOR SELECT 
    USING (
        bucket_id = 'artifacts' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Política para actualizar archivos: Solo miembros de la organización
CREATE POLICY "org_members_can_update_artifacts" 
    ON storage.objects FOR UPDATE 
    USING (
        bucket_id = 'artifacts' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Política para eliminar archivos: Solo admins y owners
CREATE POLICY "org_admins_can_delete_artifacts" 
    ON storage.objects FOR DELETE 
    USING (
        bucket_id = 'artifacts' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- =====================================================
-- POLÍTICAS DE ACCESO PARA BUCKET PROPOSALS
-- =====================================================

-- Política para subir propuestas: Solo miembros de la organización
CREATE POLICY "org_members_can_upload_proposals" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'proposals' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Política para ver propuestas: Solo miembros de la organización
CREATE POLICY "org_members_can_view_proposals" 
    ON storage.objects FOR SELECT 
    USING (
        bucket_id = 'proposals' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Política para actualizar propuestas: Solo miembros de la organización
CREATE POLICY "org_members_can_update_proposals" 
    ON storage.objects FOR UPDATE 
    USING (
        bucket_id = 'proposals' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Política para eliminar propuestas: Solo admins y owners
CREATE POLICY "org_admins_can_delete_proposals" 
    ON storage.objects FOR DELETE 
    USING (
        bucket_id = 'proposals' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- =====================================================
-- POLÍTICAS DE ACCESO PARA BUCKET TEMP-PROCESSING
-- =====================================================

-- Política para subir archivos temporales: Solo miembros de la organización
CREATE POLICY "org_members_can_upload_temp_files" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'temp-processing' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Política para ver archivos temporales: Solo miembros de la organización
CREATE POLICY "org_members_can_view_temp_files" 
    ON storage.objects FOR SELECT 
    USING (
        bucket_id = 'temp-processing' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Política para eliminar archivos temporales: Solo miembros de la organización
CREATE POLICY "org_members_can_delete_temp_files" 
    ON storage.objects FOR DELETE 
    USING (
        bucket_id = 'temp-processing' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCIONES DE UTILIDAD PARA STORAGE
-- =====================================================

-- Función para generar path seguro para archivos
CREATE OR REPLACE FUNCTION public.generate_storage_path(
    org_uuid uuid,
    file_name text,
    bucket_name text DEFAULT 'artifacts'
)
RETURNS text AS $$
DECLARE
    safe_filename text;
    timestamp_str text;
BEGIN
    -- Generar timestamp para evitar colisiones
    timestamp_str := to_char(now(), 'YYYYMMDD_HH24MISS');
    
    -- Limpiar nombre de archivo
    safe_filename := regexp_replace(file_name, '[^a-zA-Z0-9._-]', '_', 'g');
    
    -- Retornar path: org_id/timestamp_filename
    RETURN org_uuid::text || '/' || timestamp_str || '_' || safe_filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener URL de descarga segura
CREATE OR REPLACE FUNCTION public.get_secure_download_url(
    file_path text,
    bucket_name text DEFAULT 'artifacts',
    expires_in integer DEFAULT 3600
)
RETURNS text AS $$
DECLARE
    download_url text;
BEGIN
    -- Verificar que el usuario tiene acceso al archivo
    IF NOT EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = bucket_name 
        AND name = file_path
        AND (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied to file: %', file_path;
    END IF;
    
    -- Generar URL de descarga temporal
    SELECT storage.create_signed_url(bucket_name, file_path, expires_in) INTO download_url;
    
    RETURN download_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER PARA LIMPIAR ARCHIVOS TEMPORALES
-- =====================================================

-- Función para limpiar archivos temporales antiguos
CREATE OR REPLACE FUNCTION public.cleanup_temp_files()
RETURNS void AS $$
BEGIN
    -- Eliminar archivos temporales más antiguos de 24 horas
    DELETE FROM storage.objects 
    WHERE bucket_id = 'temp-processing' 
    AND created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION public.generate_storage_path IS 'Genera un path seguro para almacenar archivos organizados por organización';
COMMENT ON FUNCTION public.get_secure_download_url IS 'Genera URL de descarga temporal con verificación de acceso';
COMMENT ON FUNCTION public.cleanup_temp_files IS 'Limpia archivos temporales antiguos para liberar espacio';

-- =====================================================
-- CONFIGURACIÓN DE LIMPIEZA AUTOMÁTICA
-- =====================================================

-- Nota: Para implementar limpieza automática, se puede usar pg_cron
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-temp-files', '0 2 * * *', 'SELECT public.cleanup_temp_files();');
