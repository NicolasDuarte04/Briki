# PLAN DE IMPLEMENTACIÓN: MIGRACIÓN Y MEJORA DE GESTIÓN DE ARCHIVOS

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Implementar migración de archivos y mejoras del sistema de gestión de artifacts  
**Enfoque**: Quirúrgico, fase por fase, con validación entre fases

---

## 📋 PRINCIPIOS DE TRABAJO

1. **Reutilización máxima del código existente**
2. **Mantenimiento de la arquitectura dual del proyecto**
3. **Consistencia de estado unidireccional**
4. **Separación clara de responsabilidades**
5. **No romper funcionalidades existentes**

---

## 🔍 ANÁLISIS EXHAUSTIVO DE DEPENDENCIAS

### Archivos que usan `fileId` o `storagePath`:

#### Backend (APIs):
1. `src/app/api/chat/start/route.ts` - Crea artifacts con `fileId: t.storagePath`
2. `src/app/api/cases/create/route.ts` - Crea artifacts con `fileId: tempUpload.storagePath`
3. `src/app/api/cases/update/route.ts` - Crea artifacts con `fileId: tempUpload.storagePath`
4. `src/app/api/upload/pdf/route.ts` - Genera `storagePath` y crea artifacts
5. `src/app/api/storage/[...path]/route.ts` - Accede a archivos por path (valida por org_id)

#### Frontend (Componentes):
1. `src/components/Workspace/ArtifactsList.tsx` - Usa `fileId` para generar URLs
2. `src/app/[locale]/(app)/workspace/cases/[id]/CaseDetailContent.tsx` - Usa `fileId` para iframes
3. `src/components/Cases/BriefForm.tsx` - Maneja `tempUploads` con `storagePath`
4. `src/components/Landing/LandingChatInput.tsx` - Maneja `tempUploads`
5. `src/components/Chat/BrikiChat.tsx` - Maneja `tempUploads`

#### Helpers:
1. `src/lib/database.ts` - Función `createArtifact` valida `fileId`

### Riesgos identificados:

1. **Alto**: Cambiar `fileId` en artifacts existentes puede romper URLs en frontend
2. **Alto**: Mover archivos en Storage puede causar 404 si no se actualiza `fileId`
3. **Medio**: La API `/api/storage/[...path]` valida por path, debe soportar ambos formatos durante transición
4. **Medio**: Componentes frontend esperan `fileId` en formato específico

---

## 📊 FASES DE IMPLEMENTACIÓN

### FASE 0: Migración de metadata de 8 archivos persistentes (PREREQUISITO PARA FASE 3)

**Objetivo**: Añadir `org_id` a metadata de los 8 archivos persistentes sin metadata

**Archivos afectados**: Ninguno (solo Storage metadata)

**Riesgo**: **BAJO** - Solo modifica metadata, no afecta código

**Implementación**: Ya existe script en `supabase/migrations/20250202_update_existing_storage_metadata.sql`

**Validación**:
```sql
SELECT 
    COUNT(*) FILTER (WHERE metadata->>'org_id' IS NOT NULL AND name NOT LIKE 'temp/%') as con_metadata,
    COUNT(*) FILTER (WHERE (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '') AND name NOT LIKE 'temp/%') as sin_metadata
FROM storage.objects
WHERE bucket_id = 'artifacts';
```

**Criterio de éxito**: `sin_metadata = 0`

---

### FASE 1: Crear función helper para mover archivos temporales a persistentes

**Objetivo**: Centralizar lógica de movimiento de archivos para reutilización

**Archivo nuevo**: `src/lib/storage/moveTempToPersistent.ts`

**Funcionalidad**:
- Copiar archivo de `temp/` a `{orgId}/{caseId}/...`
- Actualizar metadata con `org_id`, `case_id`, etc.
- Eliminar archivo temporal original
- Retornar nueva ruta persistente

**Ventajas**:
- Reutilización máxima de código
- Separación de responsabilidades
- Fácil testing y mantenimiento

**Riesgo**: **BAJO** - Función nueva, no afecta código existente

---

### FASE 2: Migrar archivos temporales existentes (23 artifacts)

**Objetivo**: Mover los 23 artifacts que apuntan a archivos temporales a rutas persistentes

**Archivos afectados**: 
- BD: Tabla `artifacts` (actualizar `file_id`)
- Storage: Copiar archivos de `temp/` a `{orgId}/{caseId}/...`

**Riesgo**: **ALTO** - Cambia `fileId` en artifacts existentes

**Mitigación**:
1. Crear script de migración que:
   - Identifique artifacts con `file_id LIKE 'temp/%'`
   - Copie archivo a ruta persistente
   - Actualice `file_id` en artifact
   - Elimine archivo temporal
2. Ejecutar en modo dry-run primero
3. Hacer backup de artifacts antes de migrar
4. Verificar integridad después de cada batch

