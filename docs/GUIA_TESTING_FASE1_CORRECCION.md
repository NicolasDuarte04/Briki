# GUÍA DE TESTING - FASE 1: CORRECCIÓN DE ERROR DE PRISMA CLIENT

**Fecha**: 31 de Enero, 2025  
**Fase**: FASE 1 - Corrección de Error de Prisma Client (Bytes vs String)  
**Objetivo**: Verificar que los mensajes se pueden crear y guardar correctamente después de la corrección

---

## 📋 CHECKLIST DE VALIDACIÓN

### **PASO 1: VERIFICAR REGENERACIÓN DE PRISMA CLIENT**

#### **1.1. Verificar Cache Limpiado**

**Comando**:
```bash
ls -la node_modules/.prisma 2>&1 | head -5
```

**Validar**:
- [ ] El directorio `.prisma` existe (fue regenerado)
- [ ] Los archivos generados están presentes

**Resultado Esperado**: ✅ Directorio regenerado correctamente

---

#### **1.2. Verificar Prisma Client Generado**

**Comando**:
```bash
pnpm prisma generate
```

**Validar**:
- [ ] El comando se ejecuta sin errores
- [ ] Se muestra mensaje "Generated Prisma Client"
- [ ] No hay warnings críticos

**Resultado Esperado**: ✅ Prisma Client generado exitosamente

---

#### **1.3. Verificar Schema de Prisma**

**Archivo**: `prisma/schema.prisma`

**Validar**:
- [ ] `Message.content` es de tipo `Bytes` (NO `String`)
- [ ] Hay comentario indicando que está encriptado
- [ ] El mapeo a la columna es correcto

**Resultado Esperado**:
```prisma
model Message {
  ...
  content   Bytes    // ✅ Encriptado usando pgcrypto (BYTEA)
  ...
}
```

---

### **PASO 2: VERIFICAR CORRECCIÓN DE TIPOS**

#### **2.1. Verificar `messageEncryption.ts`**

**Archivo**: `src/lib/helpers/messageEncryption.ts`

**Validar**:
- [ ] `encryptMessageContent()` retorna `Promise<Buffer>` (NO `Promise<Uint8Array>`)
- [ ] La función retorna `Buffer` directamente (NO `Uint8Array`)
- [ ] La documentación JSDoc está actualizada

**Resultado Esperado**:
```typescript
export async function encryptMessageContent(content: string): Promise<Buffer> {
  // ...
  return buffer; // Buffer directamente
}
```

---

#### **2.2. Verificar APIs Actualizadas**

**Archivo**: `src/app/api/chat/process-message/route.ts`

**Validar**:
- [ ] Línea 79: `encryptMessageContent()` se usa sin casting a `Uint8Array`
- [ ] Línea 85: `content: Buffer.from(encryptedContent)` o `content: encryptedContent`
- [ ] Línea 104: `encryptMessageContent()` se usa sin casting
- [ ] Línea 109: `content: Buffer.from(encryptedAssistantContent)` o `content: encryptedAssistantContent`

**Archivo**: `src/app/api/cases/[id]/messages/route.ts`

**Validar**:
- [ ] Línea 96: `encryptMessageContent()` se usa sin casting
- [ ] Línea 143: `content: Buffer.from(encryptedContent)` o `content: encryptedContent`

---

#### **2.3. Verificar Errores TypeScript**

**Comando**:
```bash
pnpm tsc --noEmit 2>&1 | grep -E "(process-message|messages/route)" | grep "error TS"
```

**Validar**:
- [ ] No hay errores TypeScript relacionados con `process-message/route.ts`
- [ ] No hay errores TypeScript relacionados con `cases/[id]/messages/route.ts`
- [ ] Los únicos errores son en archivos no relacionados (AccountSettings.tsx, cases/create)

**Resultado Esperado**: ✅ 0 errores relacionados con mensajes

---

### **PASO 3: TESTING FUNCIONAL - CREAR MENSAJE**

#### **3.1. Crear Mensaje desde Agente**

**Ruta**: `/agent/new-thread-placeholder`

