# Análisis de Riesgos: Implementación Día 5 (Endurecimiento RLS + Cifrado PII)
**Fecha:** 2025-01-27  
**Rol:** Senior FullStack Developer

---

## RESUMEN EJECUTIVO

**Riesgo principal:** BAJO a MEDIO ⚠️  
La implementación del Día 5 afecta principalmente la **seguridad y permisos** del sistema, pero **NO rompe funcionalidades existentes** si se implementa correctamente.

**Conclusión:** ✅ **PROCEDER CON CUIDADO** - El plan es seguro, pero requiere pruebas exhaustivas.

---

## ANÁLISIS DE RIESGOS POR FASE

### FASE 1: ENDURECER RLS EN `clients` ⚠️ RIESGO BAJO

**Archivos afectados:**
- Ningún archivo de código TypeScript
- Solo migración SQL: `supabase/migrations/20250127_add_fine_rls_to_clients.sql`

**Riesgo:** BAJO ✅

**Razones:**
1. Solo **AÑADE nuevas políticas RLS** (no elimina las existentes)
2. Las políticas actuales son básicas ("org members pueden leer/escribir")
3. Las nuevas políticas son **MÁS restrictivas**, no menos
4. No modifica datos ni estructura

**Flujos que pueden afectar:**
- ❌ **Lista de clientes** (`/workspace/clients`) - PUEDE FALLAR si el usuario no tiene permisos
- ❌ **Búsqueda de clientes** (`BriefForm.tsx`) - PUEDE FALLAR si un miembro intenta crear/actualizar
- ❌ **Creación de casos** (`/api/cases/create`) - PUEDE FALLAR si un "member" intenta crear un caso con un cliente

**Validación requerida:**
1. Probar lectura como **member** (debe funcionar)
2. Probar inserción como **member** (debe FALLAR - esperado)
3. Probar inserción como **admin** (debe funcionar)
4. Probar eliminación como **member** (debe FALLAR - esperado)

---

### FASE 2: IMPLEMENTAR CIFRADO DE PII EN `clients` ⚠️ RIESGO MEDIO-ALTO

**Archivos afectados:**
- Modificación: **Ninguna** (las columnas se agregan, no se eliminan las existentes)
- Nuevo archivo: `src/lib/helpers/clientEncryption.ts`

**Riesgo:** MEDIO-ALTO ⚠️⚠️

**Razón crítica:** 
- ✅ La tabla `clients` **YA usa cifrado** (implementado en Alpha 1.1.1)
- ✅ `clientsDb.ts` YA cifra datos con `encrypt_pii()` 
- ❌ Las columnas cifradas YA EXISTEN (`name_enc`, `email_enc`, etc.)
- ❌ El plan propuesto puede **CONFLICTUAR** con la implementación existente

**Análisis de código actual:**

```typescript
// src/lib/clientsDb.ts (líneas 82-92)
// ✅ YA USA CIFRADO:
INSERT INTO public.clients (org_id, name_enc, email_enc, phone_enc, address_enc)
VALUES (
  ${orgId}::uuid,
  public.encrypt_pii(${clientData.name}), // ✅ YA CIFRA
  ...
)
```

```typescript
// src/lib/clientsDb.ts (líneas 134-141)
// ✅ YA DESENCRIPTA:
SELECT 
  id::text,
  public.decrypt_pii(name_enc) as name, // ✅ YA DESENCRIPTA
  ...
FROM public.clients
```

**Conclusión crítica:** 🚨 **RIESGO CRÍTICO**

El plan propuesto para la Fase 2 intenta **IMPLEMENTAR DE NUEVO** el cifrado que **YA EXISTE**, lo que puede:
1. Duplicar código innecesariamente
2. Romper el flujo de cifrado actual
3. Crear inconsistencias en la base de datos

**Flujos críticos afectados:**
- ❌ **Creación de clientes** (`/api/clients/create`) - YA USA CIFRADO
- ❌ **Lectura de clientes** (`/api/clients/list`) - YA USA DESENCRIPTA
- ❌ **Búsqueda de clientes** (`BriefForm.tsx`) - YA USA DESENCRIPTA
- ❌ **Actualización de clientes** (`/api/clients/[id]/update`) - YA USA CIFRADO

---

### FASE 3: AUDIT LOG PARA OPERACIONES SENSIBLES ⚠️ RIESGO BAJO

**Archivos afectados:**
- Nuevo archivo: `supabase/migrations/20250127_add_audit_trigger_to_clients.sql`
- No modifica código TypeScript

**Riesgo:** BAJO ✅

**Razones:**
1. Solo **AÑADE** un trigger (no modifica datos)
2. La tabla `audit_log` ya existe
3. El trigger solo **REGISTRA**, no bloquea operaciones

**Flujos que pueden afectar:**
- ✅ Ninguno - solo añade registro automático de auditoría

---

### FASE 4: INTEGRAR CIFRADO EN API DE CLIENTES ⚠️ RIESGO CRÍTICO

**Archivos afectados:**
- `src/app/api/clients/create/route.ts`
- `src/app/api/clients/list/route.ts`
- `src/app/api/clients/[id]/route.ts`

**Riesgo:** CRÍTICO 🚨🚨🚨

**Razón crítica:**
- Las APIs **YA usan cifrado** a través de `clientsDb.ts`
- Modificar las APIs para usar "nuevos helpers" puede **ROMPER** el flujo actual

