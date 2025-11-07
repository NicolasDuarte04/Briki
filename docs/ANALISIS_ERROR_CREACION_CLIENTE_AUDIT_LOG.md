# ANÁLISIS EXHAUSTIVO: ERROR AL CREAR CLIENTE - COLUMNA org_id NO EXISTE EN audit_log

**Fecha**: 31 de Enero, 2025  
**Rol**: Ingeniero FullStack Senior  
**Estado**: 🔴 PROBLEMA IDENTIFICADO - ANÁLISIS COMPLETO  
**Prioridad**: ALTA - Error crítico que impide crear clientes

---

## 📋 RESUMEN EJECUTIVO

### **PROBLEMA IDENTIFICADO**

Al intentar crear un nuevo cliente desde el panel derecho cuando el cliente no existe, se produce un error:

```
Raw query failed. Code: `42703`. Message: `column "org_id" of relation "audit_log" does not exist`
```

**Ubicación del Error**:
- `src/lib/clientsDb.ts:77` - Función `createClient`
- `src/app/api/clients/create/route.ts:23` - Endpoint POST

**Flujo del Error**:
1. Usuario intenta crear cliente desde modal de validación
2. Se ejecuta `createClient()` en `clientsDb.ts`
3. Se inserta el cliente en la tabla `clients`
4. El trigger `audit_clients_trigger` se ejecuta automáticamente
5. El trigger intenta insertar en `audit_log` con `org_id`
6. **ERROR**: La columna `org_id` no existe en la tabla `audit_log`

---

## 🔍 ANÁLISIS EXHAUSTIVO DEL PROBLEMA

### **1. ESTRUCTURA DE LA TABLA audit_log**

#### **1.1. Schema de Prisma**

**Archivo**: `prisma/schema.prisma` (líneas 415-428)

```prisma
model AuditLog {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  caseId      String   @map("case_id") @db.Uuid
  actor       String   @db.VarChar(255)
  action      String   @db.VarChar(100)
  tool        String?  @db.VarChar(50)
  payloadHash String?  @map("payload_hash") @db.VarChar(64)
  payload     Json?
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  case        Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)

  @@map("audit_log")
  @@schema("public")
}
```

**Observación**: El modelo `AuditLog` en Prisma **NO tiene** `org_id`. Solo tiene `caseId` como relación con `Case`.

#### **1.2. Migraciones que Modifican audit_log**

**Migración 1**: `20250107_improve_existing_tables.sql` (líneas 64-72)

```sql
ALTER TABLE public.audit_log
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS session_id uuid,
ADD COLUMN IF NOT EXISTS resource_type text,
ADD COLUMN IF NOT EXISTS resource_id uuid,
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'));
```

**Observación**: Esta migración **agrega** `org_id` a `audit_log`, pero:
- Usa `ADD COLUMN IF NOT EXISTS`, lo que significa que solo se agrega si no existe
- Si la migración no se ejecutó o se revirtió, la columna no existe

**Migración 2**: `20250127_add_audit_trigger_to_clients.sql` (líneas 37-48)

```sql
INSERT INTO public.audit_log (
    org_id,  -- ❌ PROBLEMA: Intenta usar org_id que puede no existir
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
    COALESCE(NEW.org_id, OLD.org_id),  -- ❌ PROBLEMA: Intenta obtener org_id de clients
    ...
)
```

**Observación**: Esta función de trigger **asume** que `org_id` existe en `audit_log`, pero puede no existir si la migración anterior no se ejecutó.

---

### **2. CAUSA RAÍZ IDENTIFICADA**

#### **2.1. Problema Principal: Desajuste entre Migraciones y Schema de Prisma**

**Problema 1**: El schema de Prisma no refleja la estructura real de la BD

- **Prisma Schema**: `AuditLog` solo tiene `caseId`, `actor`, `action`, etc. (NO tiene `org_id`)
- **Migración**: Agrega `org_id` a `audit_log` en la BD
- **Trigger**: Intenta usar `org_id` que puede no existir

**Problema 2**: Función de trigger sobrescrita incorrectamente

- **Función Original** (`20250107_complete_rls_implementation.sql`): Maneja `case_id` y `org_id` para cases/artifacts
- **Función Nueva** (`20250127_add_audit_trigger_to_clients.sql`): Sobrescribe la función y **elimina** `case_id`, solo maneja `org_id`
- **Resultado**: La función nueva no es compatible con la estructura original de `audit_log`

**Problema 3**: La columna `org_id` puede no existir en la BD

- Si la migración `20250107_improve_existing_tables.sql` no se ejecutó, `org_id` no existe
- El trigger intenta insertar `org_id` y falla

---

### **3. ANÁLISIS DE DEPENDENCIAS**

#### **3.1. Archivos Directamente Relacionados**

