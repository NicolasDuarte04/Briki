# GUÍA DE TESTING - FASE 2: CORRECCIÓN DE ERROR DE PROFILE (display_name)

**Fecha**: 31 de Enero, 2025  
**Fase**: FASE 2 - Corrección de Error de Profile (display_name)  
**Objetivo**: Verificar que la página de perfil funciona correctamente después de la corrección

---

## 📋 CHECKLIST DE VALIDACIÓN

### **PASO 1: VERIFICAR SCHEMA DE PRISMA**

#### **1.1. Verificar Model Profile**

**Archivo**: `prisma/schema.prisma`

**Validar**:
- [ ] `Profile.name` es de tipo `Bytes?` (NO `String?`)
- [ ] Hay `@map("name_enc")` (NO `@map("display_name")`)
- [ ] Hay comentario indicando que está encriptado

**Resultado Esperado**:
```prisma
model Profile {
  ...
  name                        Bytes?   @map("name_enc")  // ✅ Encriptado usando pgcrypto (BYTEA)
  ...
}
```

---

#### **1.2. Verificar Prisma Client Regenerado**

**Comando**:
```bash
pnpm prisma generate
```

**Validar**:
- [ ] El comando se ejecuta sin errores
- [ ] Los tipos TypeScript están actualizados
- [ ] `Profile.name` es `Buffer | null` en los tipos generados

---

### **PASO 2: VERIFICAR HELPERS DE ENCRIPTACIÓN**

#### **2.1. Verificar `profileEncryption.ts`**

**Archivo**: `src/lib/helpers/profileEncryption.ts`

**Validar**:
- [ ] `encryptProfileName()` está implementada
- [ ] `decryptProfileName()` está implementada
- [ ] `encryptProfilePhone()` retorna `Buffer` (NO `Uint8Array`)
- [ ] `encryptProfileAddress()` retorna `Buffer` (NO `Uint8Array`)
- [ ] Todas las funciones tienen validación de `APP_ENCRYPTION_KEY`

**Prueba Manual**:
```typescript
// En un archivo de prueba temporal
import { encryptProfileName, decryptProfileName } from '@/lib/helpers/profileEncryption';

// Probar encriptación/desencriptación
const testName = "Juan Pérez";
const encrypted = await encryptProfileName(testName);
const decrypted = await decryptProfileName(encrypted);

console.assert(decrypted === testName, "La desencriptación debe coincidir con el original");

// Probar con null
const encryptedNull = await encryptProfileName(null);
console.assert(encryptedNull === null, "null debe retornar null");
```

---

### **PASO 3: VERIFICAR CÓDIGO DE PROFILE**

#### **3.1. Verificar Profile Page**

**Archivo**: `src/app/[locale]/(app)/profile/page.tsx`

**Validar**:
- [ ] Importa `decryptProfileName`
- [ ] Desencripta `name` al leer del perfil
- [ ] Maneja valores null correctamente

**Prueba Manual**:
1. Acceder a `/profile`
2. Verificar que la página se carga correctamente
3. Verificar que el campo `name` muestra valores desencriptados (texto plano)
4. Verificar que si es null, se muestra como campo vacío

---

#### **3.2. Verificar Profile Actions**

**Archivo**: `src/app/[locale]/(app)/profile/actions.ts`

**Validar**:
- [ ] Importa `encryptProfileName`
- [ ] Encripta `name` antes de guardar en `updateProfile()`
- [ ] Maneja valores null correctamente
- [ ] Tipo de `profileData.name` es `Buffer | null | undefined`

**Prueba Manual**:
1. Acceder a `/profile`
2. Actualizar el nombre
3. Guardar cambios
4. Verificar en la BD que `name_enc` está encriptado (BYTEA)
5. Recargar la página
6. Verificar que el nombre se muestra correctamente

---

### **PASO 4: TESTING FUNCIONAL - ACCESO A PROFILE**

#### **4.1. Verificar Lectura de Profile**

**Ruta**: `/profile` o `/[locale]/profile`

**Pasos**:
1. [ ] Acceder a la página de perfil
2. [ ] Verificar que la página se carga correctamente (NO debe aparecer error)
3. [ ] Verificar que el nombre se muestra correctamente (si existe)
4. [ ] Verificar que el teléfono se muestra correctamente (si existe)
5. [ ] Verificar que la dirección se muestra correctamente (si existe)
6. [ ] Verificar que no hay errores en la consola del navegador
7. [ ] Verificar que no hay errores en los logs del servidor

**Resultado Esperado**: ✅ Página de perfil se carga correctamente, datos desencriptados visibles

---

#### **4.2. Verificar Actualización de Profile**

**Ruta**: `/profile`

**Pasos**:
1. [ ] Acceder a la página de perfil
2. [ ] Modificar el nombre (ej: "Test Name Update")
3. [ ] Modificar el teléfono (ej: "+52 9876543210")
4. [ ] Modificar la dirección (ej: "Nueva Dirección 456")
5. [ ] Guardar cambios
6. [ ] Verificar que se guarda exitosamente
7. [ ] Recargar la página
8. [ ] Verificar que los cambios se muestran correctamente

