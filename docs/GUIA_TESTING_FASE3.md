# GUÍA DE TESTING - FASE 3: ACTUALIZACIÓN DEL CÓDIGO PARA COMPATIBILIDAD CON ENCRIPTACIÓN

**Fecha**: 31 de Enero, 2025  
**Fase**: FASE 3 - Actualización del Código para Compatibilidad con Encriptación  
**Objetivo**: Verificar que el código funciona correctamente con la estructura encriptada de la BD

---

## 📋 CHECKLIST DE VALIDACIÓN

### **PASO 1: VERIFICAR HELPERS DE ENCRIPTACIÓN**

#### **1.1. Verificar `messageEncryption.ts`**

**Archivo**: `src/lib/helpers/messageEncryption.ts`

**Validar**:
- [ ] El archivo existe y está accesible
- [ ] `encryptMessageContent()` está implementada
- [ ] `decryptMessageContent()` está implementada
- [ ] `decryptMessages()` está implementada
- [ ] Todas las funciones tienen validación de `APP_ENCRYPTION_KEY`
- [ ] Las funciones manejan conversión Buffer ↔ Uint8Array

**Prueba Manual**:
```typescript
// En un archivo de prueba temporal
import { encryptMessageContent, decryptMessageContent } from '@/lib/helpers/messageEncryption';

// Probar encriptación/desencriptación
const testContent = "Mensaje de prueba";
const encrypted = await encryptMessageContent(testContent);
const decrypted = await decryptMessageContent(encrypted);

console.assert(decrypted === testContent, "La desencriptación debe coincidir con el original");
```

#### **1.2. Verificar `profileEncryption.ts`**

**Archivo**: `src/lib/helpers/profileEncryption.ts`

**Validar**:
- [ ] El archivo existe y está accesible
- [ ] `encryptProfilePhone()` está implementada
- [ ] `decryptProfilePhone()` está implementada
- [ ] `encryptProfileAddress()` está implementada
- [ ] `decryptProfileAddress()` está implementada
- [ ] Todas las funciones manejan null/undefined correctamente

**Prueba Manual**:
```typescript
// En un archivo de prueba temporal
import { encryptProfilePhone, decryptProfilePhone } from '@/lib/helpers/profileEncryption';

// Probar encriptación/desencriptación
const testPhone = "+52 1234567890";
const encrypted = await encryptProfilePhone(testPhone);
const decrypted = await decryptProfilePhone(encrypted);

console.assert(decrypted === testPhone, "La desencriptación debe coincidir con el original");

// Probar con null
const encryptedNull = await encryptProfilePhone(null);
console.assert(encryptedNull === null, "null debe retornar null");
```

---

### **PASO 2: VERIFICAR PRISMA SCHEMA**

#### **2.1. Verificar Model Message**

**Archivo**: `prisma/schema.prisma`

**Validar**:
- [ ] `Message.content` es de tipo `Bytes` (NO `String`)
- [ ] Hay comentario indicando que está encriptado
- [ ] El mapeo a la columna es correcto (`@map("content")`)

**Resultado Esperado**:
```prisma
model Message {
  ...
  content   Bytes    // ✅ Encriptado usando pgcrypto (BYTEA)
  ...
}
```

#### **2.2. Verificar Model Profile**

**Archivo**: `prisma/schema.prisma`

**Validar**:
- [ ] `Profile.phone` es de tipo `Bytes?` (NO `String?`)
- [ ] `Profile.address` es de tipo `Bytes?` (NO `String?`)
- [ ] Hay comentarios indicando que están encriptados

**Resultado Esperado**:
```prisma
model Profile {
  ...
  phone       Bytes?   // ✅ Encriptado usando pgcrypto (BYTEA)
  address     Bytes?   // ✅ Encriptado usando pgcrypto (BYTEA)
  ...
}
```

#### **2.3. Verificar Prisma Client Regenerado**

**Comando**:
```bash
pnpm prisma generate
```

**Validar**:
- [ ] El comando se ejecuta sin errores
- [ ] Los tipos TypeScript están actualizados
- [ ] `Message.content` es `Uint8Array` en los tipos generados
- [ ] `Profile.phone` y `Profile.address` son `Uint8Array | null` en los tipos generados

---

### **PASO 3: VERIFICAR API DE MENSAJES**

#### **3.1. Verificar GET `/api/cases/[id]/messages`**

**Archivo**: `src/app/api/cases/[id]/messages/route.ts`

**Validar**:
- [ ] Importa `decryptMessages` de `messageEncryption.ts`
- [ ] Obtiene mensajes con `content` como Buffer
- [ ] Usa `decryptMessages()` para desencriptar
- [ ] Retorna mensajes con `content` como string (desencriptado)

**Prueba Manual**:
1. Crear un caso con mensajes encriptados en la BD
2. Hacer GET a `/api/cases/[id]/messages`
3. Verificar que los mensajes retornados tienen `content` como string (texto plano)
4. Verificar que el contenido es legible

#### **3.2. Verificar POST `/api/cases/[id]/messages`**

**Archivo**: `src/app/api/cases/[id]/messages/route.ts`

**Validar**:
- [ ] Importa `encryptMessageContent` y `decryptMessages`
- [ ] Encripta el contenido antes de guardar
- [ ] Verifica duplicados desencriptando mensajes recientes
- [ ] Retorna mensaje desencriptado

**Prueba Manual**:
1. Hacer POST a `/api/cases/[id]/messages` con un mensaje
2. Verificar en la BD que el mensaje está encriptado (BYTEA)
3. Verificar que la respuesta contiene el mensaje desencriptado
4. Hacer GET y verificar que el mensaje se puede leer correctamente

---

### **PASO 4: VERIFICAR API DE CHAT PROCESS MESSAGE**

