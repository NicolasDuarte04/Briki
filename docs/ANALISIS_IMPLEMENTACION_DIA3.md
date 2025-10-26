# 📋 ANÁLISIS DETALLADO DE IMPLEMENTACIÓN - DÍA 3
**Fecha:** 2025-10-26  
**Objetivo:** Seeds y Helpers - Explicación de cambios propuestos  
**Principios:** Reutilización máxima, arquitectura dual, consistencia unidireccional, separación de responsabilidades

---

## 🎯 CONTEXTO DE LOS CAMBIOS PROPUESTOS

### Estado Actual (Alpha 1.1.1)
- ✅ Seed Script: Implementado en DÍA 1, crea org dev y cases de prueba
- ✅ POST /api/cases/create: Implementado y funcional
- ✅ ENUM `source_type`: Creado con valores: api, link, pdf, portal
- ⚠️  **CONFLICTO:** Código usa `'upload'` que no existe en el ENUM
- ⚠️  **AUSENTE:** Registro explícito de `audit_log` en creación de cases

### Objetivo DÍA 3 según plan de workflow
1. Script de seed: crear org y usuario dev, y 1-2 cases de prueba
2. Endpoint mínimo POST /api/cases (Next route) para crear case
3. Aceptación: desde Postman/Thunder, crear case y ver en DB + audit_log: created_case

---

## 1️⃣ ANÁLISIS: Cambiar 'upload' por 'portal' o 'pdf' en el API

### ¿Qué es esto?
En la línea 99 de `/src/app/api/cases/create/route.ts`:

```typescript
sourceType: 'upload',  // ❌ NO EXISTE EN EL ENUM
```

### ¿Por qué es un problema?

**Archivo:** `prisma/schema.prisma`

```prisma
enum SourceType {
  api
  link
  pdf      ✅ Existe
  portal   ✅ Existe
  // upload ❌ NO EXISTE
}
```

### Impacto actual en el flujo

**Flujo actual:**
1. Usuario sube PDF en formulario de creación de case
2. API `/api/cases/create` recibe el PDF en `tempUploads`
3. Crea el case con `createCaseWithOrg()`
4. **PROBLEMA:** Al crear el `artifact`, usa `sourceType: 'upload'`
5. PostgreSQL rechaza porque `'upload'` no está en el ENUM
6. **Error:** `invalid input value for enum source_type_enum: "upload"`

### ¿Qué significa el cambio?

**Cambio propuesto:**

**Opción 1: Usar 'pdf'** (Más descriptivo del tipo real)
```typescript
sourceType: 'pdf',  // ✅ Existe en ENUM, describe que es un PDF
```

**Opción 2: Usar 'portal'** (Más general, describe el origen)
```typescript
sourceType: 'portal',  // ✅ Existe en ENUM, describe que viene del portal
```

**Recomendación:** Usar `'pdf'` porque:
- Es más específico sobre el tipo de contenido
- El ENUM tiene `pdf` como valor separado de `portal`
- `portal` podría ser para cualquier archivo desde el portal, no necesariamente PDFs

### Impacto en el flujo después del cambio

**Nuevo flujo:**
1. Usuario sube PDF en formulario
2. API recibe el PDF
3. Crea el case
4. Crea el `artifact` con `sourceType: 'pdf'` ✅
5. PostgreSQL acepta porque `'pdf'` existe en el ENUM
6. Artifact se registra correctamente en la BD

### ¿Qué se afecta?

**Archivos afectados:**
- `/src/app/api/cases/create/route.ts` (línea 99)

**Impacto:**
- ✅ **MÍNIMO:** Solo un cambio de valor de string
- ✅ **No rompe nada:** Es corregir un error existente
- ✅ **No afecta funcionalidad:** Solo hace que funcione correctamente

---

## 2️⃣ ANÁLISIS: Registrar creación en audit_log (alta prioridad)

### ¿Qué es audit_log?

`audit_log` es una tabla de auditoría que registra todas las acciones importantes en el sistema para:
- **Compliance** (cumplimiento normativo)
- **Trazabilidad** (quién hizo qué y cuándo)
- **Seguridad** (detección de accesos no autorizados)
- **Análisis** (análisis de uso del sistema)

### Estructura de audit_log

**Archivo:** `prisma/schema.prisma`

```prisma
model AuditLog {
  id          String   @id
  caseId      String   // FK a cases
  actor       String   // Email del usuario o "system"
  action      String   // Ejemplo: "created_case", "deleted_case"
  tool        String?  // Módulo que ejecutó la acción: "cases", "artifacts"
  payloadHash String?  // Hash SHA256 del payload (integridad)
  payload     Json?    // Datos completos de la acción (old/new state)
  createdAt   DateTime
}
```

### ¿Por qué no se está implementando ahora?

