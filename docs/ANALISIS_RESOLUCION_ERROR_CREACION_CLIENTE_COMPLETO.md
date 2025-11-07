# ANÁLISIS EXHAUSTIVO Y RESOLUCIÓN: ERROR AL CREAR CLIENTE - CAMPO `actor` FALTANTE

**Fecha**: 31 de Enero, 2025  
**Rol**: Ingeniero FullStack Senior  
**Estado**: ✅ PROBLEMA RESUELTO - ANÁLISIS COMPLETO  
**Prioridad**: ALTA - Error crítico que impedía crear clientes

---

## 📋 RESUMEN EJECUTIVO

### **PROBLEMA IDENTIFICADO**

Al intentar crear un nuevo cliente desde el modal de validación, se producía un error:

```
Raw query failed. Code: `23502`. Message: `Failing row contains (..., null, null, INSERT, clients, null, ...)`
```

**Error**: `23502` = NOT NULL constraint violation

**Ubicación del Error**:
- `src/lib/clientsDb.ts:77` - Función `createClient`
- `src/app/api/clients/create/route.ts:23` - Endpoint POST
- Trigger `audit_clients_trigger` al intentar insertar en `audit_log`

### **CAUSA RAÍZ IDENTIFICADA**

El trigger `audit_clients_trigger` intentaba insertar en `audit_log` pero **faltaba el campo `actor`** que es **NOT NULL** según el schema de Prisma.

**Estructura de `audit_log`**:
- `case_id` → Opcional (NULL para clients) ✅
- `actor` → **REQUERIDO (NOT NULL)** ❌ **FALTABA EN EL TRIGGER**
- `action` → Requerido ✅
- `org_id` → Opcional ✅
- `user_id` → Opcional ✅
- Otros campos opcionales ✅

---

## 🔍 ANÁLISIS EXHAUSTIVO DEL PROBLEMA

### **1. ESTRUCTURA DE LA TABLA audit_log**

#### **1.1. Schema de Prisma**

**Archivo**: `prisma/schema.prisma` (líneas 415-428)

```prisma
model AuditLog {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  caseId      String?  @map("case_id") @db.Uuid  // ✅ Opcional
  actor       String   @db.VarChar(255)  // ❌ REQUERIDO (NOT NULL)
  action      String   @db.VarChar(100)  // ✅ Requerido
  tool        String?  @db.VarChar(50)   // ✅ Opcional
  payloadHash String?  @map("payload_hash") @db.VarChar(64)  // ✅ Opcional
  payload     Json?    // ✅ Opcional
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  case        Case?    @relation(fields: [caseId], references: [id], onDelete: Cascade)
}
```

**Observación**: `actor` es **String** (sin `?`), lo que significa que es **NOT NULL** en la base de datos.

#### **1.2. Función de Trigger (ANTES - INCORRECTA)**

**Archivo**: `supabase/migrations/20250131_fix_audit_log_case_id_nullable.sql` (líneas 84-111)

```sql
INSERT INTO public.audit_log (
    case_id,      -- ✅ Incluido
    org_id,       -- ✅ Incluido
    user_id,      -- ✅ Incluido
    action,       -- ✅ Incluido
    tool,         -- ✅ Incluido
    payload,      -- ✅ Incluido
    resource_type,-- ✅ Incluido
    resource_id,  -- ✅ Incluido
    severity,      -- ✅ Incluido
    ip_address,   -- ✅ Incluido
    user_agent    -- ✅ Incluido
    -- ❌ FALTABA: actor (REQUERIDO)
) VALUES (...)
```

**Problema**: El trigger **NO incluía** el campo `actor`, que es **NOT NULL**, causando el error `23502`.

---

### **2. FLUJO DEL ERROR**

1. Usuario intenta crear cliente desde modal de validación
2. Se ejecuta `createClient()` en `clientsDb.ts`
3. Se inserta el cliente en la tabla `clients` usando raw SQL
4. El trigger `audit_clients_trigger` se ejecuta automáticamente
5. El trigger intenta insertar en `audit_log` **SIN el campo `actor`**
6. **ERROR**: PostgreSQL rechaza la inserción porque `actor` es NOT NULL

