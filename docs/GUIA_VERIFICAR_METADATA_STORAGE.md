# GUÍA: CÓMO VERIFICAR ARCHIVOS SIN METADATA EN STORAGE

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Verificar cuántos archivos en Storage no tienen `org_id` en metadata antes de aplicar FASE 3

---

## 🔍 DIFERENCIA ENTRE `artifacts` (BD) Y `storage.objects` (STORAGE)

### Tabla `artifacts` (Base de Datos PostgreSQL)

**Ubicación**: `public.artifacts`  
**Propósito**: Metadatos y contenido de documentos en la aplicación

**Columnas que mencionaste**:
- `id`: UUID del artifact en la BD
- `file_name`: Nombre original del archivo (ej: "documento.pdf")
- `content_type`: Tipo MIME (ej: "application/pdf")
- `content_text`: Texto extraído del PDF (para búsqueda)
- `provenance`: JSON con metadata de la aplicación (uploadedBy, fileHash, etc.)
- `created_at`: Fecha de creación del registro

**Campo clave**: `file_id` (String)
- Este campo contiene el **path** del archivo en Storage
- Ejemplo: `"550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/1706889600000_documento.pdf"`
- Este path se usa para acceder al archivo en Storage

### Tabla `storage.objects` (Supabase Storage)

**Ubicación**: `storage.objects`  
**Propósito**: Archivos físicos almacenados en Supabase Storage

**Columnas importantes**:
- `id`: UUID del objeto en Storage
- `bucket_id`: Nombre del bucket (ej: "artifacts")
- `name`: Path del archivo (igual que `file_id` en `artifacts`)
- `metadata`: JSONB con metadata del archivo (aquí está `org_id`)
- `created_at`: Fecha de creación del archivo

**Campo clave**: `metadata` (JSONB)
- Aquí es donde debe estar `org_id` para que funcionen las políticas de FASE 3
- Ejemplo de metadata correcta:
  ```json
  {
    "org_id": "550e8400-e29b-41d4-a716-446655440000",
    "case_id": "123e4567-e89b-12d3-a456-426614174000",
    "uploaded_by": "user-uuid",
    "file_name": "documento.pdf",
    "content_type": "application/pdf",
    "uploaded_at": "2025-02-02T12:00:00Z"
  }
  ```

### Relación entre ambas

```
artifacts.file_id  →  storage.objects.name
     (path)              (path)
```

**Ejemplo**:
- `artifacts.file_id` = `"550e8400/123e4567/1706889600000_doc.pdf"`
- `storage.objects.name` = `"550e8400/123e4567/1706889600000_doc.pdf"`
- `storage.objects.metadata->>'org_id'` = `"550e8400-e29b-41d4-a716-446655440000"` ✅

---

## 📊 CÓMO VERIFICAR ARCHIVOS SIN METADATA

### Método 1: Supabase Dashboard (Visual)

**Pasos**:
1. Abrir Supabase Dashboard
2. Ir a **Storage** → **Buckets** → **artifacts**
3. Ver lista de archivos
4. Click en un archivo para ver sus detalles
5. Verificar si tiene metadata con `org_id`

**Limitación**: No es práctico para muchos archivos

---

### Método 2: SQL Query en Supabase Dashboard (RECOMENDADO)

**Pasos**:
1. Abrir Supabase Dashboard
2. Ir a **SQL Editor**
3. Ejecutar las siguientes queries

#### Query 1: Contar archivos sin `org_id` en metadata

```sql
-- Contar archivos en bucket 'artifacts' que NO tienen org_id en metadata
-- Excluir archivos temporales (temp/{userId}/...)
SELECT 
    COUNT(*) as archivos_sin_metadata
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%';
```

**Resultado esperado**:
- Si es `0`: ✅ Todos los archivos tienen metadata (puedes aplicar FASE 3 directamente)
- Si es `> 0`: ⚠️ Hay archivos sin metadata (necesitas migración)

