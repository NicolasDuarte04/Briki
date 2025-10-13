# Contact Form Documentation

## Architecture Overview

```
User Interface (Landing Page)
    ↓
/api/contact (API Route)
    ↓
Supabase (contacts table)
```

### Flow

1. **UI Component**: User fills contact form on landing page
2. **Client Validation**: React Hook Form validates inputs before submission
3. **API Route**: POST `/api/contact` processes the request
4. **Server Validation**: Validates and sanitizes data server-side
5. **Spam Prevention**: Checks rate limits, honeypot fields, and patterns
6. **Database**: Stores submission in Supabase
7. **Response**: Returns success/error message to UI

---

## Environment Variables

### Required

```
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL (public)
SUPABASE_SERVICE_ROLE_KEY=        # Service Role key (server-only)
CONTACT_SPAM_SALT=                # Salt para hash de IP (server-only)
```

### Optional

```
CONTACT_RATE_LIMIT=5        # Max submissions per IP per hour (default: 5)
CONTACT_SPAM_THRESHOLD=0.7  # Spam detection threshold (default: 0.7)
NEXT_PUBLIC_SITE_URL=       # URL pública del sitio (opcional; ej: https://briki.app)
```

### Security Notes

- **Never expose** `SUPABASE_SERVICE_KEY` to client
- Use `NEXT_PUBLIC_` only for public Supabase anon key (if needed)
- Validate all environment variables at startup (use `src/lib/env.ts`)

---

## Entornos

Asegura que cada entorno tenga definidas las variables por nombre (sin incluir valores aquí). Las claves marcadas como "server-only" nunca deben usarse en código cliente.

### Desarrollo (local)

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY   # server-only
CONTACT_SPAM_SALT           # server-only
NEXT_PUBLIC_SITE_URL        # opcional
```

### Preview (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY   # server-only
CONTACT_SPAM_SALT           # server-only
NEXT_PUBLIC_SITE_URL        # opcional
```

### Producción (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY   # server-only
CONTACT_SPAM_SALT           # server-only
NEXT_PUBLIC_SITE_URL        # opcional
```

Notas:
- `SUPABASE_SERVICE_ROLE_KEY` y `CONTACT_SPAM_SALT` son de servidor. En `src/lib/env.ts` fallan si se acceden desde cliente.
- Las variables con prefijo `NEXT_PUBLIC_` pueden estar disponibles en el bundle del cliente.

### Verificación con Vercel CLI (sin exponer secretos)

Usa estos comandos para verificar la presencia de las claves por entorno. No imprimen valores completos.

```bash
# Proyecto actual
vercel env ls

# Por entorno
vercel env ls development
vercel env ls preview
vercel env ls production

# Comprobación puntual de un nombre (salida debe listar la clave)
vercel env ls production | grep -E "NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|CONTACT_SPAM_SALT|NEXT_PUBLIC_SITE_URL"
```

### Qué debes ver si está correcto
- Todas las variables listadas aparecen en Dev/Preview/Prod.
- El build y `/api/contact` funcionan en Preview/Producción.
- Esta doc enumera solo los nombres de las variables (sin valores).

---

## Validation & Anti-Spam

### Client-Side Validation

- **Email**: RFC 5322 format validation
- **Name**: 2-100 characters, no special characters
- **Message**: 10-1000 characters minimum/maximum
- **Required fields**: All fields mandatory

### Server-Side Validation

- **Re-validate** all client validations
- **Sanitize** inputs to prevent XSS/injection
- **Normalize** email addresses (lowercase, trim)
- **Validate** against schema before DB insert

### Anti-Spam Measures

1. **Rate Limiting**
   - IP-based: Max N submissions per hour
   - Session-based: Cooldown period between submissions

2. **Honeypot Field**
   - Hidden field that bots typically fill
   - Reject if honeypot is not empty

3. **Pattern Detection**
   - Check for suspicious patterns (links, repeated characters)
   - Flag submissions with anomalies for review

4. **Timestamp Validation**
   - Reject submissions sent too quickly after page load
   - Minimum time: 3 seconds

---

## UI Messages

### Success States

- **Default**: "¡Gracias! Hemos recibido tu mensaje y te responderemos pronto."
- **EN**: "Thank you! We've received your message and will respond soon."

### Error States

- **Validation Error**: "Por favor, revisa los campos marcados."
- **Rate Limit**: "Has enviado demasiados mensajes. Intenta de nuevo en unos minutos."
- **Server Error**: "Algo salió mal. Por favor, intenta de nuevo."
- **Network Error**: "No se pudo conectar. Verifica tu conexión."

### Loading State

- **Submitting**: "Enviando..." (disable form while processing)

---

## Database Schema

### Table: `contacts`

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

### Indexes

- `email` (for duplicate detection)
- `created_at` (for rate limiting queries)
- `status` (for admin filtering)

## RLS y Políticas de Acceso (Supabase)

- **Estado**: RLS ON en `public.contacts`.
- **Lectura (SELECT)**: sin políticas públicas; el cliente (anon/auth) no puede leer la tabla.
- **Inserción (INSERT)**: no existen políticas para `anon`/`authenticated`; la inserción ocurre exclusivamente desde backend usando Service Role (bypass de RLS).
- **Actualización/Borrado (UPDATE/DELETE)**: no hay políticas públicas.

### Flujo de inserción (resumen)

1. UI envía `POST` a `/api/contact`.
2. Backend valida payload, aplica honeypot y rate limit.
3. Backend crea cliente Supabase con Service Role y hace `insert` en `contacts`.

```ts
// Inserción desde backend usando Service Role (sin exponer secretos)
import { createServiceRoleClient } from '@/lib/supabase/server';