#### **4.1. Verificar Guardado de Mensajes**

**Archivo**: `src/app/api/chat/process-message/route.ts`

**Validar**:
- [ ] Importa `encryptMessageContent` y `decryptMessages`
- [ ] Encripta mensaje de usuario antes de guardar
- [ ] Encripta respuesta del asistente antes de guardar
- [ ] Verifica duplicados desencriptando mensajes recientes

**Prueba Manual**:
1. Enviar un mensaje a través de `/api/chat/process-message`
2. Verificar en la BD que ambos mensajes (usuario y asistente) están encriptados
3. Verificar que la respuesta del API es correcta

---

### **PASO 5: VERIFICAR CÓDIGO DE PROFILES**

#### **5.1. Verificar Profile Actions**

**Archivo**: `src/app/[locale]/(app)/profile/actions.ts`

**Validar**:
- [ ] Importa `encryptProfilePhone` y `encryptProfileAddress`
- [ ] Encripta `phone` antes de guardar en `updateProfile()`
- [ ] Encripta `address` antes de guardar en `updateProfile()`
- [ ] Maneja valores null correctamente

**Prueba Manual**:
1. Actualizar perfil con teléfono y dirección
2. Verificar en la BD que `phone` y `address` están encriptados (BYTEA)
3. Actualizar perfil eliminando teléfono (null)
4. Verificar que se guarda como null correctamente

#### **5.2. Verificar Profile Page**

**Archivo**: `src/app/[locale]/(app)/profile/page.tsx`

**Validar**:
- [ ] Importa `decryptProfilePhone` y `decryptProfileAddress`
- [ ] Desencripta `phone` al leer del perfil
- [ ] Desencripta `address` al leer del perfil
- [ ] Maneja valores null correctamente

**Prueba Manual**:
1. Acceder a la página de perfil
2. Verificar que los campos `phone` y `address` muestran valores desencriptados (texto plano)
3. Verificar que si son null, se muestran como campos vacíos

---

## 🧪 TESTING DE VALIDACIÓN

### **TEST 1: Crear y Leer Mensaje**

**Objetivo**: Verificar que se puede crear y leer un mensaje con encriptación

**Pasos**:
1. Crear un caso nuevo
2. Enviar un mensaje a través de la API
3. Leer los mensajes del caso
4. Verificar que el mensaje se puede leer correctamente

**Resultado Esperado**: ✅ Mensaje creado encriptado, leído desencriptado correctamente

---

### **TEST 2: Actualizar Profile con Phone y Address**

**Objetivo**: Verificar que se puede actualizar profile con datos encriptados

**Pasos**:
1. Acceder a la página de perfil
2. Actualizar teléfono y dirección
3. Guardar cambios
4. Recargar la página
5. Verificar que los datos se muestran correctamente

**Resultado Esperado**: ✅ Datos guardados encriptados, mostrados desencriptados correctamente

---

### **TEST 3: Verificar Encriptación en Base de Datos**

**Objetivo**: Confirmar que los datos están realmente encriptados en la BD

**Pasos**:
1. Crear un mensaje o actualizar profile
2. Ejecutar en Supabase SQL Editor:
   ```sql
   -- Verificar que content es BYTEA
   SELECT 
       id,
       pg_typeof(content) as content_type,
       LENGTH(content) as content_length
   FROM public.messages
   ORDER BY created_at DESC
   LIMIT 1;
   
   -- Verificar que phone/address son BYTEA
   SELECT 
       id,
       pg_typeof(phone) as phone_type,
       pg_typeof(address) as address_type
   FROM public.profiles
   LIMIT 1;
   ```

**Resultado Esperado**: ✅ Todos los campos son `bytea` (BYTEA)

---

### **TEST 4: Verificar Desencriptación**

**Objetivo**: Confirmar que los datos se pueden desencriptar correctamente

**Pasos**:
1. Obtener un mensaje encriptado de la BD
2. Ejecutar en Supabase SQL Editor (requiere `APP_ENCRYPTION_KEY`):
   ```sql
   -- Desencriptar mensaje
   SELECT 
       id,
       role,
       public.decrypt_pii(content) as decrypted_content
   FROM public.messages
   WHERE content IS NOT NULL
   LIMIT 1;
   ```

**Resultado Esperado**: ✅ El contenido desencriptado es legible (texto plano)

---

### **TEST 5: Verificar Compatibilidad con Código Existente**

**Objetivo**: Confirmar que el frontend no necesita cambios

**Pasos**:
1. Verificar que los componentes que usan mensajes siguen funcionando
2. Verificar que los componentes que usan profiles siguen funcionando
3. Verificar que no hay errores en la consola del navegador

**Resultado Esperado**: ✅ Todo funciona sin cambios en el frontend

---

## ✅ CRITERIOS DE APROBACIÓN PARA CONTINUAR A FASE 6

La FASE 3 se considera **COMPLETA Y APROBADA** cuando:

- [x] ✅ Helpers de encriptación creados y funcionando
- [x] ✅ Prisma schema actualizado correctamente
- [x] ✅ Prisma client regenerado
- [x] ✅ API de mensajes actualizada (GET y POST)
- [x] ✅ API de chat process-message actualizada
- [x] ✅ Profile actions actualizado
- [x] ✅ Profile page actualizado
- [x] ✅ Se pueden crear mensajes encriptados
- [x] ✅ Se pueden leer mensajes desencriptados
- [x] ✅ Se pueden actualizar profiles con datos encriptados
- [x] ✅ Se pueden leer profiles con datos desencriptados
- [x] ✅ Los datos están realmente encriptados en la BD (BYTEA)
- [x] ✅ No se rompieron funcionalidades existentes

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
**Estado**: ⏳ LISTO PARA TESTING

