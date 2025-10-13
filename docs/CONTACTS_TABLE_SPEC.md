# Especificación: Tabla `contacts`

## Estructura de la tabla

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  city TEXT,
  phone TEXT,
  locale TEXT DEFAULT 'en',
  message TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Row-Level Security (RLS)

**Configuración:**
- RLS: **ON** (activado)
- Políticas públicas: **NINGUNA**

```sql
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
```

### 🔒 Nota de seguridad importante

**Las inserciones se realizan exclusivamente desde el API usando Service Role Key**, no desde el cliente.

- El endpoint del API (`/api/contact`) valida los datos entrantes
- Usa `supabase.auth.admin` o un cliente con Service Role para insertar
- Los usuarios finales **NO** pueden leer, escribir ni eliminar directamente desde el cliente

## Validaciones del servidor (Checklist)

El endpoint `/api/contact` debe validar:

### ✅ Campos obligatorios
- [ ] `name`: no vacío, máximo 200 caracteres
- [ ] `email`: formato válido (regex email), máximo 255 caracteres
- [ ] `message`: no vacío, máximo 2000 caracteres

### ✅ Campos opcionales
- [ ] `company`: si presente, máximo 200 caracteres
- [ ] `city`: si presente, máximo 100 caracteres
- [ ] `phone`: si presente, formato internacional básico, máximo 30 caracteres
- [ ] `locale`: si presente, debe ser 'en' o 'es' (valores permitidos)

### ✅ Metadatos del servidor
- [ ] `user_agent`: extraer de headers (`req.headers['user-agent']`)
- [ ] `ip_hash`: extraer IP del request y hashear con SHA-256
  - Considerar proxy headers: `x-forwarded-for`, `x-real-ip`

### ✅ Seguridad
- [ ] Rate limiting por IP (ej: 5 requests por hora)
- [ ] Sanitización básica de inputs (strip HTML, prevenir XSS)
- [ ] Validar longitud máxima de cada campo antes de insertar
- [ ] Verificar que el email no sea desechable (opcional, lista de dominios)

### ✅ Response
- [ ] Nunca exponer información sensible en errores
- [ ] Retornar 200 con mensaje genérico de éxito
- [ ] Retornar 400 con mensaje genérico si hay error de validación
- [ ] Retornar 429 si se excede rate limit

## Migración SQL

**Archivo sugerido:** `supabase/migrations/20251011_create_contacts_table.sql`

```sql
-- Crear tabla contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  city TEXT,
  phone TEXT,
  locale TEXT DEFAULT 'en',
  message TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activar RLS (sin políticas públicas)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Índice para búsquedas por email (opcional, útil para admin)
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
```

## Ejemplo de uso en el API

```typescript
// /api/contact/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // 1. Validar inputs
  const body = await req.json()
  // ... validaciones según checklist ...
  
  // 2. Usar Service Role client para insertar
  const supabase = createClient() // con Service Role key en server
  
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      name: sanitized.name,
      email: sanitized.email,
      company: sanitized.company,
      city: sanitized.city,
      phone: sanitized.phone,
      locale: sanitized.locale || 'en',
      message: sanitized.message,
      user_agent: req.headers.get('user-agent'),
      ip_hash: hashIP(getClientIP(req))
    })
  
  // 3. Retornar respuesta genérica
  if (error) {
    return Response.json({ success: false }, { status: 400 })
  }
  
  return Response.json({ success: true }, { status: 200 })
}
```

## Consideraciones adicionales

### Privacidad (GDPR/CCPA)
- Los datos de contacto son información personal (PII)
- Implementar proceso de eliminación bajo solicitud
- Considerar política de retención (ej: eliminar después de 2 años)
- Documentar en Privacy Policy

### Administración
- Crear endpoint separado `/api/admin/contacts` con auth admin
- Permitir visualización solo a usuarios con rol específico
- No exponer IP completo en UI admin (mostrar solo hash o parcial)

---

**Estado:** ✅ Especificación completa  
**Próximo paso:** Crear migración SQL y endpoint del API