| Archivo | Líneas Clave | Responsabilidad | Impacto |
|---------|--------------|-----------------|---------|
| `src/lib/clientsDb.ts` | 77-102 | Función `createClient` | 🔴 CRÍTICO |
| `src/app/api/clients/create/route.ts` | 23 | Endpoint POST | 🔴 CRÍTICO |
| `supabase/migrations/20250127_add_audit_trigger_to_clients.sql` | 14-66 | Función de trigger | 🔴 CRÍTICO |
| `supabase/migrations/20250107_improve_existing_tables.sql` | 64-72 | Agregar `org_id` a `audit_log` | 🟡 MEDIO |
| `prisma/schema.prisma` | 415-428 | Modelo `AuditLog` | 🟡 MEDIO |

#### **3.2. Flujos que Dependen de audit_log**

**Búsqueda**: `grep -r "audit_log\|AuditLog" src/`

**Resultados**:
- `src/lib/audit.ts` - Funciones `recordAuditLog` y `tryRecordAuditLog`
- `src/app/api/cases/create/route.ts` - Registra en `audit_log` al crear casos
- `src/app/api/upload/pdf/route.ts` - Registra en `audit_log` al subir PDFs
- `src/app/api/audit-log/route.ts` - Endpoint para obtener `audit_logs`

**Análisis**: 
- Los otros usos de `audit_log` usan `recordAuditLog` que usa Prisma (no raw SQL)
- El trigger de `clients` es el único que usa raw SQL directamente
- El problema solo afecta la creación de clientes, no otras funcionalidades

---

### **4. ANÁLISIS DE RIESGOS Y FUNCIONALIDADES SUSCEPTIBLES**

#### **4.1. Funcionalidades que NO se Afectan**

✅ **Creación de casos**: Usa `recordAuditLog` que usa Prisma, no raw SQL  
✅ **Subida de PDFs**: Usa `tryRecordAuditLog` que usa Prisma, no raw SQL  
✅ **Lectura de audit_logs**: Usa Prisma, no raw SQL  
✅ **Otras operaciones de clientes**: No usan triggers de auditoría

#### **4.2. Funcionalidades que SÍ se Afectan (Requieren Verificación)**

🟡 **Creación de clientes**: Falla completamente debido al trigger  
🟡 **Actualización de clientes**: Puede fallar si el trigger se ejecuta  
🟡 **Eliminación de clientes**: Puede fallar si el trigger se ejecuta

---

## 🎯 PLAN DE RESOLUCIÓN DETALLADO

### **PRINCIPIO RECTOR**

> **"La función de trigger debe ser compatible con la estructura real de la tabla `audit_log` en la BD. Si `org_id` no existe, el trigger debe manejar esto correctamente. Si `org_id` existe, debe usarlo. La solución debe ser robusta y funcionar en ambos casos."**

### **ESTRATEGIA GENERAL**

1. **Verificar estructura real de `audit_log` en la BD**
2. **Corregir la función de trigger para manejar ambos casos** (con y sin `org_id`)
3. **Actualizar el schema de Prisma** si es necesario para reflejar la estructura real
4. **Asegurar que la migración se ejecute** si `org_id` debe existir

---

### **FASE 1: CORREGIR FUNCIÓN DE TRIGGER PARA CLIENTS**

#### **Objetivo**

Modificar la función `audit_trigger_function()` en `20250127_add_audit_trigger_to_clients.sql` para que:
1. Verifique si `org_id` existe en `audit_log` antes de usarlo
2. Maneje correctamente el caso cuando `org_id` no existe
3. Sea compatible con la estructura original de `audit_log` (con `case_id`)

#### **Archivo**: `supabase/migrations/20250127_add_audit_trigger_to_clients.sql`

**Problema Identificado**:

La función actual (líneas 14-66) intenta insertar `org_id` directamente sin verificar si existe:

```sql
INSERT INTO public.audit_log (
    org_id,  -- ❌ Falla si la columna no existe
    user_id,
    ...
) VALUES (
    COALESCE(NEW.org_id, OLD.org_id),  -- ❌ Falla si org_id no existe en audit_log
    ...
)
```

**Solución Requerida**:

1. **Opción A (Recomendada)**: Modificar la función para verificar dinámicamente qué columnas existen
2. **Opción B**: Asegurar que la migración `20250107_improve_existing_tables.sql` se ejecute primero
3. **Opción C**: Crear una función de trigger específica para clients que no requiera `org_id`

**Implementación Recomendada (Opción A)**:

Modificar la función para que:
- Si `org_id` existe en `audit_log`, usarlo
- Si `org_id` NO existe, omitirlo y usar solo los campos básicos
- Mantener compatibilidad con la estructura original (con `case_id`)

---

### **FASE 2: VERIFICAR Y EJECUTAR MIGRACIÓN DE org_id**

#### **Objetivo**

Asegurar que la columna `org_id` existe en `audit_log` si es necesaria.

#### **Archivo**: `supabase/migrations/20250107_improve_existing_tables.sql`

**Verificación**:
- La migración usa `ADD COLUMN IF NOT EXISTS`, lo que es seguro
- Si la migración no se ejecutó, debemos ejecutarla
- Si la migración se ejecutó pero se revirtió, debemos ejecutarla de nuevo

