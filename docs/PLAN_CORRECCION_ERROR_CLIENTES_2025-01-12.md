# PLAN INTEGRAL DE CORRECCIÓN - ERROR CREACIÓN CLIENTES
**Fecha**: 2025-01-12  
**Desarrollador**: FullStack Senior AI Assistant  
**Objetivo**: Resolver error "Illegal argument to function" en creación de clientes

---

## 📋 RESUMEN EJECUTIVO

### Error Identificado
```
Error [PrismaClientKnownRequestError]: 
Invalid `prisma.$queryRaw()` invocation:
Raw query failed. Code: `39000`. Message: `ERROR: Illegal argument to function`
```

### Causa Raíz
**PROBLEMA PRINCIPAL**: La función `encrypt_pii()` en PostgreSQL requiere que la variable de sesión `app.encryption_key` esté configurada ANTES de ejecutar la función, pero el código actual no la está configurando correctamente.

### Estado del Sistema
- ✅ **Base de datos**: Funciones `encrypt_pii()` y `decrypt_pii()` existen
- ✅ **Esquema Prisma**: Modelo `clients` correctamente definido
- ✅ **Cliente Prisma**: Regenerado correctamente
- ❌ **Configuración de sesión**: Variable `app.encryption_key` no se está configurando
- ❌ **Variable de entorno**: `APP_ENCRYPTION_KEY` no está definida

---

## 🔍 ANÁLISIS TÉCNICO DETALLADO

### 1. Flujo del Error

```
1. Usuario envía formulario de cliente
   ↓
2. POST /api/clients/create
   ↓
3. createClient() en clientsDb.ts
   ↓
4. setEncryptionKey() - FALLA AQUÍ
   ↓
5. prisma.$queryRaw con encrypt_pii() - ERROR 39000
```

### 2. Problema en setEncryptionKey()

**Archivo**: `src/lib/clientsDb.ts` líneas 47-59

```typescript
async function setEncryptionKey() {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY; // ❌ UNDEFINED
  
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada');
  }
  
  // ❌ PROBLEMA: set_config no funciona como se espera
  await prisma.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
}
```

**Problemas identificados**:
1. `APP_ENCRYPTION_KEY` no está definida en variables de entorno
2. `set_config()` no persiste la variable en la sesión de `$queryRaw`
3. La función `encrypt_pii()` se ejecuta en un contexto diferente

### 3. Función encrypt_pii() en PostgreSQL

**Archivo**: `supabase/migrations/20250107_organizations_and_multitenancy.sql` líneas 71-79

```sql
CREATE OR REPLACE FUNCTION public.encrypt_pii(data text)
RETURNS bytea AS $$
BEGIN
    IF data IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key')); -- ❌ FALLA AQUÍ
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Problema**: `current_setting('app.encryption_key')` retorna error porque la variable no está configurada en la sesión actual.

---

## 🎯 SOLUCIONES PROPUESTAS

### SOLUCIÓN 1: Configurar Variable de Entorno (Recomendada)

#### Paso 1.1: Crear archivo .env.local
```bash
# Crear archivo .env.local en la raíz del proyecto
touch .env.local
```

#### Paso 1.2: Añadir clave de cifrado
```env
# .env.local
APP_ENCRYPTION_KEY="tu_clave_secreta_super_segura_minimo_32_caracteres_aqui"
```

#### Paso 1.3: Generar clave segura
```bash
# Opción 1: OpenSSL
openssl rand -base64 32

# Opción 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### SOLUCIÓN 2: Corregir setEncryptionKey()

#### Archivo: `src/lib/clientsDb.ts`

**ANTES (líneas 47-59)**:
```typescript
async function setEncryptionKey() {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error(
      'APP_ENCRYPTION_KEY no está configurada. ' +
      'Añade APP_ENCRYPTION_KEY="tu-clave-secreta" en tu archivo .env.local'
    );
  }
  
  // ❌ PROBLEMA: set_config no funciona con $queryRaw
  await prisma.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
}
```

**DESPUÉS**:
```typescript
async function setEncryptionKey() {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error(
      'APP_ENCRYPTION_KEY no está configurada. ' +
      'Añade APP_ENCRYPTION_KEY="tu-clave-secreta" en tu archivo .env.local'
    );
  }
  
  // ✅ SOLUCIÓN: Usar $executeRaw con SET en lugar de set_config
  await prisma.$executeRaw`SET app.encryption_key = ${encryptionKey}`;
}
```

### SOLUCIÓN 3: Mejorar createClient()

#### Archivo: `src/lib/clientsDb.ts`