const supabase = createServiceRoleClient();
await supabase.from('contacts').insert({ /* campos validados */ });
```

### Verificación rápida

- **Cliente (anon)**: cualquier intento de lectura debe fallar por permisos.

```ts
// En cliente: debe devolver error de permisos
import { createBrowserSupabase } from '@/lib/supabase/client';

const sb = createBrowserSupabase();
const { data, error } = await sb.from('contacts').select('*').limit(1);
console.log(error?.message); // esperado: "permission denied"
```

- **Panel Supabase**: Table editor → `contacts` → confirmar "RLS Enabled" y ausencia de políticas que permitan `SELECT` a `anon` o `authenticated`.

---

## QA Checklist

### QA manual (evidencia mínima)

- Datos de prueba
  - Indica entorno probado: Preview o Producción (Vercel).
  - Registra referencia de versión: commit SHA corto o tag.
- Caso 1 — Envío válido
  - Completa todos los campos con datos válidos y envía.
  - Espera HTTP 200 y `{ "ok": true }` en la respuesta.
  - UI: mensaje de éxito visible; el formulario se limpia y el foco vuelve al primer campo.
  - Supabase: en Table editor → `public.contacts`, aparece una nueva fila con los campos enviados y `created_at` correcto.
- Caso 2 — Inválido
  - Deja requeridos vacíos o usa email inválido.
  - Espera HTTP 400 con `error: "validation_error"`.
  - UI: mensajes i18n correctos (ES/EN); el formulario no se limpia.
- Caso 3 — Honeypot
  - Simula enviando el campo `honeypot` con valor (DevTools → modifica el payload de la petición).
  - Espera HTTP 429 con `error: "spam_detected"`.
  - UI: mensaje i18n de spam.
- Caso 4 — Rate limit
  - Envía ≥ N veces desde la misma IP dentro de 1h (según `CONTACT_RATE_LIMIT`).
  - Espera HTTP 429 por límite; no se inserta una nueva fila.

- Evidencia mínima (2–3 capturas)
  - Captura 1: éxito (mensaje en UI) + pestaña Network mostrando 200.
  - Captura 2: error (validación o spam) + Network mostrando 400/429.
  - Captura 3: Supabase → tabla `contacts` con la fila creada (id/email/created_at).

- Cierre
  - Entorno probado: Preview / Prod.
  - Commit/versión: <hash corto o tag>.
  - Enlaces a capturas adjuntas en PR/Change Log.

### Functional Testing

- [ ] Form submits successfully with valid data
- [ ] Validation errors display for invalid inputs
- [ ] Success message appears after submission
- [ ] Data persists correctly in Supabase
- [ ] Form resets after successful submission

### Security Testing

- [ ] Service keys not exposed in client bundle
- [ ] Rate limiting blocks repeated submissions
- [ ] Honeypot catches simple bots
- [ ] XSS attempts are sanitized
- [ ] SQL injection attempts fail safely

### UX Testing

- [ ] Form is accessible (keyboard navigation, screen readers)
- [ ] Error messages are clear and actionable
- [ ] Loading state prevents double submissions
- [ ] Mobile responsive (touch-friendly)
- [ ] Works without JavaScript (progressive enhancement)

### Performance Testing

- [ ] API responds within 500ms (P95)
- [ ] No unnecessary re-renders
- [ ] Optimistic UI updates feel instant
- [ ] Bundle size impact < 10KB

### Regression Testing

- [ ] Existing forms still work
- [ ] No console errors in production build
- [ ] Analytics/tracking still fires
- [ ] i18n messages display correctly

---

## Implementation Files

### Key Files

- **UI Component**: `src/components/Landing/ContactForm.tsx`
- **API Route**: `src/app/api/contact/route.ts`
- **Validation Schema**: `src/lib/validation.ts` (contactFormSchema)
- **Database Client**: `src/lib/supabase/server.ts`
- **Environment Config**: `src/lib/env.ts`

### Related Documentation

- [Environment Variables](../ENVIRONMENT_AUDIT.md)
- [Security & PII Policies](SECURITY_PII_POLICIES.md)
- [Deployment Checklist](DEPLOY_PROD.md)

---

## Future Enhancements

- [ ] Email notifications to admin on new submissions
- [ ] Webhook integration for Slack/Discord
- [ ] reCAPTCHA v3 integration for advanced spam protection
- [ ] Admin dashboard to view/manage submissions
- [ ] Auto-responder email to user
- [ ] Analytics tracking for conversion rates

---

## Troubleshooting

### Common Issues

**Form not submitting**
- Check browser console for errors
- Verify API route is accessible (`/api/contact`)
- Check Supabase connection and credentials

**Rate limit too aggressive**
- Adjust `CONTACT_RATE_LIMIT` in environment variables
- Check IP detection is working correctly (proxy headers)

**Spam getting through**
- Review spam detection patterns
- Lower `CONTACT_SPAM_THRESHOLD`
- Add additional honeypot fields

**Data not persisting**
- Verify Supabase table exists and schema matches
- Check service role key has INSERT permissions
- Review Supabase logs for errors

---

**Last Updated**: October 11, 2025  
**Maintainer**: Briki Team

