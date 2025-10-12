# Corrección Técnica: Error de Cifrado de Clientes

## 🚨 Problema Crítico Identificado

### **Síntoma**
```
ERROR: Illegal argument to function
```

### **Contexto**
- **Operación:** Creación de nuevos clientes
- **Función afectada:** `encrypt_pii()` de PostgreSQL
- **Impacto:** Imposibilidad de crear clientes en el sistema

## 🔍 Análisis de Causa Raíz

### **Problema #1: Variable de Entorno No Configurada**
```bash
# Archivo .env.local - ANTES (problemático)
# No existía la variable APP_ENCRYPTION_KEY
```

### **Problema #2: Gestión Incorrecta de Sesiones de Base de Datos**
```typescript
// Código problemático - ANTES
async function setEncryptionKey() {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  await prisma.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
}

export async function createClient(orgId: string, clientData: any) {
  await setEncryptionKey(); // ❌ Sesión separada
  return prisma.$queryRaw`INSERT INTO...`; // ❌ Sesión diferente
}
```

**Problema:** Prisma maneja conexiones de forma asíncrona, por lo que `set_config` y `INSERT` pueden ejecutarse en sesiones diferentes.

## 🛠️ Solución Implementada

### **1. Configuración de Entorno**
```bash
# Archivo .env.local - DESPUÉS (correcto)
APP_ENCRYPTION_KEY=NR1LrpPLDf2Wo1sY4Pt+QYAFGqPeGpU3WLYIu1S7LsA=
```

### **2. Refactorización a Transacciones Atómicas**
```typescript
// Código corregido - DESPUÉS
export async function createClient(orgId: string, clientData: any) {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error('CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente');
  }

  // ✅ Transacción atómica garantiza misma sesión
  const result = await prisma.$transaction(async (tx) => {
    // Paso 1: Configurar clave en la sesión actual
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Paso 2: Ejecutar inserción en la misma sesión
    return tx.$queryRaw`INSERT INTO public.clients (...) VALUES (...)`;
  });

  return result[0].id;
}
```

## 🔧 Detalles Técnicos de la Implementación

### **Función `createClient` Refactorizada**
```typescript
export async function createClient(orgId: string, clientData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<string> {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  // Validación robusta de clave
  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Transacción atómica
  const result = await prisma.$transaction(async (tx) => {
    // Configurar clave de cifrado para esta transacción específica
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Ejecutar inserción usando la función de cifrado de la BD
    return tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO public.clients (org_id, name_enc, email_enc, phone_enc, address_enc)
      VALUES (
        ${orgId}::uuid,
        public.encrypt_pii(${clientData.name}),
        ${clientData.email ? Prisma.sql`public.encrypt_pii(${clientData.email})` : Prisma.sql`NULL`},
        ${clientData.phone ? Prisma.sql`public.encrypt_pii(${clientData.phone})` : Prisma.sql`NULL`},
        ${clientData.address ? Prisma.sql`public.encrypt_pii(${clientData.address})` : Prisma.sql`NULL`}
      )
      RETURNING id
    `;
  });

  if (!result || result.length === 0) {
    throw new Error('La creación del cliente falló y no devolvió un ID.');
  }

  return result[0].id;
}
```

### **Función `getClientsByOrg` Actualizada**
```typescript
export async function getClientsByOrg(orgId: string): Promise<DecryptedClient[]> {
  if (!orgId) {
    throw new Error('Organization ID is required');
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    return tx.$queryRaw<DecryptedClient[]>`
      SELECT 
        id::text,
        org_id::text as "orgId",
        public.decrypt_pii(name_enc) as name,
        public.decrypt_pii(email_enc) as email,
        public.decrypt_pii(phone_enc) as phone,
        public.decrypt_pii(address_enc) as address,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM public.clients
      WHERE org_id = ${orgId}::uuid
      ORDER BY created_at DESC
    `;
  });
}
```

## 🔐 Configuración de Seguridad

### **Generación de Clave de Cifrado**
```bash
# Comando para generar clave segura
openssl rand -base64 32