**ANTES (líneas 87-97)**:
```typescript
const result = await prisma.$queryRaw<Array<{ id: string }>>`
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
```

**DESPUÉS**:
```typescript
// ✅ SOLUCIÓN: Configurar clave y ejecutar en una sola transacción
const result = await prisma.$transaction(async (tx) => {
  // Configurar clave de cifrado en la transacción
  await tx.$executeRaw`SET app.encryption_key = ${encryptionKey}`;
  
  // Ejecutar INSERT con cifrado
  return await tx.$queryRaw<Array<{ id: string }>>`
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
```

---

## 🚀 IMPLEMENTACIÓN PASO A PASO

### FASE 1: Configuración Inmediata (5 minutos)

#### Paso 1: Crear archivo .env.local
```bash
cd /home/liones_messi/Documentos/trabajo/Briki
echo 'APP_ENCRYPTION_KEY="kJ8n7vR3mP2xT9wQ5aB4cD1eF6gH0iL8mN3oP7qR2sT5u"' > .env.local
```

#### Paso 2: Verificar que el archivo se creó
```bash
cat .env.local
```

#### Paso 3: Reiniciar servidor de desarrollo
```bash
npm run dev
```

### FASE 2: Corrección del Código (10 minutos)

#### Paso 1: Actualizar setEncryptionKey()
```typescript
// En src/lib/clientsDb.ts línea 58
await prisma.$executeRaw`SET app.encryption_key = ${encryptionKey}`;
```

#### Paso 2: Mejorar createClient() con transacción
```typescript
// En src/lib/clientsDb.ts líneas 75-104
export async function createClient(orgId: string, clientData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<string> {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error(
      'APP_ENCRYPTION_KEY no está configurada. ' +
      'Añade APP_ENCRYPTION_KEY="tu-clave-secreta" en tu archivo .env.local'
    );
  }
  
  const result = await prisma.$transaction(async (tx) => {
    // Configurar clave de cifrado en la transacción
    await tx.$executeRaw`SET app.encryption_key = ${encryptionKey}`;
    
    // Ejecutar INSERT con cifrado
    return await tx.$queryRaw<Array<{ id: string }>>`
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
    throw new Error('Failed to create client');
  }
  
  return result[0].id;
}
```

### FASE 3: Verificación (5 minutos)

#### Paso 1: Probar creación de cliente
1. Ir a `/workspace/clients/new`
2. Llenar formulario con datos de prueba
3. Enviar formulario
4. Verificar que se crea sin errores

#### Paso 2: Verificar cifrado en base de datos
```sql
-- Conectar a Supabase y ejecutar:
SELECT 
  id,
  org_id,
  pgp_sym_decrypt(name_enc, current_setting('app.encryption_key')) as name,
  pgp_sym_decrypt(email_enc, current_setting('app.encryption_key')) as email
FROM public.clients
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔧 ARCHIVOS A MODIFICAR

### 1. Archivo: `.env.local` (NUEVO)
```env
APP_ENCRYPTION_KEY="tu_clave_secreta_super_segura_minimo_32_caracteres"
```

### 2. Archivo: `src/lib/clientsDb.ts`
- **Línea 58**: Cambiar `set_config` por `SET`
- **Líneas 75-104**: Refactorizar `createClient()` con transacción
- **Eliminar**: Función `setEncryptionKey()` (ya no es necesaria)

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidades que DEBEN funcionar:
- [ ] Creación de clientes desde `/workspace/clients/new`
- [ ] Datos se cifran correctamente en base de datos
- [ ] Datos se descifran correctamente en la UI
- [ ] No hay errores en consola del servidor
- [ ] No hay errores en consola del navegador

### Verificaciones técnicas:
- [ ] Variable `APP_ENCRYPTION_KEY` está definida
- [ ] Función `encrypt_pii()` recibe la clave correctamente
- [ ] Datos en BD están cifrados (no legibles)
- [ ] UI muestra datos descifrados correctamente

---

## 🚨 TROUBLESHOOTING

### Si persiste el error "Illegal argument to function":

#### Verificar variable de entorno:
```bash
# En terminal del servidor
echo $APP_ENCRYPTION_KEY
```

#### Verificar en código:
```typescript
// Añadir en createClient()
console.log('Encryption key:', process.env.APP_ENCRYPTION_KEY);
```

#### Verificar en base de datos:
```sql
-- Verificar que la función existe
SELECT proname FROM pg_proc WHERE proname = 'encrypt_pii';

-- Verificar configuración de sesión
SHOW app.encryption_key;
```

### Si hay errores de permisos:
```sql
-- Verificar que el usuario tiene permisos
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(bytea) TO postgres;
```

---

## 📊 IMPACTO DE LA CORRECCIÓN

### Funcionalidades restauradas:
- ✅ Creación de clientes con cifrado PII
- ✅ Gestión completa de clientes
- ✅ Seguridad de datos sensibles
- ✅ Cumplimiento con regulaciones de privacidad

### Riesgos de la corrección:
- **RIESGO BAJO**: Solo modifica configuración y código de cifrado
- **NO AFECTA**: Datos existentes, estructura de BD, otros módulos
- **REVERSIBLE**: Se puede deshacer fácilmente

---

## 🎯 PRÓXIMOS PASOS

### Inmediatos (hoy):
1. Implementar FASE 1 (configuración)
2. Implementar FASE 2 (código)
3. Verificar con FASE 3 (testing)

### Futuros (opcional):
1. Implementar rotación de claves
2. Añadir logging de operaciones de cifrado
3. Crear tests unitarios para cifrado
4. Documentar proceso de gestión de claves

---

**ESTADO**: Listo para implementación inmediata  
**TIEMPO ESTIMADO**: 20 minutos  
**COMPLEJIDAD**: Baja (configuración + refactor menor)  
**PRIORIDAD**: Crítica (bloquea funcionalidad core)

---

**FIN DEL PLAN DE CORRECCIÓN**

Este plan resuelve el error específico de creación de clientes mediante la configuración correcta de la variable de cifrado y la refactorización del código para usar transacciones de base de datos.
