# ✅ GUÍA DE VERIFICACIÓN: MEJORAS EN TABLA `messages`

**Fecha**: 2025-01-08  
**Estado**: Migraciones aplicadas exitosamente  
**Objetivo**: Verificar que todas las mejoras funcionan correctamente sin romper funcionalidades

---

## 📋 RESUMEN DE MIGRACIONES APLICADAS

✅ **Migración 1**: `20250108_add_rls_to_messages.sql` - RLS implementado  
✅ **Migración 2**: `20250108_improve_messages_table.sql` - Constraints y triggers agregados

---

## 🔍 VERIFICACIÓN PASO A PASO

### **PASO 1: Verificación de RLS en Base de Datos**

**Objetivo**: Confirmar que RLS está habilitado y las políticas están creadas.

**Acción**: Ejecutar en Supabase SQL Editor:

```sql
-- Verificar RLS habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS NO HABILITADO'
    END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'messages';
```

**Resultado esperado**:
```
tablename | rls_enabled | estado
----------|-------------|------------------
messages  | true        | ✅ RLS HABILITADO
```

**Si falla**: Revisar logs de migración y ejecutar manualmente:
```sql
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
```

---

### **PASO 2: Verificación de Políticas RLS**

**Objetivo**: Confirmar que las 4 políticas están creadas.

**Acción**: Ejecutar en Supabase SQL Editor:

```sql
-- Verificar políticas RLS
SELECT 
    policyname,
    cmd as operacion,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ SELECT'
        WHEN cmd = 'INSERT' THEN '✅ INSERT'
        WHEN cmd = 'UPDATE' THEN '✅ UPDATE'
        WHEN cmd = 'DELETE' THEN '✅ DELETE'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'messages'
ORDER BY 
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;
```

**Resultado esperado**: Debe mostrar 4 políticas:
```
policyname                          | operacion | estado
------------------------------------|-----------|----------
messages_org_isolation_select      | SELECT   | ✅ SELECT
messages_org_isolation_insert      | INSERT    | ✅ INSERT
messages_org_isolation_update      | UPDATE    | ✅ UPDATE
messages_org_isolation_delete      | DELETE    | ✅ DELETE
```

**Si falla**: Verificar que las políticas se crearon correctamente en la migración.

---

### **PASO 3: Verificación de Constraint de Role**

**Objetivo**: Confirmar que el constraint valida valores de `role`.

**Acción**: Ejecutar en Supabase SQL Editor:

```sql
-- Verificar constraint
SELECT 
    constraint_name,
    constraint_type,
    CASE 
        WHEN constraint_name = 'messages_role_check' THEN '✅ Constraint creado'
        ELSE '⚠️  Constraint diferente'
    END as estado
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
  AND table_name = 'messages'
  AND constraint_name = 'messages_role_check';
```

**Resultado esperado**:
```
constraint_name        | constraint_type | estado
-----------------------|-----------------|------------------
messages_role_check    | CHECK           | ✅ Constraint creado
```

**Prueba adicional**: Intentar insertar con role inválido (debe fallar):

```sql
-- Esto DEBE fallar
INSERT INTO messages (case_id, role, content) 
VALUES ('00000000-0000-0000-0000-000000000000', 'invalid_role', '\x00');
```

**Resultado esperado**: Error de constraint violation.

---

### **PASO 4: Verificación de Trigger updated_at**

**Objetivo**: Confirmar que el trigger actualiza `updated_at` automáticamente.

**Acción**: Ejecutar en Supabase SQL Editor:

```sql
-- Verificar trigger
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    CASE 
        WHEN trigger_name = 'update_messages_updated_at_trigger' THEN '✅ Trigger creado'
        ELSE '⚠️  Trigger diferente'
    END as estado
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'messages'
  AND trigger_name = 'update_messages_updated_at_trigger';
```

**Resultado esperado**:
```
trigger_name                          | event_manipulation | action_timing | estado
--------------------------------------|---------------------|---------------|------------------
update_messages_updated_at_trigger    | UPDATE             | BEFORE        | ✅ Trigger creado
```

---

### **PASO 5: Verificación de Funcionalidad GET `/api/cases/[id]/messages`**

**Objetivo**: Confirmar que la API sigue funcionando correctamente.

**Acción**: 
1. Abrir la aplicación en el navegador
2. Iniciar sesión con un usuario de prueba
3. Navegar a un caso existente que tenga mensajes
4. Verificar que los mensajes se cargan correctamente

**Verificación en consola del navegador**:
- Abrir DevTools (F12)
- Ir a la pestaña Network
- Filtrar por "messages"
- Hacer una petición GET a `/api/cases/[id]/messages`
- Verificar que la respuesta es `200 OK`
- Verificar que los mensajes se muestran en la UI