**Script**: `scripts/migrate-temp-artifacts-to-persistent.ts` (nuevo)

**Validación post-migración**:
```sql
-- Verificar que no quedan artifacts apuntando a temp/
SELECT COUNT(*) as artifacts_temp_restantes
FROM public.artifacts
WHERE file_id LIKE 'temp/%';
```

**Criterio de éxito**: `artifacts_temp_restantes = 0`

---

### FASE 3: Implementar movimiento de archivos en APIs (nuevos uploads)

**Objetivo**: Modificar APIs para mover archivos temporales a persistentes al crear artifacts

**Archivos a modificar**:
1. `src/app/api/chat/start/route.ts`
2. `src/app/api/cases/create/route.ts`
3. `src/app/api/cases/update/route.ts`

**Cambio**: Reemplazar creación directa de artifact con:
1. Llamar a función helper `moveTempToPersistent()`
2. Crear artifact con nueva ruta persistente

**Riesgo**: **MEDIO** - Modifica lógica de creación de artifacts

**Mitigación**:
1. Usar función helper (reutilización)
2. Mantener validaciones existentes
3. Agregar manejo de errores robusto
4. Si falla movimiento, mantener ruta temporal como fallback

**Validación**:
- Probar creación de caso desde landing page
- Probar creación de caso desde workspace
- Probar actualización de caso con tempUploads
- Verificar que archivos se mueven correctamente

---

### FASE 4: Implementar limpieza automática de archivos temporales huérfanos

**Objetivo**: Eliminar archivos temporales sin artifact asociado (> 24 horas)

**Archivo nuevo**: `supabase/migrations/20250202_cleanup_orphan_temp_files.sql`

**Funcionalidad**:
- Función SQL que elimina archivos `temp/` sin artifact y > 24h
- Programar con pg_cron (diario a las 3 AM)

**Riesgo**: **BAJO** - Solo elimina archivos huérfanos, no afecta artifacts

**Validación**:
- Ejecutar función manualmente primero
- Verificar que solo elimina archivos correctos
- Programar después de verificación

---

### FASE 5: Implementar deduplicación global

**Objetivo**: Verificar duplicados globalmente, no solo dentro del mismo caso

**Archivo a modificar**: `src/app/api/upload/pdf/route.ts`

**Cambio**: Modificar lógica de verificación de duplicados

**Riesgo**: **MEDIO** - Cambia comportamiento de uploads

**Mitigación**:
1. Mantener verificación actual como fallback
2. Agregar verificación global como opción
3. Permitir configuración (reutilizar archivo vs rechazar)

**Validación**:
- Probar upload de archivo duplicado en mismo caso
- Probar upload de archivo duplicado en caso diferente
- Verificar comportamiento esperado

---

## 🔧 IMPLEMENTACIÓN DETALLADA POR FASE

### FASE 0: Migración de metadata (YA LISTA)

**Estado**: Script creado, listo para ejecutar

**Acción**: Ejecutar script en Supabase Dashboard

---

### FASE 1: Función helper (NUEVA)

**Archivo**: `src/lib/storage/moveTempToPersistent.ts`

**Código**:
```typescript
import { createServerSupabase } from '@/lib/supabase/server';

interface MoveTempToPersistentParams {
  tempPath: string;
  orgId: string;
  caseId: string;
  fileName: string;
  userId: string;
}

export async function moveTempToPersistent({
  tempPath,
  orgId,
  caseId,
  fileName,
  userId
}: MoveTempToPersistentParams): Promise<{ success: boolean; persistentPath?: string; error?: string }> {
  try {
    const supabase = await createServerSupabase();
    
    // Validar que tempPath es temporal
    if (!tempPath.startsWith('temp/')) {
      return { success: false, error: 'Path is not a temporary path' };
    }
    
    // Generar ruta persistente
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const persistentPath = `${orgId}/${caseId}/${timestamp}_${sanitizedFileName}`;
    
    // 1. Copiar archivo
    const { data: copyData, error: copyError } = await supabase.storage
      .from('artifacts')
      .copy(tempPath, persistentPath);
    
    if (copyError) {
      console.error('❌ Error copying file:', copyError);
      return { success: false, error: `Failed to copy file: ${copyError.message}` };
    }
    
    // 2. Actualizar metadata del archivo copiado
    const { error: updateError } = await supabase.storage
      .from('artifacts')
      .update(persistentPath, null, {
        metadata: {
          org_id: String(orgId),
          case_id: String(caseId),
          uploaded_by: String(userId),
          file_name: String(fileName),
          content_type: 'application/pdf',
          uploaded_at: new Date().toISOString(),
          migrated_from_temp: 'true',
          original_temp_path: tempPath,
        }
      });
    
    if (updateError) {
      console.error('❌ Error updating metadata:', updateError);
      // No fallar, metadata es opcional
    }
    
    // 3. Eliminar archivo temporal
    const { error: deleteError } = await supabase.storage
      .from('artifacts')
      .remove([tempPath]);
    
    if (deleteError) {
      console.error('⚠️ Error deleting temp file (non-critical):', deleteError);
      // No fallar, archivo temporal puede limpiarse después
    }
    
    return { success: true, persistentPath };
  } catch (error: any) {
    console.error('❌ Error in moveTempToPersistent:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
```

