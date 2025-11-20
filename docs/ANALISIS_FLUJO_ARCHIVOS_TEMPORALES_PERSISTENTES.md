# ANÁLISIS EXHAUSTIVO: FLUJO DE ARCHIVOS TEMPORALES Y PERSISTENTES

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Explicar el flujo actual, identificar problemas y proponer mejoras para alta concurrencia

---

## 📊 SITUACIÓN ACTUAL

### Datos del sistema:
- **23 artifacts** en BD (todos apuntan a archivos temporales)
- **275 archivos temporales** en Storage (`temp/{userId}/...`)
- **8 archivos persistentes** sin metadata (`{orgId}/{caseId}/...`)
- **0 archivos persistentes** con metadata correcta

---

## 🔄 FLUJO ACTUAL DE ARCHIVOS

### Flujo 1: Upload desde Landing Page (sin caso creado)

```
1. Usuario sube PDF en landing page
   ↓
2. Frontend llama: POST /api/upload/pdf (sin caseId/orgId)
   ↓
3. Backend sube a Storage: temp/{userId}/{timestamp}_{filename}
   ↓
4. Backend retorna: tempUpload { storagePath, fileName, ... }
   ↓
5. Frontend guarda tempUpload en estado local
   ↓
6. Usuario envía mensaje → POST /api/chat/start
   ↓
7. Backend crea Case
   ↓
8. Backend crea Artifact con fileId = temp/{userId}/... (MANTIENE RUTA TEMPORAL)
   ↓
9. ❌ PROBLEMA: Archivo permanece en temp/ permanentemente
```

**Código relevante** (`src/app/api/chat/start/route.ts:102`):
```typescript
fileId: t.storagePath, // mantenemos la ruta; si luego quieres mover, podemos copiar en Storage
```

---

### Flujo 2: Upload desde Workspace (con caso existente)

```
1. Usuario sube PDF en workspace (con caseId)
   ↓
2. Frontend llama: POST /api/upload/pdf (con caseId/orgId)
   ↓
3. Backend sube a Storage: {orgId}/{caseId}/{timestamp}_{filename}
   ↓
4. Backend crea Artifact inmediatamente
   ↓
5. ✅ CORRECTO: Archivo en ruta persistente con metadata
```

**Código relevante** (`src/app/api/upload/pdf/route.ts:218`):
```typescript
const storagePath = `${orgId}/${caseId}/${timestamp}_${sanitizedFileName}`;
```

---

### Flujo 3: Upload temporal desde Workspace (sin caso aún)

```
1. Usuario sube PDF en formulario de creación de caso (sin caseId aún)
   ↓
2. Frontend llama: POST /api/upload/pdf (sin caseId/orgId)
   ↓
3. Backend sube a Storage: temp/{userId}/{timestamp}_{filename}
   ↓
4. Frontend guarda tempUpload en estado local
   ↓
5. Usuario crea caso → POST /api/cases/create
   ↓
6. Backend crea Case
   ↓
7. Backend crea Artifact con fileId = temp/{userId}/... (MANTIENE RUTA TEMPORAL)
   ↓
8. ❌ PROBLEMA: Archivo permanece en temp/ permanentemente
```

**Código relevante** (`src/app/api/cases/create/route.ts:256`):
```typescript
fileId: tempUpload.storagePath, // Mantiene ruta temporal
```

---

## 🚨 PROBLEMAS IDENTIFICADOS

### Problema 1: Archivos temporales nunca se mueven a rutas persistentes

**Impacto**: 
- Archivos permanecen en `temp/` permanentemente
- No hay separación clara entre archivos temporales y persistentes
- Las políticas de FASE 3 validan por path, pero no es ideal

**Código problemático**:
- `src/app/api/chat/start/route.ts:102`: `fileId: t.storagePath` (mantiene temp)
- `src/app/api/cases/create/route.ts:256`: `fileId: tempUpload.storagePath` (mantiene temp)
- `src/app/api/cases/update/route.ts`: Similar

---

### Problema 2: No hay limpieza de archivos temporales

**Impacto**:
- 275 archivos temporales acumulados
- Muchos ya tienen artifact asociado (no deberían estar en temp/)
- Consumo innecesario de storage
- Dificulta identificar archivos realmente temporales

**Código existente pero no activado**:
- `supabase/migrations/20250107_storage_buckets_configuration.sql:237`: Función `cleanup_temp_files()` existe pero no está programada
- La función limpia bucket `temp-processing` (que no existe), no `artifacts/temp/`

---

### Problema 3: Archivos duplicados asociados a múltiples cases

**Impacto**:
- El mismo archivo físico puede estar asociado a múltiples artifacts
- No hay deduplicación real (solo verifica hash dentro del mismo caso)
- Consumo innecesario de storage

**Código relevante** (`src/app/api/upload/pdf/route.ts:193-212`):
```typescript
// Verifica duplicados solo dentro del mismo caso
const allArtifacts = await prisma.artifact.findMany({
  where: { caseId: caseId }
});
```

