# GUÍA DE TESTING FUNCIONAL COMPLETA - VALIDACIÓN POST-IMPLEMENTACIÓN

**Fecha**: 31 de Enero, 2025  
**Objetivo**: Verificar que todas las funcionalidades funcionan correctamente después de la implementación de encriptación  
**Prioridad**: 🔴 CRÍTICA - Validar que no se rompió ninguna funcionalidad existente

---

## 📋 CHECKLIST DE VALIDACIÓN FUNCIONAL

### **PASO 1: VALIDAR ACCESO A CLIENTES**

#### **1.1. Verificar Lista de Clientes**

**Ruta**: `/workspace/clients` o desde el workspace principal

**Pasos**:
1. [ ] Acceder a la página de clientes
2. [ ] Verificar que la lista de clientes se carga correctamente
3. [ ] Verificar que los nombres de clientes se muestran correctamente (desencriptados)
4. [ ] Verificar que no hay errores en la consola del navegador
5. [ ] Verificar que no hay errores en los logs del servidor

**Resultado Esperado**: ✅ Lista de clientes visible con nombres legibles

**Validación en BD** (Opcional):
```sql
-- Verificar que los clientes están encriptados
SELECT 
    id,
    pg_typeof(name_enc) as name_type,
    public.decrypt_pii(name_enc) as name_decrypted
FROM public.clients
LIMIT 5;
```

**Resultado Esperado**: `name_type` debe ser `bytea` y `name_decrypted` debe ser legible

---

#### **1.2. Verificar Creación de Cliente desde Workspace**

**Ruta**: `/workspace/clients/new`

**Pasos**:
1. [ ] Acceder a la página de creación de cliente
2. [ ] Llenar el formulario con:
   - Nombre: "Cliente Test Encriptación"
   - Email: "test@example.com"
   - Teléfono: "+52 1234567890"
   - Dirección: "Calle Test 123"
3. [ ] Guardar el cliente
4. [ ] Verificar que se crea exitosamente
5. [ ] Verificar que aparece en la lista de clientes
6. [ ] Verificar que los datos se muestran correctamente

**Resultado Esperado**: ✅ Cliente creado exitosamente y visible en lista

**Validación en BD**:
```sql
-- Verificar que el cliente está encriptado
SELECT 
    id,
    pg_typeof(name_enc) as name_type,
    pg_typeof(email_enc) as email_type,
    pg_typeof(phone_enc) as phone_type,
    pg_typeof(address_enc) as address_type,
    public.decrypt_pii(name_enc) as name_decrypted
FROM public.clients
WHERE public.decrypt_pii(name_enc) LIKE '%Test Encriptación%'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado Esperado**: Todos los campos `_enc` deben ser `bytea` y `name_decrypted` debe ser "Cliente Test Encriptación"

---

#### **1.3. Verificar Edición de Cliente**

**Ruta**: `/workspace/clients/[id]/edit`

**Pasos**:
1. [ ] Acceder a un cliente existente
2. [ ] Verificar que los datos se cargan correctamente (desencriptados)
3. [ ] Modificar algún campo (ej: teléfono)
4. [ ] Guardar cambios
5. [ ] Verificar que los cambios se guardan correctamente
6. [ ] Recargar la página y verificar que los cambios persisten

**Resultado Esperado**: ✅ Cliente se edita correctamente y los datos se muestran desencriptados

---

### **PASO 2: VALIDAR ACCESO A PROFILES**

#### **2.1. Verificar Lectura de Profile**

**Ruta**: `/profile` o `/[locale]/profile`

**Pasos**:
1. [ ] Acceder a la página de perfil
2. [ ] Verificar que el nombre se muestra correctamente
3. [ ] Verificar que el teléfono se muestra correctamente (si existe)
4. [ ] Verificar que la dirección se muestra correctamente (si existe)
5. [ ] Verificar que no hay errores en la consola

**Resultado Esperado**: ✅ Datos del perfil se muestran correctamente (desencriptados)

**Validación en BD**:
```sql
-- Verificar que profile está encriptado
SELECT 
    id,
    pg_typeof(phone) as phone_type,
    pg_typeof(address) as address_type,
    public.decrypt_pii(phone) as phone_decrypted,
    public.decrypt_pii(address) as address_decrypted