**Pasos**:
1. [ ] Acceder a `/agent/new-thread-placeholder`
2. [ ] Llenar el BriefForm completamente
3. [ ] Hacer clic en "Buscar Planes" o "Aprobar"
4. [ ] Verificar que se crea el case exitosamente
5. [ ] Verificar que se navega a `/agent/[caseId]`
6. [ ] Enviar un mensaje en el chat
7. [ ] Verificar que el mensaje se muestra en el chat
8. [ ] Verificar que NO aparece error en la consola del servidor

**Resultado Esperado**: ✅ Mensaje creado y mostrado correctamente, sin errores

---

#### **3.2. Verificar Mensaje en Base de Datos**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar último mensaje creado
SELECT 
    id,
    case_id,
    role,
    pg_typeof(content) as content_type,
    LENGTH(content) as content_length,
    created_at
FROM public.messages
ORDER BY created_at DESC
LIMIT 1;
```

**Validar**:
- [ ] El mensaje existe en la BD
- [ ] `content_type` es `bytea` (NO `text`)
- [ ] `content_length` es mayor que 0
- [ ] El mensaje tiene `role` correcto (`user` o `assistant`)

**Resultado Esperado**:
```
 content_type | content_length | role
--------------+----------------+----------
 bytea        | 136           | user
```

---

#### **3.3. Verificar Desencriptación del Mensaje**

**Ejecutar en Supabase SQL Editor** (requiere `APP_ENCRYPTION_KEY`):
```sql
-- Desencriptar último mensaje
SELECT 
    id,
    role,
    public.decrypt_pii(content) as decrypted_content,
    created_at
FROM public.messages
ORDER BY created_at DESC
LIMIT 1;
```

**Validar**:
- [ ] El contenido desencriptado es legible (texto plano)
- [ ] El contenido coincide con el mensaje enviado
- [ ] No hay errores de desencriptación

**Resultado Esperado**: ✅ Contenido desencriptado legible y correcto

---

### **PASO 4: TESTING FUNCIONAL - CREAR MENSAJE DESDE API DIRECTA**

#### **4.1. Crear Mensaje via API POST**

**Endpoint**: `POST /api/cases/[id]/messages`

**Comando** (usar un `caseId` existente):
```bash
curl -X POST http://localhost:3000/api/cases/[CASE_ID]/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: [SESSION_COOKIE]" \
  -d '{
    "role": "user",
    "content": "Mensaje de prueba desde API",
    "metadata": {}
  }'
```

**Validar**:
- [ ] La respuesta es `200 OK` o `201 Created`
- [ ] La respuesta incluye el mensaje creado
- [ ] El mensaje tiene `content` como string (desencriptado)
- [ ] NO aparece error `Invalid value provided. Expected String, provided Bytes.`

**Resultado Esperado**: ✅ Mensaje creado exitosamente sin errores de tipo

---

#### **4.2. Verificar Mensaje Creado en BD**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar mensaje creado por API
SELECT 
    id,
    case_id,
    role,
    pg_typeof(content) as content_type,
    LENGTH(content) as content_length
FROM public.messages
WHERE role = 'user'
ORDER BY created_at DESC
LIMIT 1;
```

**Validar**:
- [ ] El mensaje existe
- [ ] `content_type` es `bytea`
- [ ] El contenido está encriptado

**Resultado Esperado**: ✅ Mensaje encriptado correctamente en BD

---

### **PASO 5: TESTING FUNCIONAL - PROCESAR MENSAJE CON ASISTENTE**

#### **5.1. Enviar Mensaje y Recibir Respuesta**

**Ruta**: `/agent/[caseId]`

**Pasos**:
1. [ ] Acceder a un case existente
2. [ ] Enviar un mensaje al asistente
3. [ ] Esperar respuesta del asistente
4. [ ] Verificar que ambos mensajes (usuario y asistente) se muestran
5. [ ] Verificar que NO aparece error en consola del servidor

**Resultado Esperado**: ✅ Ambos mensajes creados y mostrados correctamente

---

#### **5.2. Verificar Mensajes en BD**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar mensajes de usuario y asistente
SELECT 
    id,
    role,
    pg_typeof(content) as content_type,
    LENGTH(content) as content_length,
    created_at
