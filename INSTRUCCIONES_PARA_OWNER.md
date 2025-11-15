# 🔐 INSTRUCCIONES PARA EL DUEÑO DEL PROYECTO

## ⏱️ Tiempo estimado: 10-15 minutos

---

## 📋 PASO A PASO

### **PASO 1: Verificar estado actual (2 min)**

1. Ir a: **Supabase Dashboard** → **SQL Editor**
2. Abrir el archivo: `scripts/verify-day2-implementation.sql`
3. **Copiar TODO el contenido** y pegarlo en el SQL Editor
4. Hacer clic en **"Run"**
5. **Tomar captura de pantalla** del resultado

**Resultado esperado:**
```
| politicas_rls                                           | metadata_archivos                             |
| ------------------------------------------------------- | --------------------------------------------- |
| ❌ CRÍTICO: Aplicar políticas RLS por org_id en metadata | ⚠️ RECOMENDADO: Migrar X archivos sin org_id |
```

---

### **PASO 2: Aplicar implementación final (5 min)**

1. **IMPORTANTE**: Asegúrate de estar conectado con un usuario **superuser** o el **dueño del proyecto**
2. Verificar permisos (ejecutar esto primero):

```sql
SELECT 
    current_user as usuario,
    session_user as sesion,
    usesuper as es_superuser
FROM pg_user 
WHERE usename = current_user;
```

**Si `es_superuser = false`**: Necesitas conectarte con otro usuario o cambiar permisos.

3. Abrir el archivo: `scripts/apply-day2-final-implementation.sql`
4. **Copiar TODO el contenido** y pegarlo en el SQL Editor
5. Hacer clic en **"Run"**
6. **Esperar a que termine** (puede tardar 1-2 minutos)

**Resultado esperado:**
```
✅ ===== PASO 1: Eliminando políticas antiguas =====
✅ ===== PASO 2: Creando nuevas políticas RLS =====
✅ ===== PASO 3: Migrando metadata de archivos existentes =====
✅ ===== RESUMEN FINAL =====
   • Políticas RLS aplicadas: 4
   • Archivos migrados: X
```

**Si hay error**: Intenta con `scripts/apply-day2-with-permissions-fix.sql` (tiene `SET LOCAL role postgres;` al inicio)

---

### **PASO 3: Verificar que todo funcionó (2 min)**

1. Ejecutar de nuevo: `scripts/verify-day2-implementation.sql`
2. **Tomar captura de pantalla** del resultado

**Resultado esperado:**
```
| politicas_rls                                    | metadata_archivos              |
| ------------------------------------------------ | ------------------------------ |
| ✅ OK: 4 políticas RLS activas con org_id        | ✅ OK: Todos los archivos OK   |
```

---

### **PASO 4: Prueba funcional (5 min)**

1. Ir a la aplicación web (frontend)
2. **Crear un nuevo caso** o abrir uno existente
3. **Subir un PDF de prueba** (cualquier archivo PDF)
4. **Verificar que se sube correctamente**
5. Ir a: **Supabase Dashboard** → **Storage** → **artifacts**
6. Hacer clic en el archivo recién subido
7. Ver **"Metadata"** y verificar que tiene:
   - ✅ `org_id: [tu-org-id]`
   - ✅ `case_id: [case-id]`
   - ✅ `uploaded_by: [user-id]`

**Si el metadata tiene `org_id`**: ✅ **TODO FUNCIONA CORRECTAMENTE**

---

## 📸 CAPTURAS REQUERIDAS

Por favor, envía estas 3 capturas:
1. ✅ Resultado de verificación ANTES (`verify-day2-implementation.sql`)
2. ✅ Resultado de aplicación (`apply-day2-final-implementation.sql`)
3. ✅ Resultado de verificación DESPUÉS (`verify-day2-implementation.sql`)
4. ✅ Metadata del archivo de prueba en Supabase Storage

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### **Error: "must be owner of relation objects"**

**Causa**: El usuario actual no tiene permisos suficientes.

**Solución**:
1. Verificar qué usuarios tienen permisos:
```sql
SELECT 
    usename as usuario,
    usesuper as es_superuser,
    usebypassrls as bypass_rls
FROM pg_user
WHERE usename IN ('postgres', 'supabase_admin', 'authenticator', 'service_role')
ORDER BY usesuper DESC;
```

2. Si ningún usuario es `superuser`, contactar a **Supabase Support**:
   - Dashboard → Support (icono inferior derecha)
   - Explicar: "Necesito ejecutar políticas RLS en storage.objects pero mi usuario postgres no es superuser"
   - Adjuntar: `scripts/apply-day2-final-implementation.sql`

### **Error: "relation does not exist"**

**Causa**: Alguna tabla no existe en el proyecto.

**Solución**:
1. Verificar que las tablas existan:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('cases', 'artifacts');
```

2. Si faltan tablas, ejecutar primero las migraciones base del proyecto.

---

## ✅ CHECKLIST FINAL

Después de ejecutar todo, verificar:

- [ ] `scripts/verify-day2-implementation.sql` muestra ✅ en todo
- [ ] Subir PDF funciona correctamente
- [ ] Metadata del archivo tiene `org_id`
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en los logs de Supabase

**Si todo está ✅**: ¡Día 2 completado al 100%! 🎉

---

## 📞 CONTACTO

Si tienes problemas o dudas:
- Revisar: `docs/DIA2_IMPLEMENTACION_FINAL.md`
- O contactar al desarrollador que preparó estos scripts

