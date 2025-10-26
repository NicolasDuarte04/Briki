# Análisis Integral: Implementación Día 5 (Endurecimiento RLS + Cifrado PII)
**Fecha:** 2025-01-27  
**Rol:** Senior FullStack Developer

---

## RESUMEN EJECUTIVO

El Día 5 tiene como objetivo **endurecer la seguridad del sistema** mediante dos pilares:
1. **Políticas RLS finas** (owner/org_member)
2. **Cifrado de PII** (Personally Identifiable Information)

**Estado actual:** Las bases están implementadas (Día 1), pero requieren refinamiento y extensión.

---

## ANÁLISIS INTEGRAL DEL DÍA 5

### 1. COHERENCIA Y PERTINENCIA DE INTEGRACIONES PROPUESTAS

#### A. Políticas RLS Finas (owner/org_member)

**Análisis del estado actual:**

✅ **RLS Básico Implementado (Días 1-2):**
- Políticas RLS activadas en todas las tablas (organizations, users, org_members, api_keys, cases, artifacts)
- Funciones helper: `is_org_member()`, `get_user_role()`, `is_org_admin()`
- Políticas básicas de lectura/escritura por organización

❌ **Lo que FALTA para "RLS Finas":**
- **Políticas diferenciadas por rol** (owner, admin, member)
- **Políticas de eliminación restrictivas** (solo owners/admins)
- **Políticas de actualización selectivas** (permisos granulares)
- **Auditoría de cambios** (who/what/when en operaciones críticas)

**Evaluación de pertinencia:** ✅ MUY PERTINENTE

- **Razón 1:** Compliance y seguridad (requisito legal/regulatorio)
- **Razón 2:** Multi-tenant requiere aislamiento estricto
- **Razón 3:** Implementación actual es "básica", necesita refinamiento

**Conclusión:** Se debe **COMPLEMENTAR** la implementación actual con políticas más finas.

---

#### B. Cifrado de PII

**Análisis del estado actual:**

✅ **Infraestructura de Cifrado Implementada (Día 1):**
- Extensión `pgcrypto` instalada
- Funciones `encrypt_pii()` y `decrypt_pii()` creadas
- Tabla `api_keys` implementa cifrado de claves

❌ **Lo que FALTA para "Cifrado de PII completo":**
- **Clients no cifra PII** (tabla `clients` no usa cifrado)
- **No hay helpers de desencriptado server-side** en TypeScript
- **No hay automatización** del cifrado/descifrado en aplicaciones

**Evaluación de pertinencia:** ✅ MUY PERTINENTE

- **Razón 1:** Protección de datos sensibles (requisito legal)
- **Razón 2:** La tabla `clients` almacena información sensible (nombre, email, teléfono)
- **Razón 3:** Implementación actual está incompleta

**Conclusión:** Se debe **IMPLEMENTAR** cifrado completo para PII en `clients`.

---

### 2. ASPECTOS ESPECÍFICOS QUE HACEN FALTA

#### FALTA 1: Políticas RLS Finas en Tablas Críticas

**Tablas afectadas:**
- `clients` (información sensible)
- `cases` (datos del negocio)
- `audit_log` (registros de auditoría)

**Ubicación de implementación:**
- `supabase/migrations/20250127_add_fine_rls_policies.sql` (nueva migración)

**Requisitos específicos:**

1. **Tabla `clients`:**
   - ✅ Select: Todos los miembros de la org
   - ✅ Insert: Solo admins y owners
   - ✅ Update: Solo el owner del cliente o admins
   - ✅ Delete: Solo admins

2. **Tabla `cases`:**
   - ✅ Select: Todos los miembros de la org
   - ✅ Insert: Todos los miembros de la org
   - ✅ Update: Solo el creador o admins
   - ✅ Delete: Solo admins

3. **Tabla `artifacts`:**
   - ✅ Select: Miembros de la org que puede ver el caso
   - ✅ Insert: Miembros de la org que puede modificar el caso
   - ✅ Update: Solo el creador o admins
   - ✅ Delete: Solo admins

---

#### FALTA 2: Cifrado de PII en Tabla `clients`

