# PROGRAMAR CRON JOB PARA FASE 4

**Estado**: pg_cron habilitado ✅  
**Siguiente paso**: Programar el job para ejecución automática

---

## 📋 COMANDO PARA PROGRAMAR EL JOB

Ejecuta este comando en Supabase Dashboard > SQL Editor:

```sql
SELECT cron.schedule(
    'cleanup-orphan-temp-files',
    '0 */6 * * *',
    'SELECT public.cleanup_orphan_temp_files();'
);
```

**Resultado esperado**: Debe retornar el `jobid` del job creado.

---

## ✅ VERIFICAR QUE EL JOB FUE CREADO

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

## 🔍 VERIFICAR EJECUCIONES DEL JOB

Después de que el job se ejecute (máximo 6 horas), puedes verificar las ejecuciones:

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
- `status` = `succeeded`
- `return_message` muestra archivos eliminados (si los hay)
- `start_time` y `end_time` muestran cuándo se ejecutó

---

## ⚙️ GESTIÓN DEL JOB

### Ver todos los jobs programados:
```sql
SELECT * FROM cron.job;
```

### Desactivar el job (sin eliminarlo):
```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'cleanup-orphan-temp-files';
```

### Reactivar el job:
```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'cleanup-orphan-temp-files';
```

### Eliminar el job completamente:
```sql
SELECT cron.unschedule('cleanup-orphan-temp-files');
```

### Cambiar frecuencia (ejemplo: cada 4 horas):
```sql
-- 1. Eliminar job existente
SELECT cron.unschedule('cleanup-orphan-temp-files');

-- 2. Crear nuevo job con frecuencia diferente
SELECT cron.schedule(
    'cleanup-orphan-temp-files',
    '0 */4 * * *',  -- Cada 4 horas
    'SELECT public.cleanup_orphan_temp_files();'
);
```

---

## 📊 MONITOREO

### Ver cuántos archivos huérfanos hay actualmente:
```sql
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

---

## ✅ CRITERIO DE ÉXITO

**FASE 4 está completamente operativa cuando**:
- ✅ pg_cron habilitado
- ✅ Job programado correctamente
- ✅ Job activo (`active = true`)
- ✅ Función `cleanup_orphan_temp_files()` existe y funciona
- ✅ El job se ejecuta automáticamente cada 6 horas

---

**Última actualización**: 2 de Febrero, 2025