**Resultado esperado**:
- ✅ Status: 200 OK
- ✅ Mensajes se muestran correctamente
- ✅ No hay errores en consola
- ✅ No hay errores en logs del servidor

**Si falla**: 
- Verificar logs del servidor: `console.log` en `src/app/api/cases/[id]/messages/route.ts`
- Verificar que el caso pertenece a la organización del usuario
- Verificar que RLS no está bloqueando el acceso

---

### **PASO 6: Verificación de Funcionalidad POST `/api/cases/[id]/messages`**

**Objetivo**: Confirmar que crear mensajes sigue funcionando.

**Acción**:
1. En la aplicación, abrir un caso
2. Enviar un mensaje nuevo (si hay interfaz de chat)
3. O usar Postman/Thunder Client para hacer POST a `/api/cases/[id]/messages`

**Request de prueba (Postman/Thunder)**:
```json
POST /api/cases/[CASE_ID]/messages
Headers:
  Cookie: [tu cookie de sesión]

Body:
{
  "role": "user",
  "content": "Mensaje de prueba",
  "metadata": {}
}
```

**Resultado esperado**:
- ✅ Status: 200 OK
- ✅ Response: `{ "success": true, "message": {...}, "duplicate": false }`
- ✅ El mensaje aparece en la UI
- ✅ El mensaje se guarda en la base de datos

**Verificación en BD**:
```sql
-- Verificar que el mensaje se creó
SELECT 
    id,
    case_id,
    role,
    created_at,
    updated_at
FROM messages
WHERE case_id = '[CASE_ID]'
ORDER BY created_at DESC
LIMIT 1;
```

**Si falla**:
- Verificar que el caso pertenece a la organización del usuario
- Verificar que RLS permite INSERT
- Verificar logs del servidor para errores específicos

---

### **PASO 7: Verificación de Funcionalidad POST `/api/chat/process-message`**

**Objetivo**: Confirmar que el chat sigue funcionando.

**Acción**:
1. En la aplicación, ir a la landing page o chat
2. Enviar un mensaje al agente
3. Verificar que se procesa correctamente

**Resultado esperado**:
- ✅ El mensaje del usuario se guarda
- ✅ La respuesta del asistente se guarda
- ✅ Ambos mensajes aparecen en el chat
- ✅ No hay errores en consola

**Verificación en BD**:
```sql
-- Verificar mensajes del chat
SELECT 
    id,
    case_id,
    role,
    created_at
FROM messages
WHERE case_id = '[CASE_ID]'
ORDER BY created_at ASC;
```

**Resultado esperado**: Debe haber al menos 2 mensajes:
- 1 con `role = 'user'`
- 1 con `role = 'assistant'`

**Si falla**:
- Verificar que el caso existe y pertenece a la organización
- Verificar que RLS permite INSERT
- Verificar logs del servidor

---

### **PASO 8: Verificación de Aislamiento Multi-Tenant**

**Objetivo**: Confirmar que usuarios de diferentes organizaciones no pueden ver mensajes de otras.

**Acción**: 
1. Crear/usar Usuario A (Organización A)
2. Crear/usar Usuario B (Organización B)
3. Verificar que cada uno solo ve sus mensajes

**Prueba manual en Supabase SQL Editor**:

**Como Usuario A**:
```sql
-- Simular sesión de Usuario A
SET ROLE authenticated;
SET request.jwt.claim.sub = '[USER_A_UUID]';

-- Intentar ver todos los mensajes
SELECT 
    m.id,
    m.case_id,
    c.org_id,
    m.role
FROM messages m
JOIN cases c ON m.case_id = c.id;
```

**Resultado esperado**: Solo mensajes de casos de Organización A

**Como Usuario B**:
```sql
-- Simular sesión de Usuario B
SET ROLE authenticated;
SET request.jwt.claim.sub = '[USER_B_UUID]';

-- Intentar ver todos los mensajes
SELECT 
    m.id,
    m.case_id,
    c.org_id,
    m.role
FROM messages m
JOIN cases c ON m.case_id = c.id;
```

**Resultado esperado**: Solo mensajes de casos de Organización B (NO debe ver mensajes de Org A)

**Prueba en la aplicación**:
1. Iniciar sesión como Usuario A
2. Verificar que solo ve mensajes de sus casos
3. Cerrar sesión
4. Iniciar sesión como Usuario B
5. Verificar que NO ve mensajes de casos de Usuario A

**Si falla**:
- Verificar que las políticas RLS están correctamente configuradas
- Verificar que `org_members` tiene los registros correctos
- Verificar que `cases.org_id` está correctamente asignado