**Campos sensibles en `clients`:**
- `name` (nombre del cliente) - DEBE cifrarse
- `email` (email del cliente) - DEBE cifrarse
- `phone` (teléfono) - DEBE cifrarse
- `address` (dirección) - DEBE cifrarse

**Ubicación de implementación:**
- `supabase/migrations/20250127_add_pii_encryption_to_clients.sql` (nueva migración)
- `src/lib/helpers/encryptClientData.ts` (helper server-side)
- `src/lib/helpers/decryptClientData.ts` (helper server-side)

**Requisitos específicos:**

1. **Modificar tabla `clients`:**
   - Añadir columnas cifradas: `name_enc`, `email_enc`, `phone_enc`, `address_enc`
   - Mantener columnas originales con `@default('')` para compatibilidad

2. **Crear funciones de encriptado:**
   - Función SQL: `encrypt_client_pii()` (usa `pgcrypto`)
   - Función SQL: `decrypt_client_pii()` (usa `pgcrypto`)

3. **Crear helpers server-side:**
   - `encryptClientData(data)` - Cifra datos antes de insertar/actualizar
   - `decryptClientData(data)` - Descifra datos al leer

---

#### FALTA 3: Audit Log para Operaciones Sensibles

**Operaciones que requieren audit log:**
- Creación/actualización de clientes (contienen PII)
- Acceso a información sensible (lectura de clientes)
- Cambios en RLS políticas (operaciones administrativas)

**Ubicación de implementación:**
- `src/lib/audit.ts` (extender funciones existentes)
- Triggers en tabla `clients` para auto-auditar

**Requisitos específicos:**
- Trigger `audit_client_changes` en tabla `clients`
- Función `recordAuditLog()` ya existe, solo necesitamos llamarla

---

### 3. ASPECTOS COMPLETAMENTE INTEGRADOS Y VALORACIÓN

#### ✅ INFRAESTRUCTURA DE CIFRADO (Implementada en Día 1)

**Ubicación:** `supabase/migrations/20251026_add_encryption_to_api_keys.sql`

**Valoración:** ✅ COHERENTE Y PERTINENTE

- ✅ Extensión `pgcrypto` instalada correctamente
- ✅ Funciones `encrypt_pii()` y `decrypt_pii()` bien implementadas
- ✅ Tabla `api_keys` usa cifrado (líneas 9-13 del archivo)
- ✅ Consistente con estándares de seguridad

**Conclusión:** Esta infraestructura es la BASE para extender el cifrado a otras tablas.

---

#### ✅ FUNCIONES HELPER DE RLS (Implementadas en Día 1)

**Ubicación:** `supabase/migrations/20251026_add_rls_to_cases.sql` y similares

**Funciones existentes:**
- `is_org_member(org_id, user_id)` - Verifica membresía
- `get_user_role(org_id, user_id)` - Obtiene rol del usuario
- `is_org_admin(org_id, user_id)` - Verifica si es admin

**Valoración:** ✅ COHERENTE Y PERTINENTE

- ✅ Funciones bien implementadas
- ✅ Útiles para políticas RLS finas
- ✅ Aisladas y reutilizables

**Conclusión:** Estas funciones son el fundamento para políticas RLS más estrictas.

---

#### ✅ SISTEMA DE AUDIT LOG (Implementado en Iteraciones Anteriores)

**Ubicación:** `src/lib/audit.ts`, tabla `audit_log`

**Valoración:** ✅ COHERENTE Y PERTINENTE

- ✅ Función `recordAuditLog()` existe y es funcional
- ✅ Se registra automáticamente en triggers de base de datos
- ✅ Incluye información completa: actor, action, tool, payload

**Conclusión:** El sistema de audit log está listo para extender a operaciones sensibles.

---

### 4. PLAN MINUCIOSO Y DETALLADO DE INTEGRACIÓN

## PLAN DE IMPLEMENTACIÓN DÍA 5

### FASE 1: ENDURECER RLS EN TABLA `clients`

**Objetivo:** Implementar políticas RLS finas que diferencien permisos por rol.

**Archivo a crear:** `supabase/migrations/20250127_add_fine_rls_to_clients.sql`

**Contenido propuesto:**

