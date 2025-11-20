# GUÍA DE EJECUCIÓN: FASE 2 - MIGRACIÓN DE ARTIFACTS TEMPORALES

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Migrar los 23 artifacts que apuntan a archivos temporales a rutas persistentes

---

## 📋 PREREQUISITOS

### 1. Variables de entorno
Asegúrate de tener configuradas en `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (requerido para scripts)

### 2. Backup (RECOMENDADO)
Antes de ejecutar la migración real, haz backup de:
- Tabla `artifacts` en la base de datos
- Archivos en Storage bucket `artifacts` (opcional, pero recomendado)

**Backup de artifacts**:
```sql
-- En Supabase Dashboard > SQL Editor
CREATE TABLE artifacts_backup_20250202 AS SELECT * FROM public.artifacts;
```

---

## 🔍 PASO 1: EJECUTAR EN MODO DRY-RUN

**Objetivo**: Simular la migración sin hacer cambios reales

**Comando**:
```bash
cd /home/liones_messi/Documentos/trabajo/Briki
pnpm tsx scripts/migrate-temp-artifacts-to-persistent.ts --dry-run
```

**Qué hace**:
- Identifica todos los artifacts con `file_id LIKE 'temp/%'`
- Simula el movimiento de cada archivo
- Muestra qué rutas se generarían
- **NO modifica** la base de datos ni Storage

**Resultado esperado**:
```
=====================================================
MIGRACIÓN DE ARTIFACTS TEMPORALES A PERSISTENTES
=====================================================

🔍 MODO DRY-RUN: No se realizarán cambios reales

🔌 [Migración] Verificando conexión a base de datos...
✅ [Migración] Conexión establecida

🔍 [Migración] Buscando artifacts con file_id temporal...
✅ [Migración] Encontrados 23 artifacts temporales

📊 [Migración] Total de artifacts a migrar: 23

✅ [Migración] Cliente Supabase creado

[1/23] Procesando artifact...
🔄 [Migración] Procesando artifact abc-123:
   - Archivo: documento.pdf
   - Path temporal: temp/user-id-123/xyz.pdf
   - Caso: case-id-456
   - Organización: org-id-789
   🔍 [DRY-RUN] Simulando movimiento...

... (continúa para cada artifact)

=====================================================
RESUMEN DE MIGRACIÓN
=====================================================
Total procesados: 23
✅ Exitosos: 23
❌ Fallidos: 0
⚠️  Advertencias: 23

🔍 MODO DRY-RUN: No se realizaron cambios reales
   Ejecuta sin --dry-run para aplicar cambios
```

**Si hay errores en dry-run**:
- Revisa los errores reportados
- Verifica que todos los artifacts tengan `orgId` y `fileName`
- Corrige problemas antes de continuar

---

## ✅ PASO 2: EJECUTAR MIGRACIÓN REAL

**⚠️ IMPORTANTE**: Solo ejecuta esto después de verificar el dry-run

**Comando**:
```bash
pnpm tsx scripts/migrate-temp-artifacts-to-persistent.ts
```

**Qué hace**:
- Identifica artifacts temporales
- Para cada artifact:
  1. Descarga el archivo temporal desde Storage
  2. Sube el archivo a ruta persistente `{orgId}/{caseId}/{timestamp}_{fileName}`
  3. Añade metadata correcta (`org_id`, `case_id`, etc.)
  4. Actualiza `file_id` en el artifact
  5. Elimina el archivo temporal original
- Reporta resultados detallados

**Resultado esperado**:
```
=====================================================
MIGRACIÓN DE ARTIFACTS TEMPORALES A PERSISTENTES
=====================================================

⚠️  MODO REAL: Se realizarán cambios en la base de datos y Storage
⚠️  Asegúrate de tener backup antes de continuar

... (proceso de migración)

=====================================================
RESUMEN DE MIGRACIÓN
=====================================================
Total procesados: 23
✅ Exitosos: 23
❌ Fallidos: 0
⚠️  Advertencias: 0

✅ Migración completada