---

### Problema 4: Archivos temporales sin artifact (huérfanos)

**Impacto**:
- Archivos subidos pero nunca asociados a un caso
- No hay limpieza automática
- Consumo innecesario de storage

**Estimación**: De los 275 archivos temporales, algunos no tienen artifact asociado

---

## ✅ ESTRUCTURA CORRECTA PARA ALTA CONCURRENCIA

### Arquitectura ideal:

```
Storage:
├── temp/{userId}/{timestamp}_{filename}  → Archivos temporales (sin artifact)
│   └── Se eliminan después de X horas si no tienen artifact
│
└── {orgId}/{caseId}/{timestamp}_{filename}  → Archivos persistentes (con artifact)
    └── Permanecen mientras exista el artifact

BD:
└── artifacts.file_id → Siempre apunta a ruta persistente (nunca temp/)
```

---

### Flujo correcto:

#### Flujo A: Upload desde Landing Page

```
1. Usuario sube PDF → temp/{userId}/...
   ↓
2. Usuario envía mensaje → Crea Case
   ↓
3. Backend COPIA archivo: temp/{userId}/... → {orgId}/{caseId}/...
   ↓
4. Backend crea Artifact con fileId = {orgId}/{caseId}/...
   ↓
5. Backend ELIMINA archivo temporal original
   ↓
6. ✅ Archivo en ruta persistente con metadata
```

#### Flujo B: Upload desde Workspace (con caso)

```
1. Usuario sube PDF → {orgId}/{caseId}/... (directo)
   ↓
2. Backend crea Artifact
   ↓
3. ✅ Archivo en ruta persistente con metadata
```

#### Flujo C: Upload temporal desde Workspace

```
1. Usuario sube PDF → temp/{userId}/...
   ↓
2. Usuario crea caso
   ↓
3. Backend COPIA archivo: temp/{userId}/... → {orgId}/{caseId}/...
   ↓
4. Backend crea Artifact con fileId = {orgId}/{caseId}/...
   ↓
5. Backend ELIMINA archivo temporal original
   ↓
6. ✅ Archivo en ruta persistente con metadata
```

---

## 🔧 PROPUESTAS DE MEJORA

### Mejora 1: Mover archivos temporales a rutas persistentes

**Archivo**: `src/app/api/chat/start/route.ts`, `src/app/api/cases/create/route.ts`, `src/app/api/cases/update/route.ts`

**Cambio**:
```typescript
// ANTES (actual):
fileId: t.storagePath, // Mantiene ruta temporal

// DESPUÉS (propuesto):
// 1. Copiar archivo de temp/ a ruta persistente
const persistentPath = `${orgId}/${newCase.id}/${Date.now()}_${t.fileName}`;
await supabase.storage
  .from('artifacts')
  .copy(t.storagePath, persistentPath);

// 2. Actualizar metadata del archivo copiado
await supabase.storage
  .from('artifacts')
  .update(persistentPath, null, {
    metadata: {
      org_id: String(orgId),
      case_id: String(newCase.id),
      uploaded_by: String(user.id),
      // ... otros campos
    }
  });

// 3. Eliminar archivo temporal
await supabase.storage
  .from('artifacts')
  .remove([t.storagePath]);

// 4. Crear artifact con ruta persistente
fileId: persistentPath
```

---

### Mejora 2: Limpieza automática de archivos temporales huérfanos

**Archivo**: `supabase/migrations/20250202_cleanup_temp_files.sql` (nuevo)

**Código**:
```sql
-- Función para limpiar archivos temporales sin artifact
CREATE OR REPLACE FUNCTION public.cleanup_orphan_temp_files()
RETURNS TABLE(deleted_count INTEGER, deleted_size BIGINT) AS $$
DECLARE
    file_record RECORD;
    total_deleted INTEGER := 0;
    total_size BIGINT := 0;
BEGIN
    -- Eliminar archivos temporales sin artifact asociado y más antiguos de 24 horas
    FOR file_record IN
        SELECT 
            o.id,
            o.name,
            o.metadata->>'file_size'::bigint as file_size
        FROM storage.objects o
        WHERE o.bucket_id = 'artifacts'
        AND o.name LIKE 'temp/%'
        AND o.created_at < now() - interval '24 hours'
        AND NOT EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.file_id = o.name
        )
    LOOP
        DELETE FROM storage.objects WHERE id = file_record.id;
        total_deleted := total_deleted + 1;
        total_size := total_size + COALESCE(file_record.file_size, 0);
    END LOOP;
    
    RETURN QUERY SELECT total_deleted, total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Programar limpieza automática (requiere pg_cron)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-orphan-temp-files', '0 3 * * *', 'SELECT * FROM public.cleanup_orphan_temp_files();');
```

---

### Mejora 3: Deduplicación global de archivos

**Archivo**: `src/app/api/upload/pdf/route.ts`

