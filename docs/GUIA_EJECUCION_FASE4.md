# GUÍA DE EJECUCIÓN: FASE 4 - LIMPIEZA AUTOMÁTICA DE ARCHIVOS TEMPORALES

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Implementar limpieza automática de archivos temporales huérfanos cada 6 horas

---

## ⚠️ SEGURIDAD Y GARANTÍAS

### ✅ Lo que SÍ elimina:
- Archivos en `temp/{userId}/...` 
- **SIN** artifact asociado en BD
- Con más de **24 horas** de antigüedad

### ❌ Lo que NO elimina:
- Archivos asociados a artifacts (aunque estén en `temp/`)
- Archivos persistentes `{orgId}/{caseId}/...`
- Archivos temporales con menos de 24 horas
- Casos existentes o sus datos

### 🛡️ Garantías:
- **NO afecta casos existentes** - Solo elimina archivos huérfanos
- **NO afecta archivos en uso** - Solo elimina sin artifact
- **Validaciones exhaustivas** - Verifica antes de eliminar
- **Manejo robusto de errores** - Continúa aunque algunos archivos fallen

---

## 📋 PASOS PARA IMPLEMENTAR

### Paso 1: Ejecutar migración SQL

1. Abre **Supabase Dashboard** > **SQL Editor**
2. Copia y pega el contenido de `supabase/migrations/20250202_cleanup_orphan_temp_files.sql`
3. Ejecuta el script

**Resultado esperado**:
- Función `cleanup_orphan_temp_files()` creada
- Función `verify_orphan_temp_files()` creada
- Job pg_cron programado (si está disponible) o mensaje de advertencia

---

### Paso 2: Verificar que pg_cron está disponible

**Query**:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Si existe**: pg_cron está habilitado, el job se programó automáticamente ✅

**Si no existe**: pg_cron no está disponible. Opciones:
1. Contactar a Supabase Support para habilitarlo
2. Ejecutar la función manualmente cuando sea necesario
3. Usar un servicio externo (Vercel Cron, GitHub Actions, etc.) para llamar a la función

---

### Paso 3: Verificar archivos que serían eliminados (DRY-RUN)

**Query**:
```sql
SELECT * FROM public.verify_orphan_temp_files();
```

**Qué muestra**:
- `file_path`: Ruta del archivo
- `created_at`: Fecha de creación
- `age_hours`: Edad en horas
- `has_artifact`: Si tiene artifact asociado (debe ser `false` para ser eliminado)
- `file_size`: Tamaño del archivo

**Resultado esperado**: Solo archivos sin artifact y > 24 horas

---

### Paso 4: Ejecutar limpieza manualmente (PRIMERA VEZ)

**Query**:
```sql
SELECT * FROM public.cleanup_orphan_temp_files();
```

**Qué retorna**:
- `deleted_count`: Número de archivos eliminados
- `deleted_size`: Tamaño total eliminado (bytes)
- `deleted_files`: Array con rutas de archivos eliminados

**Resultado esperado**: 
- `deleted_count` > 0 si hay archivos huérfanos
- Verificar que solo se eliminaron archivos sin artifact

---

### Paso 5: Verificar que el job está programado

**Query**:
```sql
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job 
WHERE jobname = 'cleanup-orphan-temp-files';
```

**Resultado esperado**:
- `schedule` = `0 */6 * * *` (cada 6 horas)
- `active` = `true`
- `command` contiene la llamada a la función

---

## 🔍 VERIFICACIÓN POST-IMPLEMENTACIÓN

### Verificar que la función existe:
```sql
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('cleanup_orphan_temp_files', 'verify_orphan_temp_files')
AND routine_schema = 'public';
```

**Resultado esperado**: Ambas funciones deben existir

---

### Verificar ejecuciones del job (si pg_cron está disponible):
```sql
SELECT 
    runid,
    jobid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details 
WHERE jobid = (
    SELECT jobid FROM cron.job WHERE jobname = 'cleanup-orphan-temp-files'
)
ORDER BY start_time DESC
LIMIT 10;
```

**Resultado esperado**: 
- Ejecuciones cada 6 horas
- `status` = `succeeded`
- `return_message` muestra archivos eliminados

---

### Verificar que no quedan archivos huérfanos antiguos:
```sql
SELECT 
    COUNT(*) as archivos_huérfanos_antiguos
FROM storage.objects o
WHERE o.bucket_id = 'artifacts'
AND o.name LIKE 'temp/%'
AND o.created_at < NOW() - INTERVAL '24 hours'
AND NOT EXISTS(
    SELECT 1 
    FROM public.artifacts a 
    WHERE a.file_id = o.name
);
```

**Resultado esperado**: `0` (o muy bajo después de la primera limpieza)

---

## ⚙️ CONFIGURACIÓN AVANZADA

### Cambiar frecuencia de ejecución

**Actual**: Cada 6 horas (`0 */6 * * *`)

