# GUÍA DE EJECUCIÓN: FASE 0 - MIGRACIÓN DE METADATA

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Migrar metadata de 8 archivos persistentes sin `org_id`  
**Tiempo estimado**: 5-10 minutos  
**Riesgo**: BAJO (solo modifica metadata, no afecta código)

---

## 📋 PASOS DE EJECUCIÓN

### Paso 1: Verificación Pre-Migración

**Abrir**: Supabase Dashboard → SQL Editor

**Ejecutar esta query**:
```sql
-- Verificar cuántos archivos se migrarán
SELECT 
    COUNT(*) as archivos_a_migrar
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%';
```

**Resultado esperado**: `archivos_a_migrar = 8`

**Si el resultado es diferente**: Reportar antes de continuar.

---

### Paso 2: Listar archivos a migrar (opcional, pero recomendado)

**Ejecutar esta query**:
```sql
-- Listar los archivos que se migrarán
SELECT 
    name as file_path,
    split_part(name, '/', 1) as org_id_del_path,
    split_part(name, '/', 2) as case_id_del_path,
    created_at
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%'
ORDER BY created_at DESC;
```

**Propósito**: Verificar que los paths son válidos (UUIDs en formato correcto)

**Validar**:
- `org_id_del_path` debe ser un UUID válido (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- `case_id_del_path` debe ser un UUID válido

---

### Paso 3: Ejecutar script de migración

**Abrir**: Supabase Dashboard → SQL Editor

**Copiar y ejecutar** el contenido completo de:
`supabase/migrations/20250202_update_existing_storage_metadata.sql`

**El script incluye**:
1. Query de verificación pre-migración (ya ejecutada en Paso 1)
2. Script DO $$ que actualiza metadata
3. Query de verificación post-migración

**Resultado esperado en logs**:
```
NOTICE: ✅ Archivo actualizado: {orgId}/{caseId}/... (org_id: {orgId})
...
NOTICE: ✅ Migración completada:
NOTICE:    - Archivos actualizados: 8
NOTICE:    - Archivos omitidos (path inválido): 0
```

**Si hay archivos omitidos**: Reportar para análisis.

---

### Paso 4: Verificación Post-Migración

**Ejecutar esta query**:
```sql
-- Verificar que todos los archivos ahora tienen org_id en metadata
SELECT 
    COUNT(*) FILTER (
        WHERE metadata->>'org_id' IS NOT NULL 
        AND metadata->>'org_id' != '' 
        AND name NOT LIKE 'temp/%'
    ) as con_metadata_despues,
    COUNT(*) FILTER (
        WHERE (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '') 
        AND name NOT LIKE 'temp/%'
    ) as sin_metadata_despues
FROM storage.objects
WHERE bucket_id = 'artifacts';
```

**Resultado esperado**:
- `con_metadata_despues = 8` (o más si había otros archivos con metadata)
- `sin_metadata_despues = 0`

**Si `sin_metadata_despues > 0`**: Reportar para análisis.

---

### Paso 5: Verificación detallada (opcional)

**Ejecutar esta query**:
```sql
-- Verificar metadata de los archivos migrados
SELECT 
    name as file_path,
    metadata->>'org_id' as org_id_metadata,
    metadata->>'case_id' as case_id_metadata,
    metadata->>'migrated_at' as migrated_at,
    split_part(name, '/', 1) as org_id_del_path,
    CASE 
        WHEN metadata->>'org_id' = split_part(name, '/', 1) THEN '✅ CORRECTO'
        ELSE '❌ INCORRECTO'
    END as validacion
FROM storage.objects
WHERE bucket_id = 'artifacts'
AND name NOT LIKE 'temp/%'
AND metadata->>'migrated_at' IS NOT NULL
ORDER BY metadata->>'migrated_at' DESC;
```

**Validar**:
- Todos los archivos deben mostrar `✅ CORRECTO`
- `org_id_metadata` debe coincidir con `org_id_del_path`

---

## ✅ CRITERIOS DE ÉXITO

- [ ] Query pre-migración muestra 8 archivos
- [ ] Script ejecuta sin errores
- [ ] Logs muestran "Archivos actualizados: 8"
- [ ] Query post-migración muestra `sin_metadata_despues = 0`
- [ ] Verificación detallada muestra todos `✅ CORRECTO`

---

## ⚠️ SI ALGO SALE MAL

### Error: "permission denied"
- **Causa**: Permisos insuficientes
- **Solución**: Ejecutar desde Supabase Dashboard con cuenta admin, o contactar Support

### Error: "archivos omitidos > 0"
- **Causa**: Paths no tienen formato UUID válido
- **Solución**: Revisar paths manualmente y reportar

### Error: "sin_metadata_despues > 0"
- **Causa**: Algunos archivos no se migraron
- **Solución**: Revisar logs y ejecutar migración manual para archivos específicos

---

## 📊 REPORTE POST-EJECUCIÓN

Después de ejecutar, reportar:
1. Resultado de query pre-migración
2. Resultado de logs del script
3. Resultado de query post-migración
4. Cualquier error o advertencia

---

**Última actualización**: 2 de Febrero, 2025

