# QUERIES: ANÁLISIS DE 8 ARCHIVOS PERSISTENTES SIN METADATA

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Identificar y analizar los 8 archivos persistentes sin metadata que no tienen artifact asociado

---

## 🔍 QUERY 1: Listar los 8 archivos persistentes sin metadata

```sql
-- Listar los 8 archivos persistentes sin org_id en metadata
SELECT 
    o.id as storage_id,
    o.name as file_path,
    o.created_at as storage_created_at,
    o.metadata as storage_metadata,
    split_part(o.name, '/', 1) as org_id_del_path,
    split_part(o.name, '/', 2) as case_id_del_path,
    split_part(o.name, '/', 3) as file_name_del_path,
    CASE 
        WHEN split_part(o.name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID válido'
        ELSE '❌ UUID inválido'
    END as org_id_valido,
    CASE 
        WHEN split_part(o.name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID válido'
        ELSE '❌ UUID inválido'
    END as case_id_valido
FROM storage.objects o
WHERE o.bucket_id = 'artifacts'
AND (o.metadata->>'org_id' IS NULL OR o.metadata->>'org_id' = '')
AND o.name NOT LIKE 'temp/%'
ORDER BY o.created_at DESC;
```

**Propósito**: Ver los 8 archivos, sus paths, y validar que los UUIDs del path sean válidos

---

## 🔍 QUERY 2: Verificar si los 8 archivos tienen casos asociados

```sql
-- Verificar si los casos asociados a los 8 archivos existen
SELECT 
    o.name as file_path,
    split_part(o.name, '/', 1) as org_id_del_path,
    split_part(o.name, '/', 2) as case_id_del_path,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id::text = split_part(o.name, '/', 2)
        ) THEN '✅ Caso existe'
        ELSE '❌ Caso NO existe'
    END as caso_existe,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id::text = split_part(o.name, '/', 2)
            AND c.org_id::text = split_part(o.name, '/', 1)
        ) THEN '✅ Caso pertenece a la org'
        ELSE '❌ Caso NO pertenece a la org o no existe'
    END as caso_pertenece_a_org
FROM storage.objects o
WHERE o.bucket_id = 'artifacts'
AND (o.metadata->>'org_id' IS NULL OR o.metadata->>'org_id' = '')
AND o.name NOT LIKE 'temp/%'
ORDER BY o.created_at DESC;
```

**Propósito**: Verificar si los casos asociados a los 8 archivos existen y pertenecen a la organización correcta

---

## 🔍 QUERY 3: Verificar si deberían tener artifact

```sql
-- Verificar si los casos tienen artifacts asociados
SELECT 
    o.name as file_path,
    split_part(o.name, '/', 2) as case_id_del_path,
    c.id as case_id,
    c.org_id as case_org_id,
    COUNT(a.id) as artifacts_del_caso,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.case_id::text = split_part(o.name, '/', 2)
            AND a.file_id = o.name
        ) THEN '✅ Tiene artifact'
        ELSE '❌ NO tiene artifact'
    END as tiene_artifact
FROM storage.objects o
LEFT JOIN public.cases c ON c.id::text = split_part(o.name, '/', 2)
LEFT JOIN public.artifacts a ON a.case_id = c.id
WHERE o.bucket_id = 'artifacts'
AND (o.metadata->>'org_id' IS NULL OR o.metadata->>'org_id' = '')
AND o.name NOT LIKE 'temp/%'
GROUP BY o.name, split_part(o.name, '/', 2), c.id, c.org_id
ORDER BY o.created_at DESC;
```

**Propósito**: Verificar si los casos tienen artifacts y si alguno de los 8 archivos debería tener artifact

---

## 🔍 QUERY 4: Resumen completo de los 8 archivos

```sql
-- Resumen completo de los 8 archivos persistentes sin metadata
WITH archivos_sin_metadata AS (
    SELECT 
        o.id as storage_id,
        o.name as file_path,
        o.created_at as storage_created_at,
        split_part(o.name, '/', 1) as org_id_del_path,
        split_part(o.name, '/', 2) as case_id_del_path
    FROM storage.objects o
    WHERE o.bucket_id = 'artifacts'
    AND (o.metadata->>'org_id' IS NULL OR o.metadata->>'org_id' = '')
    AND o.name NOT LIKE 'temp/%'
)
SELECT 
    COUNT(*) as total_archivos_sin_metadata,
    COUNT(*) FILTER (
        WHERE org_id_del_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND case_id_del_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) as archivos_con_paths_validos,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id::text = case_id_del_path
        )
    ) as archivos_con_caso_existente,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id::text = case_id_del_path
            AND c.org_id::text = org_id_del_path
        )
    ) as archivos_con_caso_valido,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.file_id = file_path
        )
    ) as archivos_con_artifact
FROM archivos_sin_metadata;
```

**Propósito**: Resumen estadístico de los 8 archivos para decidir el plan de acción

---

## 🎯 INTERPRETACIÓN DE RESULTADOS

### Escenario A: Todos los 8 archivos tienen casos válidos pero no tienen artifact

**Si**: `archivos_con_caso_valido = 8` y `archivos_con_artifact = 0`

**Acción**:
1. Migrar metadata de los 8 archivos (script de migración)
2. (Opcional) Crear artifacts para esos archivos si se desea
3. Aplicar FASE 3

---

### Escenario B: Algunos archivos tienen casos válidos, otros no

**Si**: `archivos_con_caso_valido < 8`

**Acción**:
1. Migrar metadata de TODOS los archivos (para que las políticas funcionen)
2. Para archivos con caso válido: (Opcional) Crear artifacts
3. Para archivos sin caso válido: Decidir si eliminar o mantener
4. Aplicar FASE 3

---

### Escenario C: Algunos archivos ya tienen artifact

**Si**: `archivos_con_artifact > 0`

**Acción**:
1. Investigar por qué el artifact no se detectó en Query C
2. Migrar metadata de TODOS los archivos
3. Aplicar FASE 3

---

## ✅ PLAN DE ACCIÓN RECOMENDADO

**Independientemente del escenario**:
1. ✅ **Migrar metadata de los 8 archivos** (script de migración)
   - Esto asegura que las políticas de FASE 3 funcionen
   - Los archivos serán accesibles según las políticas
2. ⚠️ **Opcional**: Crear artifacts para archivos con casos válidos
   - Solo si se desea tener registro completo en BD
   - No es crítico para FASE 3
3. ✅ **Aplicar FASE 3** (políticas de storage)

---

**Última actualización**: 2 de Febrero, 2025