**Cambio**:
```typescript
// ANTES (actual): Solo verifica duplicados en el mismo caso
const allArtifacts = await prisma.artifact.findMany({
  where: { caseId: caseId }
});

// DESPUÉS (propuesto): Verificar duplicados globalmente
const existingArtifact = await prisma.artifact.findFirst({
  where: {
    provenance: {
      path: ['fileHash'],
      equals: fileHash
    }
  }
});

if (existingArtifact) {
  // Opción A: Reutilizar archivo existente (crear artifact nuevo apuntando al mismo archivo)
  // Opción B: Rechazar upload (comportamiento actual)
}
```

---

### Mejora 4: Validación de integridad artifacts ↔ Storage

**Archivo**: `supabase/migrations/20250202_validate_artifacts_storage.sql` (nuevo)

**Código**:
```sql
-- Función para validar integridad entre artifacts y Storage
CREATE OR REPLACE FUNCTION public.validate_artifacts_storage()
RETURNS TABLE(
    artifacts_without_file INTEGER,
    files_without_artifact INTEGER,
    temp_files_with_artifact INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.artifacts a
         WHERE a.file_id IS NOT NULL
         AND a.file_id != ''
         AND NOT EXISTS (
             SELECT 1 FROM storage.objects o
             WHERE o.bucket_id = 'artifacts'
             AND o.name = a.file_id
         )) as artifacts_without_file,
        
        (SELECT COUNT(*) FROM storage.objects o
         WHERE o.bucket_id = 'artifacts'
         AND o.name NOT LIKE 'temp/%'
         AND NOT EXISTS (
             SELECT 1 FROM public.artifacts a
             WHERE a.file_id = o.name
         )) as files_without_artifact,
        
        (SELECT COUNT(*) FROM storage.objects o
         WHERE o.bucket_id = 'artifacts'
         AND o.name LIKE 'temp/%'
         AND EXISTS (
             SELECT 1 FROM public.artifacts a
             WHERE a.file_id = o.name
         )) as temp_files_with_artifact;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Fase 1: Migración de archivos temporales existentes (CRÍTICO)

**Objetivo**: Mover los 23 artifacts que apuntan a archivos temporales a rutas persistentes

**Script**: `supabase/migrations/20250202_migrate_temp_to_persistent.sql`

```sql
-- Migrar archivos temporales a rutas persistentes
DO $$
DECLARE
    artifact_record RECORD;
    new_path TEXT;
    org_id_from_case UUID;
BEGIN
    FOR artifact_record IN
        SELECT 
            a.id,
            a.file_id,
            a.case_id,
            c.org_id
        FROM public.artifacts a
        INNER JOIN public.cases c ON c.id = a.case_id
        WHERE a.file_id LIKE 'temp/%'
    LOOP
        -- Generar nueva ruta persistente
        new_path := artifact_record.org_id::text || '/' || 
                   artifact_record.case_id::text || '/' || 
                   split_part(artifact_record.file_id, '/', 3);
        
        -- Copiar archivo (requiere función helper o API)
        -- Nota: Esto debe hacerse desde la aplicación, no desde SQL
        
        -- Actualizar artifact con nueva ruta
        UPDATE public.artifacts
        SET file_id = new_path
        WHERE id = artifact_record.id;
    END LOOP;
END $$;
```

**Nota**: La copia de archivos debe hacerse desde la aplicación (API), no desde SQL.

---

### Fase 2: Implementar movimiento de archivos en APIs

**Archivos a modificar**:
1. `src/app/api/chat/start/route.ts`
2. `src/app/api/cases/create/route.ts`
3. `src/app/api/cases/update/route.ts`

**Cambio**: Reemplazar creación directa de artifact con movimiento de archivo primero.

---

### Fase 3: Implementar limpieza automática

**Archivo**: `supabase/migrations/20250202_cleanup_temp_files.sql`

**Acción**: Crear función y programar con pg_cron.

---

### Fase 4: Implementar deduplicación global

**Archivo**: `src/app/api/upload/pdf/route.ts`

**Cambio**: Modificar lógica de verificación de duplicados.

---

## ⚠️ RIESGOS Y CONSIDERACIONES

### Riesgo 1: Migración de archivos existentes

**Mitigación**:
- Hacer backup antes de migrar
- Migrar en batches pequeños
- Verificar integridad después de cada batch

### Riesgo 2: Performance de copia de archivos

**Mitigación**:
- Usar operaciones asíncronas
- Implementar retry logic
- Monitorear tiempos de respuesta

### Riesgo 3: Archivos en uso durante migración

**Mitigación**:
- Usar signed URLs para acceso durante migración
- Implementar locks si es necesario

---

## 📊 MÉTRICAS DE ÉXITO

Después de implementar mejoras:
- ✅ 0 artifacts apuntando a archivos temporales
- ✅ Archivos temporales solo para uploads en progreso (< 1 hora)
- ✅ Limpieza automática de archivos huérfanos
- ✅ Deduplicación global funcionando
- ✅ Validación de integridad periódica

---

**Última actualización**: 2 de Febrero, 2025