**Validación**:
- Crear test unitario
- Probar con archivo temporal real
- Verificar que archivo se copia correctamente
- Verificar que metadata se actualiza
- Verificar que archivo temporal se elimina

---

### FASE 2: Script de migración (NUEVO)

**Archivo**: `scripts/migrate-temp-artifacts-to-persistent.ts`

**Funcionalidad**:
- Leer artifacts con `file_id LIKE 'temp/%'`
- Para cada artifact:
  - Obtener `orgId` del caso
  - Llamar a `moveTempToPersistent()`
  - Actualizar `file_id` en artifact
- Reportar resultados

**Validación**:
- Ejecutar en modo dry-run primero
- Verificar que todos los archivos se migran
- Verificar que artifacts se actualizan correctamente

---

### FASE 3: Modificar APIs (CRÍTICO)

**Archivos**: `chat/start`, `cases/create`, `cases/update`

**Cambio**: Reemplazar creación directa con movimiento primero

**Ejemplo para `chat/start/route.ts`**:
```typescript
// ANTES:
fileId: t.storagePath,

// DESPUÉS:
// Mover archivo temporal a persistente
const moveResult = await moveTempToPersistent({
  tempPath: t.storagePath,
  orgId: orgId,
  caseId: newCase.id,
  fileName: t.fileName,
  userId: user.id
});

if (!moveResult.success) {
  console.error('❌ Error moving temp file:', moveResult.error);
  // Fallback: mantener ruta temporal (compatibilidad)
  // En producción, deberíamos fallar o retry
}

await prisma.artifact.create({
  data: {
    caseId: newCase.id,
    sourceType: 'pdf',
    fileId: moveResult.persistentPath || t.storagePath, // Fallback a temp si falla
    // ... resto de campos
  },
});
```

**Validación**:
- Probar cada API modificada
- Verificar que archivos se mueven correctamente
- Verificar que artifacts se crean con ruta persistente
- Verificar que frontend sigue funcionando

---

### FASE 4: Limpieza automática (NUEVO)

**Archivo**: `supabase/migrations/20250202_cleanup_orphan_temp_files.sql`

**Código**: Ver `ANALISIS_FLUJO_ARCHIVOS_TEMPORALES_PERSISTENTES.md` (Mejora 2)

**Validación**:
- Ejecutar función manualmente
- Verificar que solo elimina archivos correctos
- Programar después de verificación

---

### FASE 5: Deduplicación global (OPCIONAL)

**Archivo**: `src/app/api/upload/pdf/route.ts`

**Cambio**: Modificar verificación de duplicados

**Validación**:
- Probar con archivos duplicados
- Verificar comportamiento esperado

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Pre-implementación:
- [ ] Backup de artifacts en BD
- [ ] Backup de archivos en Storage (opcional, pero recomendado)
- [ ] Documentar estado actual

### FASE 0:
- [ ] Ejecutar script de migración de metadata
- [ ] Verificar que metadata se actualizó correctamente
- [ ] Aplicar FASE 3 (políticas de storage)

### FASE 1:
- [ ] Crear función helper `moveTempToPersistent`
- [ ] Crear tests unitarios
- [ ] Probar función con archivo real

### FASE 2:
- [ ] Crear script de migración
- [ ] Ejecutar en modo dry-run
- [ ] Ejecutar migración real
- [ ] Verificar integridad post-migración

### FASE 3:
- [ ] Modificar `chat/start/route.ts`
- [ ] Modificar `cases/create/route.ts`
- [ ] Modificar `cases/update/route.ts`
- [ ] Probar cada API modificada
- [ ] Verificar frontend funciona

### FASE 4:
- [ ] Crear función de limpieza
- [ ] Ejecutar manualmente primero
- [ ] Programar limpieza automática

### FASE 5:
- [ ] Modificar lógica de deduplicación
- [ ] Probar con archivos duplicados

---

## 📊 MÉTRICAS DE ÉXITO

Después de todas las fases:
- ✅ 0 artifacts apuntando a archivos temporales
- ✅ Todos los archivos persistentes tienen metadata correcta
- ✅ Archivos temporales solo para uploads en progreso
- ✅ Limpieza automática funcionando
- ✅ Frontend funciona correctamente
- ✅ No hay regresiones en funcionalidades existentes

---

**Última actualización**: 2 de Febrero, 2025