FROM public.profiles
WHERE phone IS NOT NULL OR address IS NOT NULL
LIMIT 1;
```

**Resultado Esperado**: `phone_type` y `address_type` deben ser `bytea` y los valores desencriptados deben ser legibles

---

#### **2.2. Verificar Actualización de Profile**

**Ruta**: `/profile` o `/[locale]/profile`

**Pasos**:
1. [ ] Acceder a la página de perfil
2. [ ] Modificar el teléfono (ej: "+52 9876543210")
3. [ ] Modificar la dirección (ej: "Nueva Dirección 456")
4. [ ] Guardar cambios
5. [ ] Verificar que se guarda exitosamente
6. [ ] Recargar la página
7. [ ] Verificar que los cambios se muestran correctamente

**Resultado Esperado**: ✅ Profile se actualiza correctamente y los datos se guardan encriptados

**Validación en BD**:
```sql
-- Verificar que los cambios están encriptados
SELECT 
    id,
    pg_typeof(phone) as phone_type,
    pg_typeof(address) as address_type,
    public.decrypt_pii(phone) as phone_decrypted,
    public.decrypt_pii(address) as address_decrypted
FROM public.profiles
WHERE id = '[TU_USER_ID]';
```

**Resultado Esperado**: Los campos deben ser `bytea` y los valores desencriptados deben coincidir con lo ingresado

---

### **PASO 3: VALIDAR ACCESO A CASES**

#### **3.1. Verificar Lista de Cases**

**Ruta**: `/workspace/cases` o desde el workspace principal

**Pasos**:
1. [ ] Acceder a la página de cases
2. [ ] Verificar que la lista de cases se carga correctamente
3. [ ] Verificar que los nombres de clientes asociados se muestran correctamente
4. [ ] Verificar que no hay errores en la consola

**Resultado Esperado**: ✅ Lista de cases visible correctamente

---

#### **3.2. Verificar Creación de Case desde Workspace**

**Ruta**: `/workspace/cases/new`

**Pasos**:
1. [ ] Acceder a la página de creación de case
2. [ ] Llenar el formulario con datos válidos
3. [ ] Seleccionar o crear un cliente
4. [ ] Guardar el case
5. [ ] Verificar que se crea exitosamente
6. [ ] Verificar que aparece en la lista de cases

**Resultado Esperado**: ✅ Case creado exitosamente

---

### **PASO 4: VALIDAR FORMULARIO DEL PANEL DERECHO (AGENT INTERFACE)**

#### **4.1. Verificar Formulario BriefForm**

**Ruta**: `/agent/new-thread-placeholder` o `/agent/[caseId]`

**Pasos**:
1. [ ] Acceder a la interfaz del agente
2. [ ] Verificar que el formulario del panel derecho se muestra correctamente
3. [ ] Verificar que todos los campos son accesibles
4. [ ] Verificar que no hay errores en la consola

**Resultado Esperado**: ✅ Formulario visible y funcional

---

#### **4.2. Verificar Creación de Cliente desde BriefForm**

**Ruta**: `/agent/new-thread-placeholder`

**Pasos**:
1. [ ] Llenar el formulario BriefForm con:
   - Nombre del cliente: "Cliente desde Agente"
   - Datos del brief (tipo de negocio, empleados, etc.)
2. [ ] Hacer clic en "Buscar Planes" o "Aprobar"
3. [ ] Si se solicita crear cliente, confirmar la creación
4. [ ] Verificar que el cliente se crea exitosamente
5. [ ] Verificar que el case se crea exitosamente
6. [ ] Verificar que se navega al chat del case

**Resultado Esperado**: ✅ Cliente y case creados exitosamente desde el agente

**Validación en BD**:
```sql
-- Verificar cliente creado
SELECT 
    id,
    pg_typeof(name_enc) as name_type,
    public.decrypt_pii(name_enc) as name_decrypted
