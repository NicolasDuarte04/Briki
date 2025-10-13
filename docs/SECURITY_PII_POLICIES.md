# Políticas de Seguridad: PII, Logging y Acceso en Producción

**Objetivo**: Evitar fugas de información sensible (PII) y cumplir con mínimos de seguridad en producción.

---

## 1. Definición de PII (Personally Identifiable Information)

**PII incluye**:
- Emails completos
- Nombres completos
- Números de teléfono
- Direcciones IP
- Identificadores de usuario visibles (user IDs de Supabase)
- Tokens de sesión, refresh tokens, access tokens
- Contraseñas (siempre hasheadas, nunca en logs)
- Datos biométricos
- Datos de documentos (contenido de PDFs/archivos del usuario)
- Datos de chat/conversaciones completas

**NO es PII** (puede loggearse con precaución):
- Request IDs (UUIDs aleatorios)
- Timestamps
- Tipos de eventos genéricos (`chat_started`, `file_uploaded`)
- Códigos de error HTTP
- Métricas agregadas sin identificadores

---

## 2. Reglas de Logging

### 2.1 Cliente (Browser)

**❌ PROHIBIDO**:
```typescript
// NUNCA hacer esto:
console.log('User email:', user.email);
console.log('User data:', user);
console.error('Auth failed for', session.user.email);
```

**✅ PERMITIDO**:
```typescript
// Solo logs de eventos genéricos sin PII:
trackEvent('signup_completed'); // analytics.ts
trackEvent('chat_started', { requestId: generateRequestId() });

// En desarrollo, usar condicional:
if (process.env.NODE_ENV === 'development') {
  console.log('[Dev] User action:', eventType);
}
```

**Regla general**: En producción, **CERO** `console.log`/`console.error` con PII en cliente.

---

### 2.2 Servidor (API Routes, Server Components, Edge Functions)

**❌ PROHIBIDO**:
```typescript
// NUNCA:
console.log('Processing for user:', email);
console.error('DB error:', error.message, user);
res.status(500).json({ error: error.stack, user: req.user });
```

**✅ PERMITIDO**:
```typescript
// Logs con requestId y resultado únicamente:
const requestId = crypto.randomUUID();

console.log(JSON.stringify({
  requestId,
  event: 'chat_request',
  status: 'ok',
  timestamp: new Date().toISOString()
}));

// En caso de error:
console.error(JSON.stringify({
  requestId,
  event: 'chat_request',
  status: 'error',
  errorCode: 'OPENAI_TIMEOUT',
  timestamp: new Date().toISOString()
}));

// Respuesta al cliente (sin stack trace):
res.status(500).json({ 
  error: 'Internal server error', 
  requestId 
});
```

**Formato estándar de log**:
```typescript
{
  requestId: string;      // UUID único por request
  event: string;          // Nombre del evento/endpoint
  status: 'ok' | 'error'; // Resultado
  errorCode?: string;     // Código genérico (sin detalles internos)
  timestamp: string;      // ISO 8601
}
```

---

## 3. Manejo de Errores

### 3.1 Respuestas de Error al Cliente

**❌ NUNCA exponer**:
- Stack traces completos
- Mensajes de error de base de datos
- Paths internos del servidor
- Queries SQL
- Nombres de tablas
- Variables de entorno

**✅ Siempre redactar**:
```typescript
// Mal:
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// Bien:
catch (error) {
  const requestId = crypto.randomUUID();
  
  console.error(JSON.stringify({
    requestId,
    event: 'api_endpoint_name',
    status: 'error',
    errorType: error.constructor.name,
    timestamp: new Date().toISOString()
  }));

  return NextResponse.json({ 
    error: 'An error occurred. Please try again.',
    requestId 
  }, { status: 500 });
}
```

### 3.2 Códigos de Error Genéricos

Usar códigos sin detalles internos:
- `AUTH_FAILED` (no decir "invalid password")
- `RESOURCE_NOT_FOUND` (no decir "user_id 123 not in DB")
- `EXTERNAL_SERVICE_ERROR` (no decir "OpenAI returned 429")
- `INVALID_INPUT` (no especificar el campo exacto si contiene PII)

---

## 4. Seguridad de Service Keys

### 4.1 SUPABASE_SERVICE_ROLE_KEY

**❌ NUNCA**:
- Exponer en código cliente (`"use client"`, `window`, componentes React)
- Incluir en bundles del frontend
- Commitear en `.env` (debe estar en `.gitignore`)
- Loggear en producción
- Enviar en headers desde el cliente

**✅ SOLO usar en**:
- API Routes de Next.js (`/app/api/**/route.ts`)
- Server Components (sin `"use client"`)
- Edge Functions autenticadas
- Scripts de servidor (migrations, seeds)

**Verificación automática** (añadir a CI):
```bash
# Buscar SERVICE_ROLE_KEY en código cliente:
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/components/ src/app/**/\(marketing\)/ src/app/**/\(auth\)/
# Si hay resultados: ¡ALERTA!
```