**Acción**:
- Verificar si la migración se ejecutó en la BD
- Si no se ejecutó, ejecutarla manualmente o crear una nueva migración

---

### **FASE 3: ACTUALIZAR SCHEMA DE PRISMA**

#### **Objetivo**

Actualizar el modelo `AuditLog` en Prisma para reflejar la estructura real de la BD.

#### **Archivo**: `prisma/schema.prisma`

**Problema**: El modelo `AuditLog` no tiene `org_id` aunque la migración lo agrega.

**Solución**: Agregar `orgId` al modelo `AuditLog` si la columna existe en la BD.

**Consideración**: 
- Si `org_id` es opcional (puede ser NULL), debemos marcarlo como opcional
- Si `org_id` es requerido, debemos marcarlo como requerido
- Debemos verificar la estructura real de la BD antes de actualizar Prisma

---

## 📊 RESUMEN DE CAMBIOS

### **Archivos a Modificar**

| Archivo | Cambios | Riesgo | Prioridad |
|---------|---------|--------|-----------|
| `supabase/migrations/20250127_add_audit_trigger_to_clients.sql` | Corregir función de trigger | 🟡 MEDIO | 🔴 ALTA |
| `prisma/schema.prisma` | Agregar `orgId` a `AuditLog` (si existe en BD) | 🟢 BAJO | 🟡 MEDIA |

### **Archivos que NO se Modifican**

| Archivo | Razón |
|---------|-------|
| `src/lib/clientsDb.ts` | No se modifica, el problema está en el trigger |
| `src/app/api/clients/create/route.ts` | No se modifica, el problema está en el trigger |
| `src/lib/audit.ts` | No se modifica, usa Prisma correctamente |

---

## 🎯 PRINCIPIOS ARQUITECTÓNICOS APLICADOS

### **1. Separación Clara de Responsabilidades**

✅ **Trigger de BD**: Maneja auditoría automática  
✅ **Código de aplicación**: Maneja lógica de negocio  
✅ **Schema de Prisma**: Refleja estructura real de BD

### **2. Robustez y Manejo de Errores**

✅ **Verificación de columnas**: El trigger debe verificar qué columnas existen  
✅ **Compatibilidad hacia atrás**: Funcionar con estructura antigua y nueva  
✅ **Manejo de errores**: No fallar si columnas opcionales no existen

### **3. Consistencia de Estado Unidireccional**

✅ **BD como fuente de verdad**: El schema de Prisma debe reflejar la BD real  
✅ **Migraciones idempotentes**: Usar `IF NOT EXISTS` para evitar errores  
✅ **Sincronización**: Mantener Prisma y BD sincronizados

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Pre-Implementación**

- [x] Analizar estructura de `audit_log` en migraciones
- [x] Identificar causa raíz (desajuste entre trigger y estructura de BD)
- [x] Verificar dependencias
- [x] Analizar riesgos

### **Implementación**

- [ ] **FASE 1**: Corregir función de trigger para manejar ambos casos (con y sin `org_id`)
- [ ] **FASE 2**: Verificar y ejecutar migración de `org_id` si es necesaria
- [ ] **FASE 3**: Actualizar schema de Prisma para reflejar estructura real
- [ ] Ejecutar migraciones
- [ ] Verificar que no hay errores de TypeScript

### **Post-Implementación**

- [ ] **TEST 1**: Crear cliente nuevo desde modal de validación
- [ ] **TEST 2**: Verificar que se crea correctamente en BD
- [ ] **TEST 3**: Verificar que se registra en `audit_log` (si aplica)
- [ ] **TEST 4**: Verificar que no hay errores en consola
- [ ] **TEST 5**: Verificar que otras funcionalidades no se afectaron

---

## 🚨 NOTAS IMPORTANTES

### **1. Orden de Implementación**

**CRÍTICO**: 
1. Primero verificar estructura real de `audit_log` en la BD
2. Luego corregir la función de trigger según la estructura real
3. Finalmente actualizar schema de Prisma si es necesario

**Razón**: Necesitamos saber qué estructura tiene la BD antes de corregir el trigger.

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

Este análisis identifica que el problema es un desajuste entre:
1. La función de trigger que intenta usar `org_id` en `audit_log`
2. La estructura real de `audit_log` en la BD que puede no tener `org_id`

La solución requiere:
1. Verificar la estructura real de `audit_log` en la BD
2. Corregir la función de trigger para manejar ambos casos (con y sin `org_id`)
3. Asegurar que las migraciones se ejecuten correctamente
4. Actualizar el schema de Prisma para reflejar la estructura real

La solución:
✅ **Respeta la arquitectura existente**  
✅ **Mantiene la separación de responsabilidades**  
✅ **No rompe funcionalidades existentes**  
✅ **Sigue los principios arquitectónicos del proyecto**  
✅ **Es robusta y maneja ambos casos** (con y sin `org_id`)

---

**Última actualización**: 31 de Enero, 2025  
**Mantenedor**: Equipo de Desarrollo Briki  
**Estado**: 🔴 LISTO PARA IMPLEMENTACIÓN