FROM public.clients
WHERE public.decrypt_pii(name_enc) LIKE '%desde Agente%'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado Esperado**: Cliente debe estar encriptado y el nombre desencriptado debe ser "Cliente desde Agente"

---

#### **4.3. Verificar Creación de Case desde BriefForm**

**Ruta**: `/agent/new-thread-placeholder`

**Pasos**:
1. [ ] Llenar el formulario BriefForm completamente
2. [ ] Seleccionar un cliente existente (o crear uno nuevo)
3. [ ] Hacer clic en "Buscar Planes" o "Aprobar"
4. [ ] Verificar que el case se crea exitosamente
5. [ ] Verificar que se navega a `/agent/[caseId]`
6. [ ] Verificar que el chat se carga correctamente

**Resultado Esperado**: ✅ Case creado y navegación exitosa al chat

---

### **PASO 5: VALIDAR CHATS HISTÓRICOS**

#### **5.1. Verificar Acceso a Chat Existente**

**Ruta**: `/agent/[caseId]` (donde `caseId` es un case existente con mensajes)

**Pasos**:
1. [ ] Acceder a un case existente que tenga mensajes históricos
2. [ ] Verificar que el chat se carga correctamente
3. [ ] Verificar que los mensajes históricos se muestran correctamente
4. [ ] Verificar que el contenido de los mensajes es legible (desencriptado)
5. [ ] Verificar que los mensajes están en orden cronológico
6. [ ] Verificar que no hay errores en la consola

**Resultado Esperado**: ✅ Chat histórico se carga y muestra mensajes desencriptados correctamente

**Validación en BD**:
```sql
-- Verificar mensajes encriptados
SELECT 
    id,
    case_id,
    role,
    pg_typeof(content) as content_type,
    LENGTH(content) as content_length,
    public.decrypt_pii(content) as content_decrypted
FROM public.messages
WHERE case_id = '[CASE_ID_TEST]'
ORDER BY created_at ASC
LIMIT 10;
```

**Resultado Esperado**: `content_type` debe ser `bytea` y `content_decrypted` debe ser legible

---

#### **5.2. Verificar Envío de Nuevo Mensaje en Chat Histórico**

**Ruta**: `/agent/[caseId]`

**Pasos**:
1. [ ] Acceder a un case existente
2. [ ] Verificar que los mensajes históricos se cargan
3. [ ] Escribir un nuevo mensaje en el chat
4. [ ] Enviar el mensaje
5. [ ] Verificar que el mensaje se guarda correctamente
6. [ ] Verificar que el mensaje aparece en el chat
7. [ ] Verificar que el mensaje es legible
8. [ ] Recargar la página
9. [ ] Verificar que el nuevo mensaje persiste y se muestra correctamente

**Resultado Esperado**: ✅ Nuevo mensaje se guarda encriptado y se muestra desencriptado