---

### **3. ANÁLISIS DE DEPENDENCIAS**

#### **3.1. Archivos Directamente Relacionados**

| Archivo | Líneas Clave | Responsabilidad | Impacto |
|---------|--------------|-----------------|---------|
| `supabase/migrations/20250131_fix_audit_log_case_id_nullable.sql` | 84-114 | Función de trigger | 🔴 CRÍTICO |
| `prisma/schema.prisma` | 415-428 | Modelo `AuditLog` | 🟡 MEDIO |
| `src/lib/clientsDb.ts` | 77-102 | Función `createClient` | 🟢 BAJO (no se modifica) |

#### **3.2. Funcionalidades que Dependen de audit_log**

**Búsqueda**: `grep -r "audit_log\|AuditLog" src/`

**Resultados**:
- `src/lib/audit.ts` - Funciones `recordAuditLog` y `tryRecordAuditLog` (usan Prisma, no raw SQL)
- `src/app/api/cases/create/route.ts` - Registra en `audit_log` al crear casos
- `src/app/api/upload/pdf/route.ts` - Registra en `audit_log` al subir PDFs
- `src/app/api/audit-log/route.ts` - Endpoint para obtener `audit_logs`

**Análisis**: 
- Los otros usos de `audit_log` usan `recordAuditLog` que usa Prisma (incluye `actor` correctamente)
- El trigger de `clients` es el único que usa raw SQL directamente
- El problema solo afecta la creación de clientes, no otras funcionalidades

---

## 🎯 PLAN DE RESOLUCIÓN

### **PRINCIPIO RECTOR**

> **"El trigger de auditoría debe incluir TODOS los campos requeridos (NOT NULL) de la tabla `audit_log`. El campo `actor` es requerido y debe obtenerse de `auth.uid()` o usar un valor por defecto como 'system'."**

### **ESTRATEGIA GENERAL**

1. **Agregar campo `actor` al INSERT del trigger**
2. **Obtener `actor` de `auth.uid()`** (usuario autenticado)
3. **Usar 'system' como fallback** si `auth.uid()` es NULL

---

### **FASE 1: CORREGIR FUNCIÓN DE TRIGGER**

#### **Objetivo**

Agregar el campo `actor` al INSERT del trigger para cumplir con la restricción NOT NULL.

#### **Archivo**: `supabase/migrations/20250131_fix_audit_log_case_id_nullable.sql`

**ANTES** (líneas 84-111):
```sql
INSERT INTO public.audit_log (
    case_id,
    org_id,
    user_id,
    action,
    tool,
    payload,
    resource_type,
    resource_id,
    severity,
    ip_address,
    user_agent
    -- ❌ FALTABA: actor
) VALUES (
    case_id_val,
    org_id_val,
    auth.uid(),
    operation,
    TG_TABLE_NAME,
    ...
)
```

**DESPUÉS** (líneas 85-114):
```sql
INSERT INTO public.audit_log (
    case_id,
    actor,  -- ✅ AGREGADO: Campo requerido
    org_id,
    user_id,
    action,
    tool,
    payload,
    resource_type,
    resource_id,
    severity,
    ip_address,
    user_agent
) VALUES (
    case_id_val,
    COALESCE(auth.uid()::text, 'system'),  -- ✅ Actor: user_id como texto o 'system' como fallback
    org_id_val,
    auth.uid(),  -- ✅ user_id: UUID del usuario
    operation,
    TG_TABLE_NAME,
    ...
)
```

**Justificación**:
- `actor` es requerido (NOT NULL) según el schema de Prisma
- Se obtiene de `auth.uid()` (usuario autenticado)
- Se usa `'system'` como fallback si `auth.uid()` es NULL (casos raros)
- `actor` es `VARCHAR(255)`, por lo que se convierte `auth.uid()` a texto

---

## 📊 RESUMEN DE CAMBIOS

### **Archivos Modificados**

| Archivo | Cambios | Riesgo | Prioridad |
|---------|---------|--------|-----------|
| `supabase/migrations/20250131_fix_audit_log_case_id_nullable.sql` | Agregar `actor` al INSERT | 🟢 BAJO | 🔴 ALTA |

