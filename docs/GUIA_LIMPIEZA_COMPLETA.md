# GUÍA: LIMPIEZA COMPLETA Y PREPARACIÓN PARA FASE 3

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Limpiar completamente cases, artifacts y Storage para empezar de cero con FASE 3

---

## ⚠️ ADVERTENCIAS IMPORTANTES

1. **Este proceso es IRREVERSIBLE** - No se puede deshacer fácilmente
2. **Solo para desarrollo/testing** - NO ejecutar en producción sin backup
3. **Elimina TODOS los datos** - Cases, artifacts, messages, archivos en Storage
4. **Haz backup antes** (si tienes datos importantes)

---

## 📋 PASOS PARA LIMPIEZA COMPLETA

### Paso 1: Abrir Supabase Dashboard

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Crea una nueva query

### Paso 2: Ejecutar Script de Limpieza

Copia y pega el contenido de `scripts/limpiar-todo-y-empezar-de-cero.sql` en el SQL Editor.

**O ejecuta estos comandos manualmente:**

#### 2.1: Verificar estado actual (opcional)
```sql
SELECT 
    'Cases' as tabla,
    COUNT(*) as total
FROM public.cases
UNION ALL
SELECT 
    'Artifacts' as tabla,
    COUNT(*) as total
FROM public.artifacts
UNION ALL
SELECT 
    'Archivos en Storage' as tabla,
    COUNT(*) as total
FROM storage.objects
WHERE bucket_id = 'artifacts';
```

#### 2.2: Eliminar archivos de Storage
```sql
-- Eliminar archivos temporales
DELETE FROM storage.objects 
WHERE bucket_id = 'artifacts' 
AND name LIKE 'temp/%';

-- Eliminar archivos persistentes sin metadata
DELETE FROM storage.objects 
WHERE bucket_id = 'artifacts' 
AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
AND name NOT LIKE 'temp/%';

-- OPCIONAL: Eliminar TODOS los archivos (si quieres empezar 100% limpio)
-- DELETE FROM storage.objects WHERE bucket_id = 'artifacts';
```

#### 2.3: Eliminar todos los cases
```sql
-- Esto eliminará automáticamente (CASCADE):
-- - Todos los artifacts
-- - Todos los messages
-- - Todos los audit_logs relacionados

DELETE FROM public.cases;
```

#### 2.4: Verificar limpieza
```sql
-- Verificar que no quedan datos
SELECT 
    'Cases' as tabla,
    COUNT(*) as total
FROM public.cases
UNION ALL
SELECT 
    'Artifacts' as tabla,
    COUNT(*) as total
FROM public.artifacts
UNION ALL
SELECT 
    'Messages' as tabla,
    COUNT(*) as total
FROM public.messages
UNION ALL
SELECT 
    'Archivos en Storage' as tabla,
    COUNT(*) as total
FROM storage.objects
WHERE bucket_id = 'artifacts';
```

**Resultado esperado**: Todos los totales deben ser `0`

---

## ✅ VERIFICACIÓN POST-LIMPIEZA

### Query de verificación completa:
```sql
SELECT 
    'Cases' as tabla,
    COUNT(*) as total,
    CASE WHEN COUNT(*) = 0 THEN '✅ LIMPIO' ELSE '❌ QUEDAN DATOS' END as estado
FROM public.cases
UNION ALL
SELECT 
    'Artifacts' as tabla,
    COUNT(*) as total,
    CASE WHEN COUNT(*) = 0 THEN '✅ LIMPIO' ELSE '❌ QUEDAN DATOS' END as estado
FROM public.artifacts
UNION ALL
SELECT 
    'Messages' as tabla,
    COUNT(*) as total,
    CASE WHEN COUNT(*) = 0 THEN '✅ LIMPIO' ELSE '❌ QUEDAN DATOS' END as estado
FROM public.messages
UNION ALL
SELECT 
    'Archivos en Storage' as tabla,
    COUNT(*) as total,
    CASE WHEN COUNT(*) = 0 THEN '✅ LIMPIO' ELSE '⚠️ QUEDAN ARCHIVOS' END as estado
FROM storage.objects
WHERE bucket_id = 'artifacts';
```

**Si todos muestran `✅ LIMPIO`**: La limpieza fue exitosa, puedes continuar con FASE 3.

**Si quedan datos**: Revisa qué tablas tienen datos y elimínalos manualmente.

---

## 🚀 PREPARACIÓN PARA FASE 3

Una vez que todo esté limpio:

1. ✅ **FASE 0**: Ya no necesaria (no hay archivos antiguos)
2. ✅ **FASE 1**: Ya completada (función helper `moveTempToPersistent()`)
3. ⏭️ **FASE 2**: Saltada (no hay artifacts que migrar)
4. 🎯 **FASE 3**: **SIGUIENTE PASO** - Modificar APIs para mover archivos automáticamente

---

## 📝 NOTAS IMPORTANTES

### Lo que NO se elimina:
- ✅ `organizations` - Las organizaciones se mantienen
- ✅ `users` y `profiles` - Los usuarios se mantienen
- ✅ `clients` - Los clientes se mantienen (si los hay)
- ✅ `org_members` - Las membresías se mantienen

### Lo que SÍ se elimina:
- ❌ `cases` - Todos los casos
- ❌ `artifacts` - Todos los artifacts (por CASCADE)
- ❌ `messages` - Todos los mensajes (por CASCADE)
- ❌ `audit_logs` - Todos los logs relacionados (por CASCADE)
- ❌ Archivos en Storage - Todos los archivos del bucket `artifacts`

---

## ⚠️ TROUBLESHOOTING

### Error: "permission denied for table storage.objects"
**Causa**: No tienes permisos para modificar Storage desde SQL  
**Solución**: 
- Usa el Supabase Dashboard > Storage > artifacts bucket
- Elimina archivos manualmente desde la UI
- O contacta a un admin para ejecutar el script

### Quedan algunos artifacts después de borrar cases
**Causa**: Posiblemente hay artifacts con `case_id` NULL o inválido  
**Solución**:
```sql
-- Eliminar artifacts huérfanos
DELETE FROM public.artifacts 
WHERE case_id NOT IN (SELECT id FROM public.cases);
```

### Quedan archivos en Storage después de ejecutar DELETE
**Causa**: Los archivos pueden estar en proceso de eliminación  
**Solución**: Espera unos minutos y verifica de nuevo, o elimínalos manualmente desde Storage UI

---

## ✅ CRITERIO DE ÉXITO

**Limpieza completa cuando**:
- ✅ `SELECT COUNT(*) FROM public.cases` = 0
- ✅ `SELECT COUNT(*) FROM public.artifacts` = 0
- ✅ `SELECT COUNT(*) FROM public.messages` = 0
- ✅ `SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'artifacts'` = 0

**Una vez verificado, puedes continuar con FASE 3** 🚀

---

**Última actualización**: 2 de Febrero, 2025

