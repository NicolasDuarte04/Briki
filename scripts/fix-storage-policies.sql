-- ============================================================================
-- SCRIPT: fix-storage-policies.sql
-- PROPÓSITO: Verificar y aplicar políticas RLS de Storage para bucket 'artifacts'
-- EJECUTAR EN: Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- PASO 1: Verificar estado actual de políticas
-- ----------------------------------------------------------------------------
SELECT 
  'DIAGNÓSTICO DE POLÍTICAS STORAGE' as seccion,
  COUNT(*) as total_policies_artifacts
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'artifacts_%';

-- Lista detallada de políticas existentes
SELECT 
  policyname,
  cmd as operacion,
  permissive
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'artifacts_%'
ORDER BY policyname;

-- PASO 2: Verificar existencia del bucket
-- ----------------------------------------------------------------------------
SELECT 
  'BUCKET ARTIFACTS' as item,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'artifacts') 
    THEN '✅ EXISTE' 
    ELSE '❌ NO EXISTE' 
  END as estado;

-- PASO 3: Crear bucket si no existe
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- PASO 4: Crear políticas TEMP (para uploads durante creación de casos)
-- ----------------------------------------------------------------------------
-- Policy: artifacts_temp_insert - permite subir a temp/{user_id}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'artifacts_temp_insert'
  ) THEN
    CREATE POLICY "artifacts_temp_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'artifacts'
        AND split_part(name, '/', 1) = 'temp'
        AND split_part(name, '/', 2) = auth.uid()::text
      );
    RAISE NOTICE '✅ Creada: artifacts_temp_insert';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: artifacts_temp_insert';
  END IF;
END$$;

-- Policy: artifacts_temp_select - permite leer de temp/{user_id}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'artifacts_temp_select'
  ) THEN
    CREATE POLICY "artifacts_temp_select" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'artifacts'
        AND split_part(name, '/', 1) = 'temp'
        AND split_part(name, '/', 2) = auth.uid()::text
      );
    RAISE NOTICE '✅ Creada: artifacts_temp_select';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: artifacts_temp_select';
  END IF;
END$$;

-- Policy: artifacts_temp_delete - permite borrar de temp/{user_id}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'artifacts_temp_delete'
  ) THEN
    CREATE POLICY "artifacts_temp_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'artifacts'
        AND split_part(name, '/', 1) = 'temp'
        AND split_part(name, '/', 2) = auth.uid()::text
      );
    RAISE NOTICE '✅ Creada: artifacts_temp_delete';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: artifacts_temp_delete';
  END IF;
END$$;

-- PASO 5: Crear políticas ORG (para archivos persistentes de casos)
-- ----------------------------------------------------------------------------
-- Policy: artifacts_org_insert - miembros de org pueden subir a {org_id}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'artifacts_org_insert'
  ) THEN
    CREATE POLICY "artifacts_org_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'artifacts'
        AND EXISTS (
          SELECT 1 FROM public.org_members m
          WHERE m.user_id = auth.uid()
            AND m.org_id::text = split_part(name, '/', 1)
        )
      );
    RAISE NOTICE '✅ Creada: artifacts_org_insert';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: artifacts_org_insert';
  END IF;
END$$;

-- Policy: artifacts_org_select - miembros de org pueden leer de {org_id}/... o su temp/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'artifacts_org_select'
  ) THEN
    CREATE POLICY "artifacts_org_select" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'artifacts'
        AND (
          (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
          OR EXISTS (
            SELECT 1 FROM public.org_members m
            WHERE m.user_id = auth.uid()
              AND m.org_id::text = split_part(name, '/', 1)
          )
        )
      );
    RAISE NOTICE '✅ Creada: artifacts_org_select';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: artifacts_org_select';
  END IF;
END$$;

-- Policy: artifacts_org_delete - miembros de org pueden borrar de {org_id}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'artifacts_org_delete'
  ) THEN
    CREATE POLICY "artifacts_org_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'artifacts'
        AND EXISTS (
          SELECT 1 FROM public.org_members m
          WHERE m.user_id = auth.uid()
            AND m.org_id::text = split_part(name, '/', 1)
        )
      );
    RAISE NOTICE '✅ Creada: artifacts_org_delete';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: artifacts_org_delete';
  END IF;
END$$;

-- PASO 6: Verificación final
-- ----------------------------------------------------------------------------
SELECT 
  '✅ VERIFICACIÓN FINAL' as seccion,
  policyname,
  cmd as operacion
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'artifacts_%'
ORDER BY policyname;

-- Conteo esperado: 6 políticas
SELECT 
  CASE 
    WHEN COUNT(*) = 6 THEN '✅ TODAS LAS POLÍTICAS APLICADAS (6/6)'
    ELSE '⚠️ FALTAN POLÍTICAS (' || COUNT(*) || '/6)'
  END as resultado_final
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'artifacts_%';