**Validación en BD**:
```sql
-- Verificar último mensaje encriptado
SELECT 
    id,
    case_id,
    role,
    pg_typeof(content) as content_type,
    public.decrypt_pii(content) as content_decrypted,
    created_at
FROM public.messages
WHERE case_id = '[CASE_ID_TEST]'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado Esperado**: El mensaje debe estar encriptado (`bytea`) y desencriptado debe ser legible

---

#### **5.3. Verificar Respuesta del Asistente en Chat Histórico**

**Ruta**: `/agent/[caseId]`

**Pasos**:
1. [ ] Acceder a un case existente
2. [ ] Enviar un mensaje al asistente
3. [ ] Esperar la respuesta del asistente
4. [ ] Verificar que la respuesta se guarda correctamente
5. [ ] Verificar que la respuesta se muestra en el chat
6. [ ] Verificar que la respuesta es legible
7. [ ] Recargar la página
8. [ ] Verificar que la respuesta del asistente persiste

**Resultado Esperado**: ✅ Respuesta del asistente se guarda encriptada y se muestra desencriptada

---

### **PASO 6: VALIDAR CREACIÓN COMPLETA DE FLUJO (CLIENTE + CASE + MENSAJES)**

#### **6.1. Flujo Completo desde Agente**

**Ruta**: `/agent/new-thread-placeholder`

**Pasos**:
1. [ ] Acceder a `/agent/new-thread-placeholder`
2. [ ] Llenar el BriefForm completamente:
   - Nombre del cliente: "Test Flujo Completo"
   - Tipo de negocio: "Restaurant"
   - Número de empleados: 10
   - Cobertura: "General"
   - Texto libre: "Necesito seguro para mi restaurante"
3. [ ] Hacer clic en "Buscar Planes" o "Aprobar"
4. [ ] Si se solicita crear cliente, confirmar
5. [ ] Verificar que se navega a `/agent/[caseId]`
6. [ ] Verificar que el chat se carga
7. [ ] Verificar que el mensaje inicial se muestra (si existe)
8. [ ] Enviar un mensaje adicional
9. [ ] Verificar que el mensaje se guarda y muestra correctamente
10. [ ] Recargar la página
11. [ ] Verificar que todo persiste correctamente

**Resultado Esperado**: ✅ Flujo completo funciona: cliente creado → case creado → mensajes guardados y mostrados

**Validación en BD Completa**:
```sql
-- Verificar cliente creado
SELECT 
    c.id as client_id,
    pg_typeof(c.name_enc) as name_type,
    public.decrypt_pii(c.name_enc) as client_name
FROM public.clients c
WHERE public.decrypt_pii(c.name_enc) LIKE '%Test Flujo Completo%'
ORDER BY c.created_at DESC
LIMIT 1;

-- Verificar case creado
SELECT 
    case_id,
    status,
    created_at
FROM public.cases
WHERE client_id = '[CLIENT_ID_ANTERIOR]'
ORDER BY created_at DESC
LIMIT 1;

-- Verificar mensajes del case
SELECT 
    id,
    role,
    pg_typeof(content) as content_type,
    public.decrypt_pii(content) as content_decrypted,
    created_at