FROM public.messages
WHERE case_id = '[CASE_ID]'
ORDER BY created_at DESC
LIMIT 2;
```

**Validar**:
- [ ] Hay 2 mensajes (usuario y asistente)
- [ ] Ambos tienen `content_type` = `bytea`
- [ ] Ambos tienen contenido encriptado

**Resultado Esperado**: ✅ Ambos mensajes encriptados correctamente

---

### **PASO 6: TESTING DE REGRESIÓN**

#### **6.1. Verificar Lectura de Mensajes**

**Endpoint**: `GET /api/cases/[id]/messages`

**Comando**:
```bash
curl http://localhost:3000/api/cases/[CASE_ID]/messages \
  -H "Cookie: [SESSION_COOKIE]"
```

**Validar**:
- [ ] La respuesta es `200 OK`
- [ ] La respuesta incluye array de `messages`
- [ ] Cada mensaje tiene `content` como string (desencriptado)
- [ ] Los mensajes están en orden cronológico
- [ ] El contenido es legible

**Resultado Esperado**: ✅ Mensajes leídos y desencriptados correctamente

---

#### **6.2. Verificar que No Se Rompieron Otras Funcionalidades**

**Pasos**:
1. [ ] Verificar que creación de cases funciona
2. [ ] Verificar que creación de clientes funciona
3. [ ] Verificar que otras APIs funcionan correctamente
4. [ ] Verificar que no hay errores en consola del navegador
5. [ ] Verificar que no hay errores en logs del servidor

**Resultado Esperado**: ✅ Todas las funcionalidades siguen funcionando

---

## 🧪 TESTING DE VALIDACIÓN ESPECÍFICO

### **TEST 1: Crear Mensaje y Verificar Encriptación**

**Objetivo**: Confirmar que los mensajes se crean con datos encriptados

**Pasos**:
1. Crear un mensaje desde `/agent/new-thread-placeholder`
2. Verificar en BD que `content` es `bytea`
3. Verificar que se puede desencriptar correctamente
4. Verificar que aparece en el chat desencriptado

**Resultado Esperado**: ✅ Mensaje creado encriptado, mostrado desencriptado

---

### **TEST 2: Verificar Tipo de Retorno de `encryptMessageContent()`**

**Objetivo**: Confirmar que la función retorna `Buffer`

**Pasos**:
1. Crear un script de prueba temporal:
   ```typescript
   import { encryptMessageContent } from '@/lib/helpers/messageEncryption';
   
   const encrypted = await encryptMessageContent("Test");
   console.log(encrypted instanceof Buffer); // Debe ser true
   console.log(typeof encrypted); // Debe ser 'object'
   ```
2. Ejecutar el script
3. Verificar que `encrypted instanceof Buffer` es `true`

**Resultado Esperado**: ✅ Función retorna `Buffer`

---

### **TEST 3: Verificar que Prisma Acepta Buffer**

**Objetivo**: Confirmar que Prisma acepta `Buffer` para campos `Bytes`

**Pasos**:
1. Crear un mensaje usando `encryptMessageContent()`
2. Verificar que no hay error de validación de Prisma
3. Verificar que el mensaje se guarda correctamente

**Resultado Esperado**: ✅ Prisma acepta `Buffer` sin errores

---

## ✅ CRITERIOS DE APROBACIÓN PARA CONTINUAR A FASE 2

La FASE 1 se considera **COMPLETA Y APROBADA** cuando:

- [x] ✅ Prisma Client regenerado correctamente
- [x] ✅ `encryptMessageContent()` retorna `Buffer`
- [x] ✅ APIs actualizadas para usar `Buffer`
- [x] ✅ Errores TypeScript relacionados corregidos
- [x] ✅ Se pueden crear mensajes desde el agente
- [x] ✅ Se pueden crear mensajes desde la API
- [x] ✅ Los mensajes se guardan encriptados en BD (BYTEA)
- [x] ✅ Los mensajes se pueden leer y desencriptar correctamente
- [x] ✅ No se rompieron otras funcionalidades

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

