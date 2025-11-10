# ANÁLISIS DE DISCREPANCIA: 23 ARTIFACTS vs 8 ARCHIVOS SIN METADATA

**Fecha**: 2 de Febrero, 2025  
**Problema**: Discrepancia entre registros en BD (23 artifacts) y archivos sin metadata en Storage (8)  
**Objetivo**: Identificar todos los archivos que requieren migración de metadata

---

## 🔍 ANÁLISIS DE LA DISCREPANCIA

### Datos reportados:
- **23 registros** en tabla `artifacts` (Base de Datos)
- **8 archivos** sin `org_id` en metadata en Storage (excluyendo temporales)
- **275 archivos temporales** en Storage

### Posibles causas de la discrepancia:

1. **Artifacts sin `fileId`** (sourceType 'link' o 'api')
   - No tienen archivo en Storage
   - No requieren metadata

2. **Artifacts con `fileId` apuntando a archivos temporales**
   - Path: `temp/{userId}/...`
   - No requieren `org_id` en metadata (validados por path)

3. **Artifacts con `fileId` apuntando a archivos persistentes sin metadata**
   - Path: `{orgId}/{caseId}/...`
   - Requieren migración de metadata

4. **Artifacts con `fileId` apuntando a archivos que no existen en Storage**
   - Archivos eliminados manualmente
   - Orfanos (artifact existe pero archivo no)

5. **Archivos en Storage sin registro en `artifacts`**
   - Archivos subidos pero no registrados
   - Orfanos (archivo existe pero artifact no)

---

## 📊 QUERIES DE ANÁLISIS EXHAUSTIVO

### Query 1: Análisis completo de artifacts en BD

```sql
-- Análisis completo de artifacts: contar por sourceType y fileId
SELECT 
    source_type,
    COUNT(*) FILTER (WHERE file_id IS NOT NULL AND file_id != '') as con_file_id,
    COUNT(*) FILTER (WHERE file_id IS NULL OR file_id = '') as sin_file_id,
    COUNT(*) as total
FROM public.artifacts
GROUP BY source_type
ORDER BY source_type;
```

**Propósito**: Identificar cuántos artifacts tienen `fileId` y cuántos no

---

### Query 2: Artifacts con fileId que apuntan a archivos temporales

```sql
-- Artifacts que apuntan a archivos temporales (temp/{userId}/...)
SELECT 
    COUNT(*) as artifacts_temporales
FROM public.artifacts
WHERE file_id IS NOT NULL 
AND file_id LIKE 'temp/%';
```

**Propósito**: Identificar artifacts que apuntan a archivos temporales (no requieren metadata)

---

### Query 3: Artifacts con fileId que apuntan a archivos persistentes

```sql
-- Artifacts que apuntan a archivos persistentes (no temporales)
SELECT 
    COUNT(*) as artifacts_persistentes
FROM public.artifacts
WHERE file_id IS NOT NULL 
AND file_id != ''
AND file_id NOT LIKE 'temp/%';
```

**Propósito**: Identificar artifacts que apuntan a archivos persistentes (requieren metadata)

---

### Query 4: Verificar correspondencia entre artifacts y archivos en Storage

```sql
-- Verificar cuántos artifacts tienen archivo correspondiente en Storage
SELECT 
    COUNT(DISTINCT a.id) FILTER (
        WHERE a.file_id IS NOT NULL 
        AND a.file_id != ''
        AND EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = 'artifacts'
            AND o.name = a.file_id
        )
    ) as artifacts_con_archivo_en_storage,
    COUNT(DISTINCT a.id) FILTER (
        WHERE a.file_id IS NOT NULL 
        AND a.file_id != ''
        AND NOT EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = 'artifacts'
            AND o.name = a.file_id
        )
    ) as artifacts_sin_archivo_en_storage,
    COUNT(*) as total_artifacts
FROM public.artifacts a;
```

**Propósito**: Identificar artifacts huérfanos (artifact existe pero archivo no)

---

### Query 5: Archivos en Storage sin registro en artifacts

```sql
-- Archivos en Storage que NO tienen registro en artifacts
SELECT 
    COUNT(*) as archivos_orphanos_en_storage
FROM storage.objects o
WHERE o.bucket_id = 'artifacts'
AND o.name NOT LIKE 'temp/%'
AND NOT EXISTS (
    SELECT 1 FROM public.artifacts a
    WHERE a.file_id = o.name
);
```

**Propósito**: Identificar archivos huérfanos (archivo existe pero artifact no)

---

### Query 6: Análisis completo de correspondencia artifacts ↔ Storage

