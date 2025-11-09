# PLAN DETALLADO - FASE 2: CORRECCIÓN DE ERROR DE PROFILE (display_name)

**Fecha**: 31 de Enero, 2025  
**Rol**: Ingeniero FullStack Senior  
**Objetivo**: Corregir el error de columna `display_name` no encontrada en la tabla `profiles`  
**Prioridad**: 🔴 CRÍTICA - Bloquea acceso a perfiles

---

## 📋 ANÁLISIS QUIRÚRGICO DE CAUSA RAÍZ

### **PROBLEMA IDENTIFICADO**

**Error**:
```
Invalid `prisma.user.findUnique()` invocation:
The column `profiles.display_name` does not exist in the current database.
```

**Ubicación**: `src/app/[locale]/(app)/profile/page.tsx` (línea 22)

---

### **CAUSA RAÍZ**

**Estructura Real de BD** (según `.phase1-results/analysis-results.txt`):
- ✅ Columna en BD: `name_enc` (BYTEA (encriptado))
- ❌ Schema Prisma: `name String? @map("display_name")` (INCORRECTO)
- ❌ Migración original: `display_name text` (pero fue modificada después)

**Discrepancia**:
1. La migración original (`20251004T000000_profiles.sql`) creó `display_name text`
2. Posteriormente se modificó la BD para tener `name_enc bytea` (encriptado)
3. El schema de Prisma NO se actualizó para reflejar este cambio
4. El código intenta acceder a `display_name` que ya no existe

**Escenario Confirmado**: **ESCENARIO B** - La columna se llama `name_enc` (BYTEA encriptado)

---

## 🎯 PLAN DE RESOLUCIÓN DETALLADO

### **PASO 1: ACTUALIZAR SCHEMA DE PRISMA**

#### **1.1. Cambiar Tipo y Mapeo de `name`**

**Archivo**: `prisma/schema.prisma` (línea 65)

**Cambio**:
```prisma
// ANTES
name                        String?  @map("display_name")

// DESPUÉS
name                        Bytes?   @map("name_enc")  // ✅ Encriptado usando pgcrypto (BYTEA). Usar encrypt_pii()/decrypt_pii()
```

**Razón**: La BD tiene `name_enc` como BYTEA, no `display_name` como TEXT

---

### **PASO 2: CREAR HELPER DE ENCRIPTACIÓN PARA `name`**

#### **2.1. Agregar Funciones a `profileEncryption.ts`**

**Archivo**: `src/lib/helpers/profileEncryption.ts`

**Funciones a Agregar**:
```typescript
/**
 * Encripta el nombre de un perfil antes de guardarlo en la BD.
 */
export async function encryptProfileName(name: string | null | undefined): Promise<Buffer | null>

/**
 * Desencripta el nombre de un perfil al leerlo de la BD.
 */
export async function decryptProfileName(encrypted: Buffer | Uint8Array | null): Promise<string | null>
```

**Patrón**: Similar a `encryptProfilePhone()` y `encryptProfileAddress()`

---

### **PASO 3: ACTUALIZAR `profile/page.tsx`**

#### **3.1. Importar Helper de Desencriptación**

**Archivo**: `src/app/[locale]/(app)/profile/page.tsx`

**Cambio**:
```typescript
// ANTES
import { decryptProfilePhone, decryptProfileAddress } from "@/lib/helpers/profileEncryption";

// DESPUÉS
import { decryptProfilePhone, decryptProfileAddress, decryptProfileName } from "@/lib/helpers/profileEncryption";
```

#### **3.2. Desencriptar `name` al Leer**

**Cambio**:
```typescript
// ANTES
const initialName = user?.profile?.name ?? "";

// DESPUÉS
const initialName = user?.profile?.name 
  ? (await decryptProfileName(user.profile.name)) ?? ""
  : "";
```

**Razón**: `name` ahora es `Buffer` (BYTEA), necesita desencriptación

---

### **PASO 4: ACTUALIZAR `profile/actions.ts`**

#### **4.1. Importar Helper de Encriptación**

**Archivo**: `src/app/[locale]/(app)/profile/actions.ts`

**Cambio**:
```typescript
// ANTES
import { encryptProfilePhone, encryptProfileAddress } from '@/lib/helpers/profileEncryption';

// DESPUÉS
import { encryptProfilePhone, encryptProfileAddress, encryptProfileName } from '@/lib/helpers/profileEncryption';
```

#### **4.2. Encriptar `name` antes de Guardar**

**Cambio**:
```typescript
// ANTES
if (updates.name !== undefined) {
  profileData.name = updates.name
}

// DESPUÉS
if (updates.name !== undefined) {
  // Encriptar name antes de guardarlo
  const encryptedName = await encryptProfileName(updates.name);
  profileData.name = encryptedName ?? undefined;
}
```

**Razón**: `name` debe encriptarse antes de guardarse en BD

#### **4.3. Actualizar Tipo de `profileData.name`**

**Cambio**:
```typescript
// ANTES
const profileData: {
  name?: string
  phone?: Uint8Array | null | undefined
  address?: Uint8Array | null | undefined
  locale?: LocaleValue
} = {}

// DESPUÉS
const profileData: {
  name?: Buffer | null | undefined
  phone?: Buffer | null | undefined
  address?: Buffer | null | undefined
  locale?: LocaleValue
} = {}
```