**Situación actual:**

Existe un **TRIGGER AUTOMÁTICO** en PostgreSQL que YA registra cambios en `cases` y `artifacts`:

**Archivo:** `supabase/migrations/20250107_complete_rls_implementation.sql`

```sql
-- Trigger para auditoría en cases
CREATE TRIGGER audit_cases_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();
```

**¿Qué hace el trigger?**
- Detecta INSERT, UPDATE, DELETE en `cases` y `artifacts`
- **Registra automáticamente** en `audit_log`:
  - `action`: 'INSERT', 'UPDATE', 'DELETE'
  - `tool`: nombre de la tabla
  - `payload`: estado anterior (old) y nuevo (new)
  - `case_id`: ID del caso afectado
  - `user_id`: ID del usuario (de `auth.uid()`)

### ¿Qué está ocurriendo en el flujo actual?

**Flujo actual:**
1. Usuario crea case vía POST /api/cases/create
2. `createCaseWithOrg()` crea el case en la BD
3. **El trigger POSTGRESQL automáticamente** registra en `audit_log`:
   - `action: 'INSERT'`
   - `tool: 'cases'`
   - `payload: {old: null, new: {...datos del case...}}`
4. **PERO:** Este registro es **genérico** y no específico de la acción del usuario

### ¿Por qué necesitamos registro explícito además del trigger?

**Limitaciones del trigger automático:**
1. No captura el contexto de negocio (ej: "case creado desde formulario" vs "case creado desde API")
2. No registra acciones específicas del usuario (ej: "approved_proposal", "uploaded_document")
3. El `payload` es genérico (todos los campos del case), no específico
4. No permite registrar acciones que no son INSERT/UPDATE/DELETE (ej: "viewed_case", "downloaded_pdf")

**Ventajas del registro explícito:**
1. Puede registrar acciones específicas: `"created_case"`, `"updated_client"`, `"uploaded_artifact"`
2. Puede capturar contexto adicional: `tool: "case_form"`, `tool: "api"`, `tool: "chat"`
3. Permite registro granular de acciones de negocio, no solo cambios en BD

### ¿Cómo nos ayuda el registro explícito?

**Ejemplo de un flujo con registro explícito:**

```typescript
// Crear case
const newCase = await createCaseWithOrg(...);

// Registrar en audit_log
await recordAuditLog({
  caseId: newCase.id,
  actor: user.email,
  action: 'created_case',  // Específico
  tool: 'case_form',       // Contexto: desde formulario
  payload: {
    clientName: data.clientName,
    priority: data.priority,
    // Solo datos relevantes para auditoría
  }
});
```

**Resultado en audit_log:**
```json
{
  "actor": "usuario@ejemplo.com",
  "action": "created_case",
  "tool": "case_form",
  "payload": {
    "clientName": "Cliente XYZ",
    "priority": "high"
  }
}
```

**Beneficios:**
- ✅ Compliance: Se registra quién creó el case y desde dónde
- ✅ Trazabilidad: Se puede rastrear el flujo completo
- ✅ Análisis: Se puede analizar cuántos cases se crean por formulario vs API
- ✅ Seguridad: Se puede detectar accesos sospechosos

### ¿Por qué alta prioridad?

Aunque el trigger automático YA registra los cambios, el registro explícito es importante porque:
1. Captura contexto de negocio específico (no solo el cambio técnico)
2. Es requerido para compliance en muchas industrias (seguros, finanzas)
3. Permite análisis más granular de uso del sistema
4. Facilita debugging y soporte

### ¿Qué se necesita implementar?

**Archivo:** `/src/lib/audit.ts`

Ya existe la función:

```typescript
export async function recordAuditLog(input: RecordAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      caseId: input.caseId,
      actor: input.actor,
      action: input.action,
      tool: input.tool ?? null,
      payloadHash: payloadHash,
      payload: input.payload,
    },
  });
}
```

**Cambio necesario en:** `/src/app/api/cases/create/route.ts`

```typescript
// Después de crear el case
const newCase = await createCaseWithOrg(...);

// Agregar esto:
await recordAuditLog({
  caseId: newCase.id,
  actor: user.email || user.id,
  action: 'created_case',
  tool: 'cases_api',
  payload: {
    clientName,
    status: newCase.status,
    stage: newCase.stage,
  }
});
```

### Impacto en el flujo después del cambio

**Nuevo flujo:**
1. Usuario crea case vía POST /api/cases/create
2. `createCaseWithOrg()` crea el case
3. **El trigger PostgreSQL** registra en `audit_log` (genérico)
4. **El registro explícito** registra en `audit_log` (específico)
5. **Resultado:** Dos registros complementarios en `audit_log`:
   - Trigger: `action: 'INSERT'`, `tool: 'cases'`
   - Explícito: `action: 'created_case'`, `tool: 'cases_api'`