**Opciones**:
- Cada hora: `0 * * * *`
- Cada 12 horas: `0 */12 * * *`
- Diario a las 3 AM: `0 3 * * *`
- Cada 4 horas: `0 */4 * * *`

**Para cambiar**:
```sql
-- 1. Eliminar job existente
SELECT cron.unschedule('cleanup-orphan-temp-files');

-- 2. Crear nuevo job con frecuencia diferente
SELECT cron.schedule(
    'cleanup-orphan-temp-files',
    '0 */4 * * *',  -- Cada 4 horas (ejemplo)
    $$SELECT public.cleanup_orphan_temp_files()$$
);
```

---

### Cambiar tiempo mínimo de antigüedad

**Actual**: 24 horas

**Para cambiar** (ejemplo: 12 horas):
```sql
-- Modificar la función (cambiar INTERVAL '24 hours' a INTERVAL '12 hours')
-- Ver archivo: supabase/migrations/20250202_cleanup_orphan_temp_files.sql
-- Línea: AND created_at < NOW() - INTERVAL '24 hours'
```

---

## 🧪 TESTING

### Test 1: Verificar que no elimina archivos con artifact

1. Crear un caso con PDF
2. Verificar que el artifact existe:
   ```sql
   SELECT file_id FROM public.artifacts WHERE file_id LIKE 'temp/%' LIMIT 1;
   ```
3. Ejecutar limpieza:
   ```sql
   SELECT * FROM public.cleanup_orphan_temp_files();
   ```
4. Verificar que el archivo NO fue eliminado:
   ```sql
   SELECT COUNT(*) FROM storage.objects WHERE name = '<file_id_del_paso_2>';
   ```
5. **Resultado esperado**: `1` (archivo sigue existiendo)

---

### Test 2: Verificar que elimina archivos huérfanos

1. Subir un PDF pero NO crear caso (simular archivo huérfano)
2. Esperar > 24 horas (o modificar `created_at` en BD para testing)
3. Verificar que el archivo es huérfano:
   ```sql
   SELECT * FROM public.verify_orphan_temp_files() WHERE file_path = '<ruta_del_archivo>';
   ```
4. Ejecutar limpieza:
   ```sql
   SELECT * FROM public.cleanup_orphan_temp_files();
   ```
5. Verificar que el archivo fue eliminado:
   ```sql
   SELECT COUNT(*) FROM storage.objects WHERE name = '<ruta_del_archivo>';
   ```
6. **Resultado esperado**: `0` (archivo eliminado)

---

## ⚠️ TROUBLESHOOTING

### Error: "extension pg_cron does not exist"
**Causa**: pg_cron no está habilitado en Supabase  
**Solución**: 
- Contactar a Supabase Support para habilitarlo
- O ejecutar la función manualmente cuando sea necesario

### Error: "permission denied for table storage.objects"
**Causa**: No tienes permisos para modificar Storage desde SQL  
**Solución**: 
- Verificar que la función tiene `SECURITY DEFINER`
- Contactar a un admin si persiste

### El job no se ejecuta automáticamente
**Causa**: pg_cron no está disponible o el job no está activo  
**Solución**:
1. Verificar que pg_cron está habilitado
2. Verificar que el job está activo: `SELECT active FROM cron.job WHERE jobname = 'cleanup-orphan-temp-files';`
3. Si no está activo, activarlo: `UPDATE cron.job SET active = true WHERE jobname = 'cleanup-orphan-temp-files';`

### Se eliminan archivos que deberían mantenerse
**Causa**: Bug en la función (muy improbable)  
**Solución**:
1. Revisar logs: `SELECT * FROM cron.job_run_details WHERE jobid = ... ORDER BY start_time DESC;`
2. Verificar que los archivos realmente no tienen artifact
3. Reportar el bug inmediatamente

---

## ✅ CRITERIO DE ÉXITO

**FASE 4 está completa cuando**:
- ✅ Función `cleanup_orphan_temp_files()` creada y funciona
- ✅ Función `verify_orphan_temp_files()` creada
- ✅ Job pg_cron programado (o función puede ejecutarse manualmente)
- ✅ Limpieza manual ejecutada exitosamente
- ✅ No se eliminan archivos con artifact asociado
- ✅ Se eliminan archivos huérfanos correctamente

---

## 📊 MONITOREO RECOMENDADO

### Query para monitorear limpieza:
```sql
-- Archivos huérfanos actuales
SELECT 
    COUNT(*) as archivos_huérfanos,
    SUM((metadata->>'size')::BIGINT) as tamaño_total_bytes
FROM storage.objects o
WHERE o.bucket_id = 'artifacts'
AND o.name LIKE 'temp/%'
AND o.created_at < NOW() - INTERVAL '24 hours'
AND NOT EXISTS(
    SELECT 1 FROM public.artifacts a WHERE a.file_id = o.name
);
```

**Ejecutar periódicamente** para verificar que la limpieza está funcionando.

---

**Última actualización**: 2 de Febrero, 2025