**Análisis de código actual:**

```typescript
// src/app/api/clients/create/route.ts (líneas 23-28)
// ✅ YA USA CIFRADO:
const clientId = await createClient(currentOrg.id, {
  name: name.trim(),
  email: email?.trim() || undefined,
  ...
});
// createClient() de clientsDb.ts YA cifra automáticamente
```

**Conclusión:** 🚨 **NO IMPLEMENTAR FASE 4**

Modificar las APIs actuales puede romper el flujo de cifrado existente.

---

## ARCHIVOS Y FLUJOS AFECTADOS POR FASES

### FASE 1 (RLS Finas): ✅ SEGURA

**Archivos afectados:**
- `supabase/migrations/20250127_add_fine_rls_to_clients.sql` (nuevo)

**Flujos afectados:**
- `/workspace/clients` - Lista de clientes (puede fallar lectura si RLS es muy restrictiva)
- `BriefForm.tsx` - Búsqueda de clientes (puede fallar inserción si user no es admin)

**Riesgo:** BAJO - Solo añade políticas, no elimina

---

### FASE 2 (Cifrado PII): 🚨 RIESGO CRÍTICO

**Archivos afectados:**
- `supabase/migrations/20250127_add_pii_encryption_to_clients.sql` (puede conflictuar)
- `src/lib/helpers/clientEncryption.ts` (nuevo - puede duplicar funcionalidad)

**Flujos afectados:**
- NINGUNO (no debe implementarse)

**Riesgo:** ALTO - Duplicación de código e inconsistencia

---

### FASE 3 (Audit Log): ✅ SEGURA

**Archivos afectados:**
- `supabase/migrations/20250127_add_audit_trigger_to_clients.sql` (nuevo)

**Flujos afectados:**
- NINGUNO - solo registra auditoría

**Riesgo:** BAJO - Solo añade logging

---

### FASE 4 (Integración en APIs): 🚨 RIESGO CRÍTICO

**Archivos afectados:**
- `src/app/api/clients/create/route.ts` (modificar)
- `src/app/api/clients/list/route.ts` (modificar)
- `src/app/api/clients/[id]/route.ts` (modificar)

**Flujos afectados:**
- `/api/clients/create` - Creación de clientes (puede romper cifrado)
- `/api/clients/list` - Lista de clientes (puede romper descifrado)
- `/api/clients/[id]` - Detalle de cliente (puede romper descifrado)
- `BriefForm.tsx` - Búsqueda de clientes (puede fallar)
- `ClientForm.tsx` - Formulario de clientes (puede fallar)
- `CaseBriefForm.tsx` - Validación de clientes (puede fallar)

**Riesgo:** CRÍTICO - Modificar APIs puede romper flujos existentes

---

## TABLA DE IMPACTO POR ARCHIVO

| Archivo | Fase | Tipo de Cambio | Riesgo | ¿Afecta Landing? |
|---------|------|----------------|--------|------------------|
| `supabase/migrations/20250127_add_fine_rls_to_clients.sql` | Fase 1 | Crear | Bajo | No |
| `supabase/migrations/20250127_add_pii_encryption_to_clients.sql` | Fase 2 | Crear | **CRÍTICO** | No |
| `src/lib/helpers/clientEncryption.ts` | Fase 2 | Crear | **CRÍTICO** | No |
| `supabase/migrations/20250127_add_audit_trigger_to_clients.sql` | Fase 3 | Crear | Bajo | No |
| `src/app/api/clients/create/route.ts` | Fase 4 | Modificar | **CRÍTICO** | No |
| `src/app/api/clients/list/route.ts` | Fase 4 | Modificar | **CRÍTICO** | No |
| `src/app/api/clients/[id]/route.ts` | Fase 4 | Modificar | **CRÍTICO** | No |

---

## RECOMENDACIÓN FINAL

### ✅ LO QUE SE DEBE IMPLEMENTAR:

1. **FASE 1 (RLS Finas):** ✅ SEGURA - Solo añade políticas RLS
2. **FASE 3 (Audit Log):** ✅ SEGURA - Solo añade triggers de auditoría

### 🚨 LO QUE NO SE DEBE IMPLEMENTAR:

1. **FASE 2 (Cifrado PII):** 🚨 **NO IMPLEMENTAR** - Ya está implementado en Alpha 1.1.1
2. **FASE 4 (Integración en APIs):** 🚨 **NO IMPLEMENTAR** - Ya está integrado en Alpha 1.1.1

---

## PLAN MODIFICADO PARA DÍA 5

**Implementar solo:**
1. **Políticas RLS finas** en `clients` (Fase 1)
2. **Triggers de auditoría** para `clients` (Fase 3)

**No implementar:**
1. Cifrado de PII (ya implementado)
2. Integración en APIs (ya integrado)

---

## CONCLUSIÓN

**Riesgo de romper funcionalidades:** BAJO ✅

**Recomendación:**
- ✅ Proceder con Fase 1 (RLS finas)
- ✅ Proceder con Fase 3 (Audit log)
- 🚨 **NO proceder** con Fases 2 y 4 (ya implementadas)

**Razón:** El cifrado de PII y la integración en APIs **YA ESTÁN IMPLEMENTADOS** en Alpha 1.1.1, por lo que las Fases 2 y 4 son **redundantes y riesgosas**.