```sql
-- =====================================================
-- POLÍTICAS RLS FINAS PARA TABLA CLIENTS
-- =====================================================

-- Política: Lectura - Todos los miembros de la org
CREATE POLICY "org_members_can_read_clients" 
ON clients FOR SELECT 
USING (
  org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);

-- Política: Inserción - Solo admins y owners
CREATE POLICY "org_admins_can_create_clients" 
ON clients FOR INSERT 
WITH CHECK (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Política: Actualización - Owner del cliente o admins
CREATE POLICY "client_owner_can_update" 
ON clients FOR UPDATE 
USING (
  id IN (
    SELECT id FROM clients c
    WHERE c.org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  )
);

-- Política: Eliminación - Solo admins
CREATE POLICY "org_admins_can_delete_clients" 
ON clients FOR DELETE 
USING (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
```

**Validación:**
- Probar lectura como member, admin, owner
- Probar inserción solo como admin/owner
- Probar eliminación solo como admin

---

### FASE 2: IMPLEMENTAR CIFRADO DE PII EN `clients`

**Objetivo:** Cifrar datos sensibles de clientes y crear helpers server-side.

**Archivo a crear:** `supabase/migrations/20250127_add_pii_encryption_to_clients.sql`

**Contenido propuesto:**

```sql
-- =====================================================
-- AÑADIR COLUMNAS CIFRADAS A TABLA CLIENTS
-- =====================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS name_enc BYTEA;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_enc BYTEA;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_enc BYTEA;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_enc BYTEA;

-- Función para cifrar datos de cliente
CREATE OR REPLACE FUNCTION encrypt_client_data(
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT
)
RETURNS TABLE(name_enc BYTEA, email_enc BYTEA, phone_enc BYTEA, address_enc BYTEA) AS $$
BEGIN
  RETURN QUERY SELECT
    encrypt_pii(COALESCE(name, '')),
    encrypt_pii(COALESCE(email, '')),
    encrypt_pii(COALESCE(phone, '')),
    encrypt_pii(COALESCE(address, ''));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para descifrar datos de cliente
CREATE OR REPLACE FUNCTION decrypt_client_data(
  name_enc BYTEA,
  email_enc BYTEA,
  phone_enc BYTEA,
  address_enc BYTEA
)
RETURNS TABLE(name TEXT, email TEXT, phone TEXT, address TEXT) AS $$
BEGIN
  RETURN QUERY SELECT
    decrypt_pii(name_enc),
    decrypt_pii(email_enc),
    decrypt_pii(phone_enc),
    decrypt_pii(address_enc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Archivo a crear:** `src/lib/helpers/clientEncryption.ts`

**Contenido propuesto:**

```typescript
/**
 * Helper para cifrar datos de cliente antes de insertar/actualizar
 */
export async function encryptClientData(data: {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  const { prisma } = await import('@/lib/prisma');
  
  // Llamar a la función SQL de cifrado
  const result = await prisma.$queryRaw`
    SELECT * FROM encrypt_client_data(
      ${data.name || ''}::TEXT,
      ${data.email || ''}::TEXT,
      ${data.phone || ''}::TEXT,
      ${data.address || ''}::TEXT
    )
  `;
  
  return result[0]; // Retorna { name_enc, email_enc, phone_enc, address_enc }
}

/**
 * Helper para descifrar datos de cliente al leer
 */
export async function decryptClientData(clientId: string) {
  const { prisma } = await import('@/lib/prisma');
  
  // Obtener cliente con datos cifrados
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name_enc: true, email_enc: true, phone_enc: true, address_enc: true }
  });
  
  if (!client) return null;
  
  // Llamar a la función SQL de descifrado
  const result = await prisma.$queryRaw`
    SELECT * FROM decrypt_client_data(
      ${client.name_enc}::BYTEA,
      ${client.email_enc}::BYTEA,
      ${client.phone_enc}::BYTEA,
      ${client.address_enc}::BYTEA
    )
  `;
  
  return result[0]; // Retorna { name, email, phone, address }
}
```

**Validación:**
- Insertar cliente con datos cifrados
- Leer cliente y verificar que se descifra correctamente
- Verificar que los datos cifrados están en formato BYTEA en DB

---

### FASE 3: AUDIT LOG PARA OPERACIONES SENSIBLES

**Objetivo:** Registrar automáticamente acceso y modificaciones a PII.

**Archivo a crear:** `supabase/migrations/20250127_add_audit_trigger_to_clients.sql`

**Contenido propuesto:**

```sql
-- =====================================================
-- TRIGGER DE AUDITORÍA PARA CAMBIOS EN CLIENTS
-- =====================================================