```sql
-- ANÁLISIS COMPLETO: Correspondencia entre artifacts y Storage
WITH artifacts_analysis AS (
    SELECT 
        a.id,
        a.source_type,
        a.file_id,
        CASE 
            WHEN a.file_id IS NULL OR a.file_id = '' THEN 'sin_file_id'
            WHEN a.file_id LIKE 'temp/%' THEN 'temporal'
            ELSE 'persistente'
        END as tipo_archivo,
        CASE 
            WHEN a.file_id IS NOT NULL AND a.file_id != '' AND a.file_id NOT LIKE 'temp/%' THEN
                EXISTS (
                    SELECT 1 FROM storage.objects o
                    WHERE o.bucket_id = 'artifacts'
                    AND o.name = a.file_id
                )
            ELSE NULL
        END as existe_en_storage
    FROM public.artifacts a
),
storage_analysis AS (
    SELECT 
        o.name as file_path,
        o.metadata,
        CASE 
            WHEN o.name LIKE 'temp/%' THEN 'temporal'
            ELSE 'persistente'
        END as tipo_archivo,
        CASE 
            WHEN o.metadata->>'org_id' IS NOT NULL AND o.metadata->>'org_id' != '' THEN true
            ELSE false
        END as tiene_org_id_metadata,
        EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.file_id = o.name
        ) as tiene_artifact
    FROM storage.objects o
    WHERE o.bucket_id = 'artifacts'
)
SELECT 
    -- Resumen de artifacts
    (SELECT COUNT(*) FROM artifacts_analysis) as total_artifacts,
    (SELECT COUNT(*) FROM artifacts_analysis WHERE tipo_archivo = 'sin_file_id') as artifacts_sin_file_id,
    (SELECT COUNT(*) FROM artifacts_analysis WHERE tipo_archivo = 'temporal') as artifacts_temporales,
    (SELECT COUNT(*) FROM artifacts_analysis WHERE tipo_archivo = 'persistente') as artifacts_persistentes,
    (SELECT COUNT(*) FROM artifacts_analysis WHERE tipo_archivo = 'persistente' AND existe_en_storage = true) as artifacts_persistentes_con_archivo,
    (SELECT COUNT(*) FROM artifacts_analysis WHERE tipo_archivo = 'persistente' AND existe_en_storage = false) as artifacts_persistentes_sin_archivo,
    
    -- Resumen de Storage
    (SELECT COUNT(*) FROM storage_analysis) as total_archivos_storage,
    (SELECT COUNT(*) FROM storage_analysis WHERE tipo_archivo = 'temporal') as archivos_temporales,
    (SELECT COUNT(*) FROM storage_analysis WHERE tipo_archivo = 'persistente') as archivos_persistentes,
    (SELECT COUNT(*) FROM storage_analysis WHERE tipo_archivo = 'persistente' AND tiene_org_id_metadata = true) as archivos_persistentes_con_metadata,
    (SELECT COUNT(*) FROM storage_analysis WHERE tipo_archivo = 'persistente' AND tiene_org_id_metadata = false) as archivos_persistentes_sin_metadata,
    (SELECT COUNT(*) FROM storage_analysis WHERE tipo_archivo = 'persistente' AND tiene_artifact = false) as archivos_orphanos;
```

**Propósito**: Análisis completo de la correspondencia entre artifacts y Storage

---

### Query 7: Listar artifacts persistentes que requieren migración

```sql
-- Listar artifacts persistentes cuyos archivos NO tienen org_id en metadata
SELECT 
    a.id as artifact_id,
    a.source_type,
    a.file_id,
    a.file_name,
    a.created_at,
    o.metadata as storage_metadata,
    split_part(a.file_id, '/', 1) as org_id_del_path,
    split_part(a.file_id, '/', 2) as case_id_del_path
FROM public.artifacts a
INNER JOIN storage.objects o ON o.bucket_id = 'artifacts' AND o.name = a.file_id
WHERE a.file_id IS NOT NULL 
AND a.file_id != ''
AND a.file_id NOT LIKE 'temp/%'
AND (o.metadata->>'org_id' IS NULL OR o.metadata->>'org_id' = '')
ORDER BY a.created_at DESC;
```

**Propósito**: Listar todos los artifacts que requieren migración de metadata

---

### Query 8: Verificar artifacts sin fileId (sourceType 'link' o 'api')

```sql
-- Artifacts sin fileId (sourceType 'link' o 'api')
SELECT 
    source_type,
    COUNT(*) as cantidad,
    STRING_AGG(id::text, ', ') as artifact_ids
FROM public.artifacts
WHERE file_id IS NULL OR file_id = ''
GROUP BY source_type;
```

**Propósito**: Identificar artifacts que no requieren archivo en Storage

---

## 🎯 PLAN DE ACCIÓN SEGÚN RESULTADOS

### Escenario A: Todos los artifacts persistentes tienen archivo en Storage

**Si**: `artifacts_persistentes_con_archivo = artifacts_persistentes`

**Acción**:
1. Migrar metadata de los archivos identificados en Query 7
2. Verificar que todos los artifacts persistentes tienen archivo con metadata
3. Aplicar FASE 3

---

### Escenario B: Hay artifacts persistentes sin archivo en Storage

**Si**: `artifacts_persistentes_sin_archivo > 0`

**Acción**:
1. Identificar qué artifacts son (Query 4)
2. Decidir: ¿Eliminar artifacts huérfanos o recrear archivos?
3. Migrar metadata de archivos existentes
4. Aplicar FASE 3

---

### Escenario C: Hay archivos en Storage sin artifact

**Si**: `archivos_orphanos > 0`

**Acción**:
1. Identificar qué archivos son
2. Decidir: ¿Eliminar archivos huérfanos o crear artifacts?
3. Migrar metadata de archivos que se mantengan
4. Aplicar FASE 3

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Ejecutar Query 1: Análisis de artifacts por sourceType
- [ ] Ejecutar Query 2: Contar artifacts temporales
- [ ] Ejecutar Query 3: Contar artifacts persistentes
- [ ] Ejecutar Query 4: Verificar correspondencia artifacts ↔ Storage
- [ ] Ejecutar Query 5: Verificar archivos huérfanos
- [ ] Ejecutar Query 6: Análisis completo
- [ ] Ejecutar Query 7: Listar artifacts que requieren migración
- [ ] Ejecutar Query 8: Verificar artifacts sin fileId
- [ ] Identificar escenario (A, B, o C)
- [ ] Ejecutar plan de acción correspondiente

---

**Última actualización**: 2 de Febrero, 2025