# Resultado: NR1LrpPLDf2Wo1sY4Pt+QYAFGqPeGpU3WLYIu1S7LsA=
```

### **Validación de Clave**
```typescript
// Validación que previene uso de claves placeholder
if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
  throw new Error('CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente');
}
```

## 📊 Comparación Antes vs Después

### **Antes (Problemático)**
```typescript
// ❌ Gestión de sesiones separada
async function setEncryptionKey() {
  await prisma.$executeRaw`SELECT set_config('app.encryption_key', ${key}, true)`;
}

export async function createClient() {
  await setEncryptionKey(); // Sesión 1
  return prisma.$queryRaw`INSERT...`; // Sesión 2 (diferente)
}
```

**Problemas:**
- ❌ Sesiones de BD separadas
- ❌ Clave no disponible en momento de cifrado
- ❌ Error `Illegal argument to function`
- ❌ Sin validación de clave

### **Después (Correcto)**
```typescript
// ✅ Transacción atómica
export async function createClient() {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${key}, true)`; // Sesión 1
    return tx.$queryRaw`INSERT...`; // Misma sesión
  });
}
```

**Beneficios:**
- ✅ Sesión única garantizada
- ✅ Clave disponible durante cifrado
- ✅ Operación atómica
- ✅ Validación robusta
- ✅ Manejo de errores mejorado

## 🧪 Validación de la Solución

### **Checklist de Pruebas**
- [ ] **Creación de cliente:** Sin errores en consola
- [ ] **Cifrado en BD:** Datos encriptados (no texto plano)
- [ ] **Descifrado:** Datos legibles en UI
- [ ] **Validación de clave:** Error claro si no está configurada
- [ ] **Transacciones:** Operaciones atómicas

### **Query de Verificación**
```sql
-- Verificar que los datos están cifrados
SELECT id, org_id, name_enc, email_enc 
FROM public.clients 
ORDER BY created_at DESC 
LIMIT 1;

-- Resultado esperado: datos binarios o \x... (no texto plano)
```

## 🚀 Beneficios de la Solución

### **1. Seguridad**
- ✅ **Cifrado AES-256** para datos PII
- ✅ **Clave segura** de 32 bytes
- ✅ **Validación de configuración** antes de operaciones

### **2. Confiabilidad**
- ✅ **Transacciones atómicas** garantizan consistencia
- ✅ **Manejo de errores** robusto
- ✅ **Validación de datos** en cada paso

### **3. Mantenibilidad**
- ✅ **Código limpio** y bien documentado
- ✅ **Patrón consistente** en todas las funciones
- ✅ **Fácil debugging** y testing

### **4. Performance**
- ✅ **Operaciones eficientes** con transacciones
- ✅ **Reutilización de conexiones** de Prisma
- ✅ **Validación temprana** evita operaciones innecesarias

## 📝 Lecciones Aprendidas

### **1. Gestión de Sesiones de Base de Datos**
- **Problema:** Asumir que `set_config` y consultas posteriores usan la misma sesión
- **Solución:** Usar transacciones para garantizar sesión única
- **Lección:** Siempre usar transacciones para operaciones que requieren configuración de sesión

### **2. Validación de Configuración**
- **Problema:** Errores crípticos cuando falta configuración
- **Solución:** Validación explícita con mensajes claros
- **Lección:** Validar configuración crítica al inicio de operaciones

### **3. Patrones de Código**
- **Problema:** Código duplicado y patrones inconsistentes
- **Solución:** Refactorización completa con patrón consistente
- **Lección:** Mantener consistencia en patrones de código

---

*Documento técnico - Corrección de Error de Cifrado*
*Fecha: 12 de enero de 2025*
*Severidad: Crítica*