CREATE OR REPLACE FUNCTION audit_client_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar en audit_log
  INSERT INTO audit_log (
    actor,
    action,
    tool,
    payload
  ) VALUES (
    auth.uid()::TEXT,
    'client_' || TG_OP, -- client_INSERT, client_UPDATE, client_DELETE
    'database_trigger',
    jsonb_build_object(
      'client_id', COALESCE(NEW.id, OLD.id),
      'org_id', COALESCE(NEW.org_id, OLD.org_id),
      'operation', TG_OP,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a tabla clients
DROP TRIGGER IF EXISTS trigger_audit_client_changes ON clients;
CREATE TRIGGER trigger_audit_client_changes
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION audit_client_changes();
```

**Validación:**
- Insertar/cliente y verificar log en `audit_log`
- Actualizar cliente y verificar log
- Eliminar cliente y verificar log

---

### FASE 4: INTEGRAR CIFRADO EN API DE CLIENTES

**Objetivo:** Modificar endpoints de API para usar cifrado/descifrado automático.

**Archivos a modificar:**
- `src/app/api/clients/create/route.ts` (usar `encryptClientData`)
- `src/app/api/clients/list/route.ts` (usar `decryptClientData`)
- `src/app/api/clients/[id]/route.ts` (usar `decryptClientData`)

**Ejemplo de modificación en `create/route.ts`:**

```typescript
// ANTES:
const newClient = await createClient({
  orgId,
  name,
  email,
  phone,
  address,
});

// DESPUÉS:
const encryptedData = await encryptClientData({ name, email, phone, address });
const newClient = await createClient({
  orgId,
  name_enc: encryptedData.name_enc,
  email_enc: encryptedData.email_enc,
  phone_enc: encryptedData.phone_enc,
  address_enc: encryptedData.address_enc,
  // Mantener campos originales para compatibilidad
  name, email, phone, address,
});
```

---

## RESUMEN POR ASPECTOS (DÍA 5)

### Aspectos Completamente Integrados:

1. ✅ Extensión `pgcrypto` instalada
2. ✅ Funciones `encrypt_pii()` y `decrypt_pii()` creadas
3. ✅ Tabla `audit_log` funcional
4. ✅ Funciones helper RLS creadas
5. ✅ Políticas RLS básicas activadas

**Valoración:** ✅ COHERENTE Y FUNCIONAL

### Aspectos que Faltan:

1. ❌ Políticas RLS finas (owner/admin/member) en `clients`, `cases`, `artifacts`
2. ❌ Cifrado de PII en tabla `clients`
3. ❌ Helpers server-side para cifrado/descifrado
4. ❌ Triggers de auditoría para operaciones sensibles
5. ❌ Integración de cifrado en APIs de clientes

**Valoración:** ❌ REQUIERE IMPLEMENTACIÓN

### Plan de Implementación:

**Fase 1:** Políticas RLS finas en `clients` (4 políticas)
**Fase 2:** Cifrado de PII en `clients` (2 funciones SQL + 2 helpers TypeScript)
**Fase 3:** Auditoría automática para `clients` (1 trigger)
**Fase 4:** Integración en APIs (modificar 3 archivos)

---

## PRINCIPIOS APLICADOS

✅ **Reutilización Máxima:** Usar funciones `encrypt_pii()` y `decrypt_pii()` existentes  
✅ **Arquitectura Dual:** No modificar Landing; cambios solo en Workspace  
✅ **Consistencia de Estado:** Estado de cifrado debe ser transparente para APIs  
✅ **Separación de Responsabilidades:** SQL maneja cifrado; TypeScript maneja orquestación

---

## CONCLUSIÓN

El Día 5 es **NECESARIO Y PERTINENTE** para cumplir con requisitos de seguridad y compliance. La infraestructura base está implementada, pero requiere **4 fases de refinamiento y extensión** para completarse.

**Recomendación:** Proceder con la implementación del Día 5 según el plan de 4 fases propuesto.