**Resultado Esperado**: ✅ Profile actualizado, datos guardados encriptados, mostrados desencriptados

---

### **PASO 5: VERIFICAR ENCRIPTACIÓN EN BASE DE DATOS**

#### **5.1. Verificar que `name_enc` está Encriptado**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar estructura de name_enc
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'name_enc';
```

**Validar**:
- [ ] La columna `name_enc` existe
- [ ] El tipo de dato es `bytea` (NO `text` ni `varchar`)
- [ ] La columna `display_name` NO existe

**Resultado Esperado**:
```
 column_name | data_type | is_nullable 
-------------+-----------+-------------
 name_enc    | bytea     | YES
```

---

#### **5.2. Verificar Datos Encriptados en BD**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que name_enc es BYTEA
SELECT 
    id,
    pg_typeof(name_enc) as name_type,
    LENGTH(name_enc) as name_length
FROM public.profiles
WHERE name_enc IS NOT NULL
LIMIT 1;
```

**Validar**:
- [ ] `name_type` es `bytea`
- [ ] `name_length` es mayor que 0

**Resultado Esperado**: ✅ `name_enc` es `bytea` y contiene datos encriptados

---

#### **5.3. Verificar Desencriptación**

**Ejecutar en Supabase SQL Editor** (requiere `APP_ENCRYPTION_KEY`):
```sql
-- Desencriptar name
SELECT 
    id,
    public.decrypt_pii(name_enc) as decrypted_name,
    public.decrypt_pii(phone) as decrypted_phone,
    public.decrypt_pii(address) as decrypted_address
FROM public.profiles
WHERE name_enc IS NOT NULL
LIMIT 1;
```

**Validar**:
- [ ] El nombre desencriptado es legible (texto plano)
- [ ] El nombre coincide con lo ingresado en el formulario

**Resultado Esperado**: ✅ El nombre desencriptado es legible y correcto

---

### **PASO 6: TESTING DE REGRESIÓN**

#### **6.1. Verificar que No Se Rompieron Otras Funcionalidades**

**Pasos**:
1. [ ] Verificar que creación de cases funciona
2. [ ] Verificar que creación de clientes funciona
3. [ ] Verificar que creación de mensajes funciona (FASE 1)
4. [ ] Verificar que otras APIs funcionan correctamente
5. [ ] Verificar que no hay errores en consola del navegador
6. [ ] Verificar que no hay errores en logs del servidor

**Resultado Esperado**: ✅ Todas las funcionalidades siguen funcionando

---

## 🧪 TESTING DE VALIDACIÓN ESPECÍFICO

### **TEST 1: Crear/Actualizar Profile con Name**

**Objetivo**: Confirmar que el nombre se guarda encriptado

**Pasos**:
1. Acceder a `/profile`
2. Actualizar nombre a "Test Name Encryption"
3. Guardar cambios
4. Verificar en BD que `name_enc` es `bytea`
5. Verificar que se puede desencriptar correctamente
6. Recargar la página
7. Verificar que el nombre se muestra correctamente

**Resultado Esperado**: ✅ Nombre guardado encriptado, mostrado desencriptado

---

### **TEST 2: Verificar Consistencia con Phone y Address**

**Objetivo**: Confirmar que `name` sigue el mismo patrón que `phone` y `address`

**Pasos**:
1. Actualizar profile con name, phone y address
2. Verificar en BD que todos están encriptados (BYTEA)
3. Verificar que todos se pueden desencriptar correctamente
4. Verificar que todos se muestran correctamente en la UI

**Resultado Esperado**: ✅ Todos los campos PII siguen el mismo patrón de encriptación

---

### **TEST 3: Verificar Manejo de Null**

**Objetivo**: Confirmar que los valores null se manejan correctamente

**Pasos**:
1. Crear profile sin name (null)
2. Verificar que no hay errores
3. Actualizar profile agregando name
4. Verificar que se guarda correctamente
5. Actualizar profile eliminando name (null)
6. Verificar que se guarda como null correctamente

**Resultado Esperado**: ✅ Valores null se manejan correctamente

---

## ✅ CRITERIOS DE APROBACIÓN PARA CONTINUAR A FASE 3

La FASE 2 se considera **COMPLETA Y APROBADA** cuando:

- [x] ✅ Schema de Prisma actualizado (`name Bytes? @map("name_enc")`)
- [x] ✅ Helpers de encriptación creados (`encryptProfileName`, `decryptProfileName`)
- [x] ✅ Profile page actualizado (desencripta `name`)
- [x] ✅ Profile actions actualizado (encripta `name`)
- [x] ✅ Prisma client regenerado
- [x] ✅ Se puede acceder a `/profile` sin errores
- [x] ✅ Se pueden leer datos del perfil (desencriptados)
- [x] ✅ Se pueden actualizar datos del perfil (encriptados)
- [x] ✅ Los datos están realmente encriptados en la BD (BYTEA)
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