---

### **PASO 9: Verificación de Integridad de Datos**

**Objetivo**: Confirmar que no hay mensajes huérfanos ni datos corruptos.

**Acción**: Ejecutar en Supabase SQL Editor:

```sql
-- Verificar mensajes huérfanos (case_id que no existe)
SELECT 
    COUNT(*) as mensajes_huerfanos,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No hay mensajes huérfanos'
        ELSE '⚠️  Hay mensajes huérfanos (revisar)'
    END as estado
FROM messages m
LEFT JOIN cases c ON m.case_id = c.id
WHERE c.id IS NULL;

-- Verificar roles inválidos
SELECT 
    COUNT(*) as roles_invalidos,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Todos los roles son válidos'
        ELSE '⚠️  Hay roles inválidos (revisar)'
    END as estado
FROM messages
WHERE role NOT IN ('user', 'assistant', 'system');
```

**Resultado esperado**:
- ✅ `mensajes_huerfanos = 0`
- ✅ `roles_invalidos = 0`

**Si hay problemas**:
- Revisar datos existentes
- Corregir manualmente si es necesario
- Verificar que el constraint de role está funcionando

---

### **PASO 10: Verificación de Performance**

**Objetivo**: Confirmar que los índices están funcionando correctamente.

**Acción**: Ejecutar en Supabase SQL Editor:

```sql
-- Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'messages'
ORDER BY indexname;
```

**Resultado esperado**: Debe haber al menos 3 índices:
- `idx_messages_case_id` (o similar)
- `idx_messages_created_at` (o similar)
- `idx_messages_role` (o similar)

**Prueba de performance**:
```sql
-- Query que debe usar índices
EXPLAIN ANALYZE
SELECT * FROM messages
WHERE case_id = '[CASE_ID]'
ORDER BY created_at ASC;
```

**Resultado esperado**: Debe mostrar uso de índices en el plan de ejecución.

---

## ✅ CHECKLIST FINAL DE VERIFICACIÓN

Marca cada ítem cuando esté verificado:

### **Base de Datos**
- [ ] RLS habilitado en tabla `messages`
- [ ] 4 políticas RLS creadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Constraint `messages_role_check` creado
- [ ] Trigger `update_messages_updated_at_trigger` creado
- [ ] Función `update_messages_updated_at()` creada
- [ ] No hay mensajes huérfanos
- [ ] No hay roles inválidos
- [ ] Índices funcionando correctamente

### **APIs**
- [ ] GET `/api/cases/[id]/messages` funciona correctamente
- [ ] POST `/api/cases/[id]/messages` funciona correctamente
- [ ] POST `/api/chat/process-message` funciona correctamente
- [ ] No hay errores en logs del servidor
- [ ] Respuestas tienen status 200 OK

### **Seguridad Multi-Tenant**
- [ ] Usuario A solo ve mensajes de su organización
- [ ] Usuario B solo ve mensajes de su organización
- [ ] No hay acceso cruzado entre organizaciones
- [ ] RLS bloquea acceso no autorizado

### **Funcionalidades de UI**
- [ ] Mensajes se muestran correctamente en la UI
- [ ] Crear mensajes funciona en la UI
- [ ] Chat funciona correctamente
- [ ] No hay errores en consola del navegador

---

## 🚨 SI ALGO FALLA

### **Error: RLS bloqueando acceso legítimo**

**Solución**:
1. Verificar que el usuario está en `org_members`
2. Verificar que el caso tiene `org_id` correcto
3. Verificar que las políticas RLS están correctamente configuradas

### **Error: Constraint violation al crear mensaje**

**Solución**:
1. Verificar que `role` es uno de: 'user', 'assistant', 'system'
2. Verificar que el constraint está aplicado correctamente

### **Error: API retorna 404 o 403**

**Solución**:
1. Verificar que el caso existe
2. Verificar que el caso pertenece a la organización del usuario
3. Verificar logs del servidor para detalles específicos

### **Error: Mensajes no se muestran**

**Solución**:
1. Verificar que hay mensajes en la BD para ese caso
2. Verificar que RLS no está bloqueando el SELECT
3. Verificar que el cifrado/descifrado funciona correctamente

---

## 📊 RESUMEN DE VERIFICACIÓN

Una vez completados todos los pasos, deberías tener:

✅ **RLS implementado y funcionando**  
✅ **Constraints y triggers funcionando**  
✅ **APIs funcionando correctamente**  
✅ **Aislamiento multi-tenant funcionando**  
✅ **Sin errores en logs**  
✅ **Sin funcionalidades rotas**

---

**Última actualización**: 2025-01-08  
**Estado**: ✅ Migraciones aplicadas - Listo para verificación