**Beneficios:**
- Trazabilidad completa
- Contexto específico
- Compliance
- Análisis granular

---

## 3️⃣ ANÁLISIS: Validar que el endpoint funcione con Postman/Thunder

### ¿Qué son Postman y Thunder?

**Postman:**
- Aplicación de escritorio para probar APIs
- Permite enviar peticiones HTTP (GET, POST, PUT, DELETE)
- Permite configurar headers, body, autenticación
- Útil para probar APIs sin interfaz de usuario

**Thunder Client:**
- Extensión de VS Code para probar APIs
- Similar a Postman pero integrado en VS Code
- Permite enviar peticiones HTTP directamente desde el editor

### ¿Qué pasa ahora mismo con estos aspectos?

**Situación actual:**
- El endpoint POST /api/cases/create existe y está funcionando
- Es llamado desde el formulario de creación de cases en la UI
- **Pero:** No ha sido probado directamente con Postman/Thunder

### ¿Por qué necesitamos probarlo con Postman/Thunder?

**Propósito de la prueba:**
1. Validar que el endpoint funciona sin la UI
2. Verificar que el schema de datos es correcto
3. Probar casos edge (datos faltantes, validaciones)
4. Simular diferentes escenarios de uso
5. Documentar el contrato de la API (request/response)

### ¿Qué nos va a proveer el agregar estas implementaciones?

**Antes de los cambios propuestos:**
- ❌ Probar con Postman fallaría porque `sourceType: 'upload'` no existe
- ❌ No habría registro específico en `audit_log`

**Después de los cambios propuestos:**
- ✅ Probar con Postman funcionará correctamente
- ✅ Se registrará correctamente en `audit_log`
- ✅ Se podrá documentar el uso correcto de la API

### Proceso de validación propuesto

**1. Probar crear case sin PDF:**
```bash
POST http://localhost:3000/api/cases/create
Headers:
  Content-Type: application/json

Body:
{
  "orgId": "org-uuid",
  "userId": "user-uuid",
  "clientName": "Test Client",
  "clientRef": "TEST-001",
  "businessType": "SME",
  "employees": 10,
  "status": "draft",
  "stage": "initial",
  "priority": "medium",
  "briefData": {
    "freeText": "This is a test case"
  }
}
```

**Resultado esperado:**
- Status: 201 Created
- Body: `{ "success": true, "caseId": "...", "case": {...} }`
- BD: Caso creado en `cases`
- BD: Registro en `audit_log` con `action: 'created_case'`

**2. Probar crear case con PDF:**
```bash
POST http://localhost:3000/api/cases/create
Body:
{
  ...
  "tempUploads": [
    {
      "storagePath": "temp/user-uuid/file.pdf",
      "fileName": "document.pdf",
      "fileSize": 12345,
      "fileHash": "sha256...",
      "extractedText": "Texto extraído del PDF"
    }
  ]
}
```

**Resultado esperado:**
- Status: 201 Created
- Body: `{ "success": true, "caseId": "...", "case": {...} }`
- BD: Caso creado
- BD: Artifact creado con `sourceType: 'pdf'` ✅
- BD: Registro en `audit_log`

---

## 📊 RESUMEN EJECUTIVO

### Resumen de cambios propuestos

| Cambio | Impacto | Prioridad | Archivos afectados |
|--------|---------|-----------|-------------------|
| Corregir `sourceType: 'upload'` → `'pdf'` | Mínimo (corrige error) | Alta | `/src/app/api/cases/create/route.ts` |
| Agregar registro en `audit_log` | Medio (feature nuevo) | Alta | `/src/app/api/cases/create/route.ts` |
| Probar con Postman/Thunder | Validación | Media | Ninguno (testing) |

### Flujo actual vs flujo propuesto

**Flujo actual:**
1. ❌ Código usa `sourceType: 'upload'` (no existe)
2. ⚠️  Solo trigger automático registra en audit_log
3. ✅ Endpoint funciona desde la UI

**Flujo propuesto:**
1. ✅ Código usa `sourceType: 'pdf'` (existe)
2. ✅ Registro explícito en audit_log con contexto
3. ✅ Endpoint funciona desde la UI Y desde Postman/Thunder

### Conclusión

Los cambios propuestos son:
- ✅ **Minimalistas:** Solo corrigen errores y mejoran funcionalidad
- ✅ **No rompen nada:** Son correcciones y mejoras incrementales
- ✅ **Alineados con principios:** Reutilizan código existente, no cambian arquitectura
- ✅ **Orientados a compliance:** Mejoran la trazabilidad del sistema

---

**Autor:** Asistente IA (Claude)  
**Fecha:** 2025-10-26  
**Versión:** 1.0