#### Query 2: Listar archivos sin `org_id` en metadata (con detalles)

```sql
-- Listar archivos sin org_id en metadata con información útil
SELECT 
    name as path_archivo,
    metadata,
    created_at,
    -- Extraer org_id del path (primer segmento)
    split_part(name, '/', 1) as org_id_del_path,
    -- Extraer case_id del path (segundo segmento)
    split_part(name, '/', 2) as case_id_del_path
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%'
ORDER BY created_at DESC
LIMIT 50; -- Limitar a 50 para no sobrecargar
```

**Resultado**: Lista de archivos que necesitan migración de metadata

#### Query 3: Verificar archivos con metadata correcta

```sql
-- Contar archivos que SÍ tienen org_id en metadata
SELECT 
    COUNT(*) as archivos_con_metadata
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND metadata->>'org_id' IS NOT NULL
AND metadata->>'org_id' != ''
AND name NOT LIKE 'temp/%';
```

**Resultado**: Cantidad de archivos que ya están listos para FASE 3

#### Query 4: Resumen completo

```sql
-- Resumen completo de estado de metadata
SELECT 
    COUNT(*) FILTER (WHERE metadata->>'org_id' IS NOT NULL AND metadata->>'org_id' != '' AND name NOT LIKE 'temp/%') as con_metadata,
    COUNT(*) FILTER (WHERE (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '') AND name NOT LIKE 'temp/%') as sin_metadata,
    COUNT(*) FILTER (WHERE name LIKE 'temp/%') as temporales,
    COUNT(*) as total
FROM storage.objects
WHERE bucket_id = 'artifacts';
```

**Resultado esperado**:
```
con_metadata | sin_metadata | temporales | total
-------------|--------------|------------|-------
     150     |      25      |     10     |  185
```

**Interpretación**:
- `con_metadata`: Archivos listos para FASE 3 ✅
- `sin_metadata`: Archivos que necesitan migración ⚠️
- `temporales`: Archivos temporales (no requieren metadata, se validan por path) ✅
- `total`: Total de archivos en el bucket

---

### Método 3: Verificar desde código (Node.js/TypeScript)

Si prefieres verificar programáticamente:

```typescript
// scripts/verificar-metadata-storage.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Requiere service role key
);

async function verificarMetadata() {
  // Listar todos los archivos en bucket 'artifacts'
  const { data: files, error } = await supabase.storage
    .from('artifacts')
    .list('', {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Filtrar archivos sin metadata
  const sinMetadata = files.filter(file => {
    const metadata = file.metadata || {};
    return !metadata.org_id && !file.name.startsWith('temp/');
  });

  console.log(`Total archivos: ${files.length}`);
  console.log(`Archivos sin metadata: ${sinMetadata.length}`);
  console.log(`Archivos con metadata: ${files.length - sinMetadata.length}`);
  
  if (sinMetadata.length > 0) {
    console.log('\nArchivos sin metadata:');
    sinMetadata.slice(0, 10).forEach(file => {
      console.log(`  - ${file.name}`);
    });
  }
}

verificarMetadata();
```

---

## 🔍 QUÉ SIGNIFICA CADA COLUMNA DE `artifacts`

Basado en el schema de Prisma:

### `id` (UUID)
- Identificador único del artifact en la base de datos
- No tiene relación directa con Storage
- Se usa para referenciar el artifact en la aplicación

### `file_name` (String)
- Nombre original del archivo cuando se subió
- Ejemplo: `"POLIZA-SEGURO-EDUCATIVO.pdf"`
- Se guarda para mostrar al usuario

### `content_type` (String)
- Tipo MIME del archivo
- Ejemplo: `"application/pdf"`
- Se usa para validar tipo de archivo

### `content_text` (String, nullable)
- Texto extraído del PDF usando OCR/parsing
- Se usa para búsqueda y análisis por el agente
- Puede ser `null` si la extracción falló

