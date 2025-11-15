# 🚀 QUICK REFERENCE - DÍA 2

> Guía rápida de consulta para después de la implementación

---

## ⚡ COMANDOS SQL ÚTILES

### Verificar estado RLS
```sql
-- Ver todas las políticas en storage.objects
SELECT 
    schemaname, tablename, policyname, 
    permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;
```

### Verificar metadata de archivos
```sql
-- Archivos sin org_id (debería ser 0 después de migración)
SELECT COUNT(*) as sin_org_id
FROM storage.objects 
WHERE bucket_id = 'artifacts'
  AND (metadata->>'org_id') IS NULL;

-- Archivos con metadata completo
SELECT 
    name,
    metadata->>'org_id' as org_id,
    metadata->>'case_id' as case_id,
    metadata->>'uploaded_by' as uploaded_by,
    created_at
FROM storage.objects 
WHERE bucket_id = 'artifacts'
  AND (metadata->>'org_id') IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Verificar tabla artifacts
```sql
-- Total de artifacts por source_type
SELECT 
    source_type, 
    COUNT(*) as total
FROM artifacts
GROUP BY source_type;

-- Últimos 10 artifacts con provenance
SELECT 
    id,
    source_type,
    provenance->>'uploadedBy' as uploaded_by,
    provenance->>'originalName' as original_name,
    created_at
FROM artifacts
ORDER BY created_at DESC
LIMIT 10;
```

### Auditoría por organización
```sql
-- Total de archivos por org
SELECT 
    metadata->>'org_id' as org_id,
    COUNT(*) as total_archivos
FROM storage.objects 
WHERE bucket_id = 'artifacts'
GROUP BY metadata->>'org_id'
ORDER BY total_archivos DESC;

-- Archivos recientes de una org específica
SELECT 
    name,
    metadata->>'case_id' as case_id,
    metadata->>'uploaded_by' as uploaded_by,
    created_at
FROM storage.objects 
WHERE bucket_id = 'artifacts'
  AND (metadata->>'org_id') = 'TU_ORG_ID_AQUI'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🔍 TROUBLESHOOTING RÁPIDO

### ❌ "Error 403 al subir PDF"
**Causa:** RLS bloqueando upload  
**Solución:**
1. Verificar que `get_user_org_id()` retorna org_id correcto
2. Verificar que metadata incluye org_id del usuario
3. Ejecutar:
```sql
SELECT auth.uid(), get_user_org_id();
```

### ❌ "Archivo no aparece en lista"
**Causa:** No se registró en tabla artifacts  
**Solución:**
1. Verificar en Storage si el archivo existe
2. Verificar tabla artifacts:
```sql
SELECT * FROM artifacts WHERE file_id LIKE '%nombre_archivo%';
```
3. Si archivo existe en Storage pero no en artifacts → problema en el código de registro

### ❌ "Usuario ve archivos de otra org"
**Causa:** RLS no funciona o metadata incorrecto  
**Solución:**
1. Verificar políticas RLS:
```sql
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE 'org_%';
-- Debe retornar: 4
```
2. Verificar metadata del archivo:
```sql
SELECT name, metadata->>'org_id' 
FROM storage.objects 
WHERE name = 'RUTA_DEL_ARCHIVO';
```
3. Si metadata->>'org_id' es NULL → Re-ejecutar migración

### ❌ "Error al eliminar archivo"
**Causa:** Usuario no es admin/owner o archivo de otra org  
**Solución:**
1. Verificar rol del usuario:
```sql
SELECT auth.role();
-- Debe retornar: 'admin' o 'owner'
```
2. Verificar org_id del archivo vs usuario
3. Si es admin y es su org → problema en política DELETE

---

## 📊 MÉTRICAS A MONITOREAR

### KPIs de seguridad
```sql
-- ✅ Cobertura de metadata (debe ser 100%)
SELECT 
    ROUND(
        (COUNT(*) FILTER (WHERE (metadata->>'org_id') IS NOT NULL)::NUMERIC / 
         COUNT(*)::NUMERIC) * 100, 
        2
    ) as porcentaje_con_org_id
FROM storage.objects 
WHERE bucket_id = 'artifacts';

-- ✅ Políticas RLS activas (debe ser 4)
SELECT COUNT(*) as politicas_activas 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE 'org_%';

-- ✅ Consistencia artifacts vs storage
SELECT 
    (SELECT COUNT(*) FROM artifacts WHERE source_type = 'pdf') as en_tabla,
    (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'artifacts') as en_storage;
-- Nota: puede haber más en storage si hay archivos temporales
```

### KPIs operacionales
```sql
-- Uploads por día (últimos 7 días)
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as uploads
FROM artifacts
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- Top 5 usuarios que más suben archivos
SELECT 
    provenance->>'uploadedBy' as usuario,
    COUNT(*) as total_uploads
FROM artifacts
GROUP BY provenance->>'uploadedBy'
ORDER BY total_uploads DESC
LIMIT 5;

-- Tamaño promedio de archivos por org
SELECT 
    metadata->>'org_id' as org_id,
    ROUND(AVG((metadata->>'size')::BIGINT) / 1024.0 / 1024.0, 2) as avg_size_mb
FROM storage.objects 
WHERE bucket_id = 'artifacts'
  AND (metadata->>'size') IS NOT NULL
GROUP BY metadata->>'org_id';
```