**Razón**: `name` ahora es `Buffer` (BYTEA), no `string`

---

### **PASO 5: ACTUALIZAR `updateNotificationSettings`**

#### **5.1. Corregir Creación de Profile**

**Archivo**: `src/app/[locale]/(app)/profile/actions.ts` (línea 183)

**Cambio**:
```typescript
// ANTES
create: {
  id: userId,
  name: '',
  notificationsProductUpdates: productUpdates,
  notificationsPolicyAlerts: policyAlerts,
},

// DESPUÉS
create: {
  id: userId,
  name: null, // name es opcional y encriptado (BYTEA)
  notificationsProductUpdates: productUpdates,
  notificationsPolicyAlerts: policyAlerts,
},
```

**Razón**: `name` es `Bytes?` (opcional), no `string`

---

### **PASO 6: REGENERAR PRISMA CLIENT**

**Comando**:
```bash
pnpm prisma generate
```

**Verificación**:
- [ ] Prisma Client regenerado sin errores
- [ ] Tipos TypeScript actualizados

---

### **PASO 7: VERIFICAR USOS DE `Profile.name` EN OTROS ARCHIVOS**

**Archivos a Verificar**:
- `src/lib/ui/state.ts` (si usa `Profile.name`)
- Cualquier otro archivo que use `Profile.name`

**Acción**: Buscar y actualizar si es necesario

---

## 📊 ARCHIVOS A MODIFICAR

1. ✅ `prisma/schema.prisma` - Actualizar `name` a `Bytes? @map("name_enc")`
2. ✅ `src/lib/helpers/profileEncryption.ts` - Agregar `encryptProfileName()` y `decryptProfileName()`
3. ✅ `src/app/[locale]/(app)/profile/page.tsx` - Desencriptar `name` al leer
4. ✅ `src/app/[locale]/(app)/profile/actions.ts` - Encriptar `name` al guardar
5. ✅ Regenerar Prisma Client

---

## 🎯 PRINCIPIOS APLICADOS

### **1. Reutilización Máxima del Código Existente**
- ✅ Reutilizar patrón de `encryptProfilePhone()` y `encryptProfileAddress()`
- ✅ Mantener estructura consistente en helpers

### **2. Mantenimiento de Arquitectura Dual**
- ✅ No modificar estructura de `/workspace` vs `/agent`
- ✅ Mantener separación de responsabilidades

### **3. Consistencia de Estado Unidireccional**
- ✅ BD como fuente de verdad (`name_enc` BYTEA)
- ✅ Código se adapta a BD

### **4. Separación Clara de Responsabilidades**
- ✅ Helpers de encriptación separados por campo
- ✅ APIs manejan encriptación transparentemente

---

## 🚨 RIESGOS Y MITIGACIONES

### **RIESGO 1: Datos Existentes en `display_name` se Pierden**
**Descripción**: Si hay datos en `display_name` (TEXT), se perderán al cambiar a `name_enc` (BYTEA)

**Mitigación**:
- Verificar si hay datos en `display_name` antes de cambiar
- Si hay datos, crear script de migración para encriptarlos y moverlos a `name_enc`

### **RIESGO 2: Otros Archivos Usan `Profile.name` como String**
**Descripción**: Otros archivos pueden esperar `name` como `string`

**Mitigación**:
- Buscar todos los usos de `Profile.name` en el código
- Actualizar todos los archivos afectados

### **RIESGO 3: `updateNotificationSettings` Crea Profile con `name: ''`**
**Descripción**: La función puede intentar crear profile con `name: ''` (string vacío)

**Mitigación**:
- Cambiar a `name: null` (opcional) o encriptar string vacío

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Actualizar `prisma/schema.prisma`: `name Bytes? @map("name_enc")`
- [ ] Agregar `encryptProfileName()` a `profileEncryption.ts`
- [ ] Agregar `decryptProfileName()` a `profileEncryption.ts`
- [ ] Actualizar `profile/page.tsx`: Importar y usar `decryptProfileName()`
- [ ] Actualizar `profile/actions.ts`: Importar y usar `encryptProfileName()`
- [ ] Actualizar tipo de `profileData.name` a `Buffer | null | undefined`
- [ ] Corregir `updateNotificationSettings`: `name: null` en lugar de `name: ''`
- [ ] Regenerar Prisma Client
- [ ] Verificar usos de `Profile.name` en otros archivos
- [ ] Testing de corrección

---

## 📝 NOTAS IMPORTANTES

### **1. Compatibilidad con Datos Existentes**

Si hay datos en `display_name` (TEXT) que necesitan migrarse:
1. Crear script de migración para encriptar y mover datos
2. Ejecutar migración antes de cambiar schema

### **2. Consistencia con `phone` y `address`**

- `name` seguirá el mismo patrón que `phone` y `address`
- Mismo helper de encriptación
- Mismo manejo de null/undefined

### **3. Testing Incremental**

- Probar cada cambio antes de continuar
- Verificar que no se rompieron otras funcionalidades

---

**Última actualización**: 31 de Enero, 2025  
**Estado**: 📋 PLAN COMPLETO - LISTO PARA IMPLEMENTACIÓN