### `provenance` (JSON, nullable)
- Metadata de la aplicación (NO es la metadata de Storage)
- Contiene información como:
  ```json
  {
    "uploadedBy": "user-uuid",
    "uploadedAt": "2025-02-02T12:00:00Z",
    "fileHash": "sha256-hash",
    "fileSize": 235844,
    "pageCount": 15,
    "charactersExtracted": 45230
  }
  ```
- **NO contiene `org_id`** (ese está en Storage metadata)

### `created_at` (Timestamp)
- Fecha de creación del registro en la BD
- Puede diferir ligeramente de `storage.objects.created_at`

### `file_id` (String, nullable) ⭐ **IMPORTANTE**
- **Este es el campo clave que conecta con Storage**
- Contiene el path del archivo en Storage
- Formato: `"{orgId}/{caseId}/{timestamp}_{filename}"`
- Se usa para:
  - Generar URLs de acceso: `/api/storage/${fileId}`
  - Referenciar el archivo físico en Storage
  - Validar acceso en políticas de Storage

---

## 📋 PLAN DE ACCIÓN SEGÚN RESULTADO

### Escenario 1: `sin_metadata = 0` ✅

**Significado**: Todos los archivos tienen `org_id` en metadata

**Acción**:
1. ✅ Aplicar FASE 3 directamente
2. ✅ No se requiere migración
3. ✅ Todos los archivos seguirán siendo accesibles

---

### Escenario 2: `sin_metadata > 0` ⚠️

**Significado**: Hay archivos sin `org_id` en metadata

**Opciones**:

#### Opción A: Migrar metadata antes de FASE 3 (RECOMENDADO)

**Pasos**:
1. Ejecutar script de migración (ver Fase 1 del plan)
2. El script extraerá `org_id` del path y lo añadirá a metadata
3. Verificar que la migración fue exitosa
4. Aplicar FASE 3

**Ventaja**: Todos los archivos seguirán siendo accesibles

#### Opción B: Aplicar FASE 3 directamente

**Consecuencia**: 
- Archivos sin metadata quedarán inaccesibles
- Solo archivos nuevos (con metadata) serán accesibles

**Cuándo usar**: Si los archivos sin metadata son antiguos/obsoletos y no importan

---

## 🎯 QUERY RECOMENDADA PARA EMPEZAR

Ejecuta esta query primero para tener un panorama completo:

```sql
-- PANORAMA COMPLETO: Estado de metadata en Storage
SELECT 
    -- Archivos con metadata correcta
    COUNT(*) FILTER (
        WHERE metadata->>'org_id' IS NOT NULL 
        AND metadata->>'org_id' != '' 
        AND name NOT LIKE 'temp/%'
    ) as listos_para_fase3,
    
    -- Archivos sin metadata (necesitan migración)
    COUNT(*) FILTER (
        WHERE (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '') 
        AND name NOT LIKE 'temp/%'
    ) as necesitan_migracion,
    
    -- Archivos temporales (no requieren metadata)
    COUNT(*) FILTER (WHERE name LIKE 'temp/%') as temporales,
    
    -- Total
    COUNT(*) as total_archivos
    
FROM storage.objects
WHERE bucket_id = 'artifacts';
```

**Interpretación del resultado**:
- `listos_para_fase3`: Pueden aplicar FASE 3 sin problemas ✅
- `necesitan_migracion`: Requieren migración antes de FASE 3 ⚠️
- `temporales`: No requieren metadata (se validan por path) ✅
- `total_archivos`: Total en el bucket

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Ejecutar query de resumen completo
- [ ] Anotar cantidad de archivos sin metadata
- [ ] Si `necesitan_migracion > 0`: Revisar lista de archivos afectados
- [ ] Decidir: ¿Migrar metadata o aplicar FASE 3 directamente?
- [ ] Si migrar: Ejecutar script de migración (Fase 1)
- [ ] Verificar que migración fue exitosa
- [ ] Proceder con FASE 3

---

**Última actualización**: 2 de Febrero, 2025

