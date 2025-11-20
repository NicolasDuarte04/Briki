-- =====================================================
-- MIGRACIÓN: POLÍTICAS DE STORAGE CON VALIDACIÓN POR ORG_ID EN METADATA
-- Objetivo: Implementar reglas de acceso a buckets por org_id en metadata (Día 2 - Fase 3)
-- Fecha: 2025-02-02
-- Prioridad: ALTA - Requisito crítico del Día 2
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICAS ACTUALES QUE NO VALIDAN ORG_ID EN METADATA
-- =====================================================

-- Eliminar políticas públicas o que solo validan autenticación
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

-- Eliminar políticas antiguas que validan por path (si existen)
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
-- PASO 2: POLÍTICAS PARA BUCKET ARTIFACTS CON VALIDACIÓN POR ORG_ID EN METADATA
-- =====================================================

-- SELECT: Usuarios pueden ver archivos de su organización (validado por org_id en metadata)
-- O archivos temporales del usuario (path temp/{userId}/...)
CREATE POLICY "artifacts_org_metadata_select" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- Validar org_id en metadata
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- Permitir acceso a archivos temporales del usuario
        (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
    )
);

-- INSERT: Usuarios pueden subir archivos con org_id en metadata
-- O archivos temporales del usuario (path temp/{userId}/...)
CREATE POLICY "artifacts_org_metadata_insert" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- Validar org_id en metadata
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- Permitir subida a temp del usuario
        (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
    )
);

-- UPDATE: Usuarios pueden actualizar archivos de su organización (validado por org_id en metadata)
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

-- DELETE: Solo admins y owners pueden eliminar archivos de su organización
-- O usuarios pueden eliminar sus archivos temporales
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

-- =====================================================
-- PASO 3: POLÍTICAS PARA BUCKET PROPOSALS CON VALIDACIÓN POR ORG_ID EN METADATA
-- =====================================================

-- SELECT: Usuarios pueden ver propuestas de su organización (validado por org_id en metadata)
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

-- INSERT: Usuarios pueden subir propuestas con org_id en metadata
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

-- UPDATE: Usuarios pueden actualizar propuestas de su organización (validado por org_id en metadata)
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

-- DELETE: Solo admins y owners pueden eliminar propuestas
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

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON POLICY "artifacts_org_metadata_select" ON storage.objects IS 
'Usuarios pueden ver artifacts de su organización (validado por org_id en metadata) o archivos temporales propios';

COMMENT ON POLICY "artifacts_org_metadata_insert" ON storage.objects IS 
'Usuarios pueden subir artifacts con org_id en metadata o archivos temporales propios';

COMMENT ON POLICY "proposals_org_metadata_select" ON storage.objects IS 
'Usuarios pueden ver propuestas de su organización (validado por org_id en metadata)';

COMMENT ON POLICY "proposals_org_metadata_insert" ON storage.objects IS 
'Usuarios pueden subir propuestas con org_id en metadata';