🔍 [Migración] Verificando integridad post-migración...
✅ [Migración] Todos los artifacts fueron migrados exitosamente
```

---

## 🔍 PASO 3: VERIFICACIÓN POST-MIGRACIÓN

### 3.1: Verificar que no quedan artifacts temporales

**Query SQL**:
```sql
SELECT COUNT(*) as artifacts_temp_restantes
FROM public.artifacts
WHERE file_id LIKE 'temp/%';
```

**Resultado esperado**: `artifacts_temp_restantes = 0`

### 3.2: Verificar que los archivos existen en Storage

**Query SQL**:
```sql
-- Contar archivos persistentes con metadata
SELECT 
    COUNT(*) as archivos_persistentes_con_metadata
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND metadata->>'org_id' IS NOT NULL
AND name NOT LIKE 'temp/%';
```

**Resultado esperado**: Debe haber al menos 23 archivos persistentes (los migrados + los 8 que ya existían)

### 3.3: Verificar que los artifacts apuntan a rutas correctas

**Query SQL**:
```sql
-- Verificar que todos los artifacts apuntan a rutas persistentes
SELECT 
    a.id,
    a.file_id,
    a.file_name,
    c.org_id,
    CASE 
        WHEN a.file_id LIKE 'temp/%' THEN '❌ TEMPORAL'
        WHEN a.file_id LIKE c.org_id || '/%' THEN '✅ PERSISTENTE'
        ELSE '⚠️ FORMATO DESCONOCIDO'
    END as estado
FROM public.artifacts a
JOIN public.cases c ON a.case_id = c.id
ORDER BY a.created_at DESC
LIMIT 30;
```

**Resultado esperado**: Todos deben mostrar `✅ PERSISTENTE`

### 3.4: Verificar acceso a archivos desde frontend

**Acción manual**:
1. Abre un caso que tenía artifacts temporales
2. Verifica que los PDFs se muestran correctamente
3. Verifica que los iframes funcionan
4. Verifica que no hay errores 404

**Resultado esperado**: Todos los PDFs deben mostrarse correctamente

---

## ⚠️ TROUBLESHOOTING

### Error: "Missing Supabase environment variables"
**Causa**: Variables de entorno no configuradas  
**Solución**: Verifica que `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Failed to download temp file"
**Causa**: Archivo temporal no existe en Storage  
**Solución**: 
- Verifica que el archivo existe: `SELECT * FROM storage.objects WHERE name = 'temp/...'`
- Si no existe, el artifact está huérfano (puede eliminarse o marcarse como error)

### Error: "Failed to upload to persistent path"
**Causa**: Problema al subir archivo a Storage  
**Solución**:
- Verifica permisos de Storage
- Verifica que la ruta persistente es válida
- Revisa logs del script para más detalles

### Algunos artifacts fallan
**Causa**: Varios posibles (archivo no existe, sin orgId, etc.)  
**Solución**:
- Revisa el resumen de errores del script
- Corrige problemas individuales
- Re-ejecuta solo para artifacts fallidos (si es necesario)

### Archivos temporales no se eliminan
**Causa**: Error al eliminar archivo temporal (no crítico)  
**Solución**: 
- Los archivos temporales se limpiarán automáticamente con FASE 4
- Puedes eliminarlos manualmente después si es necesario

---

## ✅ CRITERIO DE ÉXITO

**FASE 2 está completa cuando**:
- ✅ Dry-run ejecutado sin errores críticos
- ✅ Migración real ejecutada
- ✅ `artifacts_temp_restantes = 0` (verificación SQL)
- ✅ Todos los archivos persistentes tienen metadata correcta
- ✅ Frontend muestra PDFs correctamente
- ✅ No hay regresiones en funcionalidades existentes

---

## 📊 PRÓXIMOS PASOS

Después de completar FASE 2:
- **FASE 3**: Modificar APIs para mover archivos automáticamente en nuevos uploads
- **FASE 4**: Implementar limpieza automática de archivos temporales huérfanos
- **FASE 5**: Implementar deduplicación global (opcional)

---

**Última actualización**: 2 de Febrero, 2025