FROM public.messages
WHERE case_id = '[CASE_ID_ANTERIOR]'
ORDER BY created_at ASC;
```

**Resultado Esperado**: 
- Cliente encriptado y nombre desencriptado legible
- Case creado correctamente
- Mensajes encriptados y contenido desencriptado legible

---

### **PASO 7: VALIDAR REGRESIÓN - OTRAS FUNCIONALIDADES**

#### **7.1. Verificar Landing Page**

**Ruta**: `/` (landing page)

**Pasos**:
1. [ ] Acceder a la landing page
2. [ ] Verificar que se carga correctamente
3. [ ] Verificar que no hay errores en la consola
4. [ ] Verificar que el formulario de creación de case funciona

**Resultado Esperado**: ✅ Landing page funciona correctamente

---

#### **7.2. Verificar Workspace Principal**

**Ruta**: `/workspace`

**Pasos**:
1. [ ] Acceder al workspace
2. [ ] Verificar que se carga correctamente
3. [ ] Verificar que las listas de cases y clientes se muestran
4. [ ] Verificar que no hay errores

**Resultado Esperado**: ✅ Workspace funciona correctamente

---

#### **7.3. Verificar Navegación entre Páginas**

**Pasos**:
1. [ ] Navegar entre diferentes páginas:
   - `/workspace` → `/workspace/clients` → `/workspace/cases` → `/agent/new-thread-placeholder`
2. [ ] Verificar que la navegación funciona correctamente
3. [ ] Verificar que no hay errores en la consola
4. [ ] Verificar que los datos se cargan correctamente en cada página

**Resultado Esperado**: ✅ Navegación funciona sin errores

---

## 🧪 TESTING DE VALIDACIÓN ESPECÍFICO

### **TEST 1: Crear Cliente y Verificar Encriptación**

**Objetivo**: Confirmar que los clientes se crean con datos encriptados

**Pasos**:
1. Crear un cliente desde `/workspace/clients/new`
2. Verificar en BD que `name_enc`, `email_enc`, `phone_enc`, `address_enc` son BYTEA
3. Verificar que se pueden desencriptar correctamente
4. Verificar que aparecen en la lista desencriptados

**Resultado Esperado**: ✅ Cliente creado encriptado, mostrado desencriptado

---

### **TEST 2: Crear Case con Mensajes y Verificar Encriptación**

**Objetivo**: Confirmar que los mensajes se guardan encriptados

**Pasos**:
1. Crear un case desde `/agent/new-thread-placeholder`
2. Enviar varios mensajes en el chat
3. Verificar en BD que `content` es BYTEA
4. Verificar que se pueden desencriptar correctamente
5. Recargar la página y verificar que los mensajes se muestran correctamente

**Resultado Esperado**: ✅ Mensajes guardados encriptados, mostrados desencriptados

---

### **TEST 3: Actualizar Profile y Verificar Encriptación**

**Objetivo**: Confirmar que los profiles se actualizan con datos encriptados

**Pasos**:
1. Acceder a `/profile`
2. Actualizar teléfono y dirección
3. Verificar en BD que `phone` y `address` son BYTEA
4. Verificar que se pueden desencriptar correctamente
5. Recargar la página y verificar que los datos se muestran correctamente

**Resultado Esperado**: ✅ Profile actualizado encriptado, mostrado desencriptado

---

### **TEST 4: Acceder a Chat Histórico con Mensajes Antiguos**

**Objetivo**: Confirmar que los mensajes históricos se pueden leer correctamente

**Pasos**:
1. Acceder a un case existente con mensajes antiguos
2. Verificar que todos los mensajes se cargan
3. Verificar que el contenido es legible
4. Verificar que no hay errores de desencriptación

**Resultado Esperado**: ✅ Mensajes históricos se leen correctamente

---

### **TEST 5: Flujo Completo End-to-End**

**Objetivo**: Validar todo el flujo desde creación hasta chat

**Pasos**:
1. Acceder a `/agent/new-thread-placeholder`
2. Llenar BriefForm y crear cliente/case
3. Enviar mensajes en el chat
4. Recargar la página
5. Verificar que todo persiste correctamente
6. Verificar en BD que todo está encriptado

**Resultado Esperado**: ✅ Flujo completo funciona correctamente

---

## ✅ CRITERIOS DE APROBACIÓN

La implementación se considera **COMPLETA Y APROBADA** cuando:

- [x] ✅ Clientes se pueden crear y acceder correctamente
- [x] ✅ Profiles se pueden leer y actualizar correctamente
- [x] ✅ Cases se pueden crear y acceder correctamente
- [x] ✅ Formulario del panel derecho (BriefForm) funciona correctamente
- [x] ✅ Se pueden crear clientes desde el agente
- [x] ✅ Se pueden crear cases desde el agente
- [x] ✅ Chats históricos se cargan correctamente
- [x] ✅ Mensajes históricos se muestran desencriptados
- [x] ✅ Nuevos mensajes se guardan encriptados
- [x] ✅ No hay errores en la consola del navegador
- [x] ✅ No hay errores en los logs del servidor
- [x] ✅ Los datos están realmente encriptados en la BD (BYTEA)
- [x] ✅ Los datos se pueden desencriptar correctamente

---

## 📝 NOTAS DE TESTING

**Fecha de Testing**: [FECHA]  
**Tester**: [NOMBRE]  
**Resultado General**: [APROBADO/PENDIENTE/REQUIERE CORRECCIONES]

**Problemas Encontrados**:
1. [DESCRIPCIÓN DEL PROBLEMA]
   - **Impacto**: [ALTO/MEDIO/BAJO]
   - **Solución**: [DESCRIPCIÓN]

**Observaciones**:
- [AGREGAR OBSERVACIONES ADICIONALES]

---

**Última actualización**: 31 de Enero, 2025  
**Estado**: ⏳ LISTO PARA TESTING FUNCIONAL