### 4.2 Variables de Entorno

**Estructura de `.env.local`** (nunca commitear):
```bash
# Público (prefijo NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Privado (sin prefijo - solo servidor)
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
DATABASE_URL=...
```

**Verificar en build**:
```bash
# El bundle no debe contener:
grep -i "service.role" .next/static/**/*.js
# Debe retornar 0 resultados
```

---

## 5. Analytics y Tracking

### 5.1 Reglas para `analytics.ts`

Solo eventos genéricos sin PII:
```typescript
// ✅ OK:
trackEvent('signup_completed');
trackEvent('chat_started', { sessionId: randomUUID() });
trackEvent('file_uploaded', { fileType: 'pdf', sizeKB: 150 });

// ❌ NO:
trackEvent('user_login', { email: user.email });
trackEvent('chat_message', { content: message.text });
```

### 5.2 Anonimización

Si necesitas trackear usuarios:
- Usar IDs hasheados (SHA-256 de user.id + salt)
- Nunca emails/nombres en payloads
- Revisar políticas de Google Analytics / Plausible

---

## 6. Checklist Post-Deploy

### 6.1 Verificación de Logs

Ejecutar después de cada deploy a producción:

```bash
# 1. Verificar que no hay console.log residuales con PII
grep -r "console.log" src/app/ src/components/ | grep -E "(email|password|user\.)"

# 2. Verificar SERVICE_ROLE_KEY no en cliente
grep -r "SERVICE_ROLE_KEY" src/components/ src/app/\(marketing\)/ src/app/\(auth\)/

# 3. Verificar bundle no contiene secrets
grep -rE "(supabase.*service|openai_api)" .next/static/chunks/

# 4. Revisar errores expuestos en API
curl https://tu-dominio.com/api/chat -X POST -d '{"invalid":"data"}' -H "Content-Type: application/json"
# Debe retornar error genérico, no stack trace
```

### 6.2 Testing Manual en Producción

| Prueba | Esperado | ❌ Falla si... |
|--------|----------|---------------|
| Abrir DevTools > Console | Sin logs de PII | Aparece email/user data |
| POST inválido a `/api/*` | `{ error: "Generic message", requestId }` | Aparece stack trace o SQL |
| Network tab > Inspect headers | Sin `SERVICE_ROLE_KEY` | Hay Authorization con service key |
| View Page Source | Sin secrets hardcodeados | Aparece API key en `<script>` |
| Logs de servidor (Vercel/Railway) | Solo requestId + status | Aparece email/contenido de chat |

### 6.3 Revisión de Código Pre-Merge

Antes de hacer merge a `main`, revisar:

- [ ] No hay `console.log` sin condicional `NODE_ENV === 'development'`
- [ ] Errores usan `requestId` y mensajes genéricos
- [ ] Service keys solo en archivos de servidor (no `"use client"`)
- [ ] Analytics no incluye PII en payloads
- [ ] Respuestas de API no exponen detalles internos
- [ ] `.env.local` no está commiteado (revisar `.gitignore`)

### 6.4 Monitoreo Continuo

Configurar alertas (Vercel/Sentry):
- Detectar logs con patrones de PII (regex: email, SSN, etc.)
- Alertar si hay 500s con stack traces expuestos
- Revisar semanalmente logs de producción buscando "email", "password", "token"

---

## 7. Plantilla de Revisión (Copy-Paste)

```markdown
## Security Review Checklist

Fecha: ___________
Reviewer: ___________
Branch/PR: ___________

### PII & Logging
- [ ] No console.log con PII en cliente
- [ ] Logs de servidor usan requestId + status
- [ ] Errores redactados sin datos de usuario

### Keys & Secrets
- [ ] SERVICE_ROLE_KEY solo en servidor
- [ ] Sin secrets en .env commiteado
- [ ] Sin API keys en bundles del cliente

### Post-Deploy
- [ ] DevTools Console limpio
- [ ] Errores de API genéricos (no stack traces)
- [ ] Network tab sin secrets en headers
- [ ] Logs de producción revisados

### Analytics
- [ ] trackEvent sin PII en payloads
- [ ] IDs de usuario hasheados si aplica

**Resultado**: ✅ Aprobado / ❌ Requiere cambios

**Notas**:
___________________________________________
```

---

## 8. Referencias y Herramientas

### Herramientas Recomendadas
- **ESLint plugin**: `eslint-plugin-no-secrets` (detecta secrets en código)
- **Pre-commit hook**: Bloquear commits con `console.log.*user|email|password`
- **CI Check**: Agregar step que corra los grep de este doc

### Recursos
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [GDPR & PII Best Practices](https://gdpr.eu/personal-data/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

**Última actualización**: 2025-10-11  
**Responsable**: Equipo Briki  
**Revisión**: Cada deploy a producción

