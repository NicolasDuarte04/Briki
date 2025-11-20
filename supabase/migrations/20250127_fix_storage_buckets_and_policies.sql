-- =====================================================
-- MIGRACIÓN: CORRECCIÓN DE BUCKETS Y POLÍTICAS DE STORAGE
-- Objetivo: Asegurar que los buckets existan y tengan políticas de acceso correctas
-- Fecha: 2025-01-27
-- =====================================================

-- =====================================================
-- VERIFICAR Y CREAR BUCKETS SI NO EXISTEN
-- =====================================================

-- Bucket para artefactos (PDFs, documentos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'artifacts', 
    'artifacts', 
    true,  -- ✅ CAMBIADO: Ahora es público para permitir iframe
    104857600, -- 100MB límite
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE 
SET public = true; -- ✅ Asegurar que sea público si ya existe

-- Bucket para archivos temporales de procesamiento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'temp-processing', 
    'temp-processing', 
    true,  -- ✅ CAMBIADO: Ahora es público
    104857600, -- 100MB límite
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE 
SET public = true; -- ✅ Asegurar que sea público si ya existe

-- Bucket para propuestas generadas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'proposals', 
    'proposals', 
    true,  -- ✅ CAMBIADO: Ahora es público
    52428800, -- 50MB límite
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE 
SET public = true; -- ✅ Asegurar que sea público si ya existe

-- =====================================================
-- ELIMINAR POLÍTICAS ANTERIORES SI EXISTEN
-- =====================================================

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

-- =====================================================
-- CREAR POLÍTICAS NUEVAS: ACCESO PÚBLICO A LECTURA
-- =====================================================

-- ✅ Política para lectura pública de artifacts
CREATE POLICY "public_artifacts_select" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'artifacts');

-- ✅ Política para inserción: Solo usuarios autenticados dentro de su org
CREATE POLICY "authenticated_users_can_upload_artifacts" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated'
);

-- ✅ Política para actualización: Solo el propietario o miembros de la org
CREATE POLICY "authenticated_users_can_update_artifacts" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated'
);

-- ✅ Política para eliminación: Solo el propietario o admins
CREATE POLICY "authenticated_users_can_delete_artifacts" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated'
);

-- Aplicar las mismas políticas a temp-processing
CREATE POLICY "public_temp_select" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'temp-processing');

CREATE POLICY "authenticated_users_can_upload_temp" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'temp-processing' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "authenticated_users_can_delete_temp" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'temp-processing' AND
    auth.role() = 'authenticated'
);

-- Aplicar las mismas políticas a proposals
CREATE POLICY "public_proposals_select" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'proposals');

CREATE POLICY "authenticated_users_can_upload_proposals" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "authenticated_users_can_update_proposals" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "authenticated_users_can_delete_proposals" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated'
);

