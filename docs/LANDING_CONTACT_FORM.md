# Landing Contact Form - Decisión Técnica

## ✅ Decisión Técnica

**Implementaremos el envío del formulario vía `POST /api/contact` (Node.js runtime) usando Supabase con Service Role del lado servidor.**

### Arquitectura Seleccionada

```
Cliente (LandingCTA.tsx)
    ↓ POST /api/contact
Node.js API Route (/src/app/api/contact/route.ts)
    ↓ Validación + Honeypot
Supabase Admin Client (SUPABASE_SERVICE_ROLE_KEY)
    ↓ INSERT
contacts table (bypass RLS)
```

### Justificación

1. **Node.js Runtime**: Evita limitaciones de Edge Runtime para lógica compleja
2. **Service Role**: Permite escritura directa sin autenticación (formulario público)
3. **Persistencia Real**: Datos guardados en tabla `contacts` de Supabase
4. **Validación Server-side**: Protección contra manipulación client-side

---

## 📋 Checklist de Precondiciones

### Variables de Entorno en Vercel

Verifica manualmente en: [Vercel Dashboard](https://vercel.com) → Proyecto Briki → Settings → Environment Variables

#### ✅ Production
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Configurada (ENCRYPTED)

#### ✅ Preview
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Configurada (ENCRYPTED)

#### ✅ Development
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Configurada (ENCRYPTED)

### Verificación Local

```bash
# En tu .env.local debe existir:
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Nota**: El archivo `src/lib/env.ts` ya valida estas variables en tiempo de ejecución.

### Tabla de Supabase

- [ ] Crear tabla `contacts` en Supabase:

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para búsquedas comunes
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Política: Solo Service Role puede insertar (formulario público)
-- No policies needed - Service Role bypasses RLS
```

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Abuso de Endpoint (Spam/Bot)

**Descripción**: El endpoint `/api/contact` es público y puede ser abusado por bots.

**Impacto**: Alto - Base de datos llena de spam, costos de almacenamiento.

**Mitigaciones**:

1. **Honeypot Field** ⭐ (Implementar primero)
   - Campo invisible `bot_trap` en formulario
   - Si se llena, rechazar silenciosamente
   - No usar `display: none` (detectable), usar `position: absolute; left: -9999px`

2. **Rate Limiting** ⭐
   - Máx. 3 envíos por IP por hora
   - Usar Vercel Edge Config o Upstash Redis
   - Código 429 si excede límite

3. **Validación Server-side Estricta**
   - Email válido (regex + formato)
   - Longitud mínima/máxima de campos
   - Sanitización de inputs (prevenir XSS/SQL injection)

4. **CAPTCHA** (Fase 2 - Opcional)
   - Google reCAPTCHA v3 (invisible)
   - Solo si persiste spam después de honeypot + rate limiting

### Riesgo 2: Exposición de Service Role Key

**Descripción**: Si `SUPABASE_SERVICE_ROLE_KEY` se expone, atacante tiene acceso total a DB.

**Impacto**: Crítico - Compromiso total de datos.

**Mitigaciones**:

1. ✅ **Nunca exponer en cliente** - Usar solo en API routes (Node.js runtime)
2. ✅ **Configurar como variable de entorno encriptada** en Vercel
3. ✅ **Validación en `env.ts`** - Error si se accede desde cliente
4. ✅ **Rotar keys periódicamente** - Dashboard de Supabase cada 90 días
5. ✅ **Monitoreo** - Alertas de actividad sospechosa en Supabase

### Riesgo 3: Validación Insuficiente

**Descripción**: Datos inválidos/maliciosos insertados en DB.

**Impacto**: Medio - Datos corruptos, posibles vulnerabilidades.

**Mitigaciones**:

1. **Validación con Zod** (server-side)
   ```typescript
   const ContactSchema = z.object({
     name: z.string().min(2).max(100),
     email: z.string().email().max(255),
     company: z.string().min(2).max(200),
     city: z.string().min(2).max(100),
     phone: z.string().optional().max(20),
   });
   ```

2. **Sanitización de inputs** - Librería `validator` o `DOMPurify`

3. **Constraints en DB** - Columnas `NOT NULL`, checks, límites de longitud

### Riesgo 4: Sin Señales de Éxito/Error en UI

**Descripción**: Usuario no sabe si formulario se envió correctamente.

**Impacto**: Medio - Confusión, reenvíos duplicados.

**Mitigaciones**:

1. **Loading State** - Deshabilitar botón durante envío
2. **Toast/Snackbar** - Mensaje de éxito/error
3. **Limpiar formulario** - Solo después de éxito confirmado
4. **Manejo de errores** - Mensajes amigables (no técnicos)

---

## 🔐 Checklist de Seguridad

Antes de implementar:

- [ ] Honeypot field configurado
- [ ] Validación Zod en API route
- [ ] Rate limiting implementado (o planificado para Fase 2)
- [ ] Service Role Key solo en servidor (nunca en cliente)
- [ ] Error handling con mensajes genéricos (sin exponer stack traces)
- [ ] Logging de intentos fallidos (para monitoreo)

---

## 📦 Flujo de Implementación (Próximos Pasos)

### Fase 1: Core Functionality
1. Crear tabla `contacts` en Supabase
2. Crear `/src/app/api/contact/route.ts`
3. Actualizar `LandingCTA.tsx` con fetch a API route
4. Implementar honeypot + validación Zod

### Fase 2: Señales UI
5. Agregar loading state + toast notifications
6. Limpiar formulario después de éxito
7. Error handling amigable

### Fase 3: Rate Limiting (Opcional si hay spam)
8. Configurar Upstash Redis o similar
9. Implementar rate limiting por IP

---

## 📊 Monitoreo Post-Deploy

Después del deploy, monitorear:

1. **Supabase Dashboard** → Table Editor → `contacts`
   - Verificar que datos se guardan correctamente
   - Buscar patrones de spam (emails similares, creación masiva)

2. **Vercel Logs** → Functions → `/api/contact`
   - Errores 500 (validación/DB)
   - 429 (rate limit alcanzado)
   - Tiempos de respuesta

3. **Alertas Supabase** (Opcional)
   - Configurar notificaciones para picos de actividad

---

## ✅ Estado Actual

- [x] Decisión técnica documentada
- [x] Variables de entorno validadas en código (`env.ts`)
- [x] Riesgos identificados y mitigaciones planificadas
- [ ] Variables de entorno verificadas en Vercel Dashboard (MANUAL)
- [ ] Tabla `contacts` creada en Supabase
- [ ] Código implementado

**Próximo paso**: Verificar checklist de variables de entorno en Vercel, luego proceder con implementación.