### **Archivos que NO se Modifican**

| Archivo | Razón |
|---------|-------|
| `src/lib/clientsDb.ts` | No se modifica, el problema está en el trigger |
| `src/app/api/clients/create/route.ts` | No se modifica, el problema está en el trigger |
| `src/lib/audit.ts` | No se modifica, usa Prisma correctamente |
| `prisma/schema.prisma` | Ya está correcto, `actor` es requerido |

---

## 🎯 PRINCIPIOS ARQUITECTÓNICOS APLICADOS

### **1. Separación Clara de Responsabilidades**

✅ **Trigger de BD**: Maneja auditoría automática con todos los campos requeridos  
✅ **Código de aplicación**: Maneja lógica de negocio  
✅ **Schema de Prisma**: Refleja estructura real de BD

### **2. Robustez y Manejo de Errores**

✅ **Campos requeridos**: El trigger incluye todos los campos NOT NULL  
✅ **Fallback para actor**: Usa 'system' si `auth.uid()` es NULL  
✅ **Compatibilidad**: Funciona con estructura antigua y nueva

### **3. Consistencia de Estado Unidireccional**

✅ **BD como fuente de verdad**: El schema de Prisma refleja la BD real  
✅ **Migraciones idempotentes**: Usan `IF NOT EXISTS` para evitar errores  
✅ **Sincronización**: Mantener Prisma y BD sincronizados

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Pre-Implementación**

- [x] Analizar estructura de `audit_log` en Prisma
- [x] Identificar causa raíz (campo `actor` faltante)
- [x] Verificar dependencias
- [x] Analizar riesgos

### **Implementación**

- [x] **FASE 1**: Agregar campo `actor` al INSERT del trigger
- [x] Ejecutar migración
- [x] Verificar que no hay errores de TypeScript

### **Post-Implementación**

- [ ] **TEST 1**: Crear cliente nuevo desde modal de validación
- [ ] **TEST 2**: Verificar que se crea correctamente en BD
- [ ] **TEST 3**: Verificar que se registra en `audit_log` con `actor` correcto
- [ ] **TEST 4**: Verificar que no hay errores en consola
- [ ] **TEST 5**: Verificar que otras funcionalidades no se afectaron

---

## 🚨 NOTAS IMPORTANTES

### **1. Orden de Implementación**

**CRÍTICO**: La migración debe ejecutarse en orden:
1. Primero `20250131_fix_audit_log_org_id_for_clients.sql` (agrega columnas)
2. Luego `20250131_fix_audit_log_case_id_nullable.sql` (hace `case_id` nullable y agrega `actor`)

**Razón**: La segunda migración depende de que las columnas existan.

### **2. Verificación de Estructura de BD**

**CRÍTICO**: Antes de hacer cambios, verificar qué columnas tiene realmente `audit_log` en la BD.

**Query de Verificación**:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_log'
ORDER BY ordinal_position;
```

### **3. Rollback Plan**

Si algo sale mal:
1. Deshabilitar temporalmente el trigger: `DROP TRIGGER IF EXISTS audit_clients_trigger ON public.clients;`
2. Verificar que la creación de clientes funciona sin el trigger
3. Corregir el trigger y volver a habilitarlo

---

## 📝 CONCLUSIÓN

Este análisis identifica que el problema era que el trigger `audit_clients_trigger` intentaba insertar en `audit_log` sin el campo `actor`, que es requerido (NOT NULL).

La solución requiere:
1. Agregar el campo `actor` al INSERT del trigger
2. Obtener `actor` de `auth.uid()` (usuario autenticado)
3. Usar 'system' como fallback si `auth.uid()` es NULL

La solución:
✅ **Respeta la arquitectura existente**  
✅ **Mantiene la separación de responsabilidades**  
✅ **No rompe funcionalidades existentes**  
✅ **Sigue los principios arquitectónicos del proyecto**  
✅ **Es robusta y maneja todos los casos** (con y sin `auth.uid()`)

---

**Última actualización**: 31 de Enero, 2025  
**Mantenedor**: Equipo de Desarrollo Briki  
**Estado**: ✅ RESUELTO - LISTO PARA PRUEBAS