---

## 🔄 ROLLBACK (En caso de emergencia)

### Si necesitas revertir las políticas RLS

```sql
-- PASO 1: Eliminar políticas nuevas
DROP POLICY IF EXISTS org_select_own_artifacts ON storage.objects;
DROP POLICY IF EXISTS org_insert_own_artifacts ON storage.objects;
DROP POLICY IF EXISTS org_update_own_artifacts ON storage.objects;
DROP POLICY IF EXISTS org_delete_own_artifacts ON storage.objects;

-- PASO 2: Restaurar políticas básicas (más permisivas)
CREATE POLICY authenticated_select_artifacts ON storage.objects
    FOR SELECT TO authenticated
    USING ((storage.foldername(name))[1] = 'artifacts');

CREATE POLICY authenticated_insert_artifacts ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK ((storage.foldername(name))[1] = 'artifacts');

-- ADVERTENCIA: Esto deja el sistema SIN seguridad multi-tenant
-- Solo usar en emergencia y re-aplicar políticas correctas ASAP
```

---

## 📞 CONTACTOS DE EMERGENCIA

### Supabase Support
- **Dashboard:** https://supabase.com/dashboard/support/new
- **Docs:** https://supabase.com/docs/guides/storage/security/access-control
- **Discord:** https://discord.supabase.com

### Documentación del proyecto
- `GUIA_COMPLETA_DIA2.md` - Guía completa
- `docs/DIA2_IMPLEMENTACION_FINAL.md` - Documentación técnica
- `INSTRUCCIONES_PARA_OWNER.md` - Para el owner del proyecto

---

## 🎯 CHECKLIST POST-IMPLEMENTACIÓN

### Primera semana
- [ ] Monitorear logs de errores 403/404 en Storage
- [ ] Verificar que no hay accesos cross-org en audit logs
- [ ] Confirmar que todos los uploads nuevos tienen metadata
- [ ] Revisar métricas de KPIs diariamente

### Primer mes
- [ ] Análisis de rendimiento de queries con RLS
- [ ] Optimización de índices si es necesario
- [ ] Documentar casos edge encontrados
- [ ] Capacitar equipo en nuevo flujo

### Mantenimiento continuo
- [ ] Backup semanal de tabla artifacts
- [ ] Revisión mensual de políticas RLS
- [ ] Auditoría trimestral de metadata
- [ ] Actualizar documentación con aprendizajes

---

## 💡 TIPS Y BEST PRACTICES

### ✅ DOs
- ✅ Siempre verificar org_id antes de operaciones en Storage
- ✅ Usar `get_user_org_id()` en lugar de hardcodear org_ids
- ✅ Registrar TODOS los uploads en tabla artifacts
- ✅ Incluir provenance completo para auditoría
- ✅ Testear RLS con usuarios de diferentes orgs
- ✅ Monitorear logs de Supabase regularmente

### ❌ DON'Ts
- ❌ NUNCA hacer queries directas a storage.objects sin filtro org_id
- ❌ NO usar service_role key en frontend (solo backend)
- ❌ NO omitir metadata al subir archivos
- ❌ NO asumir que RLS filtrará todo automáticamente en service_role
- ❌ NO eliminar políticas RLS sin entender impacto
- ❌ NO ignorar warnings de metadata faltante

---

## 🔧 COMANDOS ÚTILES DE DESARROLLO

### Local Development
```bash
# Verificar estructura de tablas
npx prisma db pull

# Ver schema actual
npx prisma studio

# Ver logs de Supabase
# (en Dashboard → Logs → Postgres Logs)
```

### Debugging
```sql
-- Ver último error de RLS
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%storage.objects%' 
ORDER BY last_exec DESC 
LIMIT 10;

-- Ver sesión actual
SELECT 
    current_user,
    session_user,
    auth.uid() as user_id,
    get_user_org_id() as org_id;

-- Probar política manualmente
SELECT * FROM storage.objects 
WHERE bucket_id = 'artifacts' 
  AND (storage.foldername(name))[1] = 'artifacts'
  AND (metadata->>'org_id') = get_user_org_id()
LIMIT 5;
```

---

## 📈 ROADMAP FUTURO (Post Día 2)

### Mejoras inmediatas
- [ ] Agregar índices en artifacts.case_id para performance
- [ ] Implementar soft delete en lugar de hard delete
- [ ] Agregar audit_logs para tracking completo
- [ ] Implementar rate limiting en uploads

### Mejoras a mediano plazo
- [ ] Versioning de archivos (v1, v2, etc.)
- [ ] Compresión automática de PDFs grandes
- [ ] OCR para PDFs escaneados
- [ ] Preview/thumbnails de PDFs

### Mejoras a largo plazo
- [ ] CDN para archivos estáticos
- [ ] Multi-región storage
- [ ] Lifecycle policies (archivar después de X días)
- [ ] Encryption at rest custom

---

**Última actualización:** Noviembre 2025  
**Versión:** 1.0.0  
**Mantenido por:** Equipo de desarrollo Briki

