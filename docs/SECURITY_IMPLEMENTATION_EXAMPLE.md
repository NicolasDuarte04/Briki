# Ejemplo de Implementación de Políticas de Seguridad

Este documento muestra cómo aplicar las políticas definidas en `SECURITY_PII_POLICIES.md` en código real.

---

## 1. API Route Segura (Ejemplo)

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createLogger, sanitizeError, ErrorCodes } from '@/lib/secure-logging';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // 1. Crear logger con requestId único
  const logger = createLogger();
  const requestId = logger.getRequestId();

  try {
    // 2. Log del inicio de la request (sin PII)
    logger.info('chat_request_start');

    // 3. Autenticación (SERVER-ONLY - usa SERVICE_ROLE_KEY)
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error('chat_request', ErrorCodes.UNAUTHORIZED);
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401 }
      );
    }

    // 4. Validar input (sin loggear contenido del usuario)
    const body = await request.json();
    if (!body.message || typeof body.message !== 'string') {
      logger.error('chat_request', ErrorCodes.INVALID_INPUT);
      return NextResponse.json(
        { error: 'Invalid input', requestId },
        { status: 400 }
      );
    }

    // 5. Procesar request (ejemplo con OpenAI)
    // NUNCA loggear el contenido del mensaje del usuario
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: body.message }],
      }),
    });

    if (!response.ok) {
      logger.error('chat_request', ErrorCodes.EXTERNAL_SERVICE_ERROR);
      return NextResponse.json(
        { error: 'Service temporarily unavailable', requestId },
        { status: 503 }
      );
    }

    const data = await response.json();

    // 6. Log exitoso (sin contenido de respuesta)
    logger.info('chat_request_complete', { 
      tokensUsed: data.usage?.total_tokens 
    });

    // 7. Respuesta al cliente
    return NextResponse.json({
      message: data.choices[0].message.content,
      requestId,
    });

  } catch (error) {
    // 8. Manejo de errores: NUNCA exponer stack trace
    const sanitized = sanitizeError(error, 'An error occurred processing your request');
    logger.error('chat_request', ErrorCodes.INTERNAL_ERROR);
    
    return NextResponse.json(sanitized, { status: 500 });
  }
}
```

---

## 2. Componente Cliente Seguro

```typescript
// components/Chat/Composer.tsx
"use client";

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics'; // Ya sanitizado
import { devLog } from '@/lib/secure-logging';

export function ChatComposer() {
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Analytics sin PII
    trackEvent('chat_message_sent', { 
      messageLength: message.length,
      timestamp: Date.now() 
    });

    // ✅ Log solo en desarrollo
    devLog('Sending message with length:', message.length);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const error = await res.json();
        // ❌ NO loggear el mensaje de error completo si contiene PII
        // ✅ Solo mostrar al usuario, no console.log
        alert(error.error || 'Error sending message');
        return;
      }

      const data = await res.json();
      devLog('Response received with requestId:', data.requestId);
      
      // Actualizar UI...
    } catch (error) {
      // ❌ NUNCA: console.error(error)
      // ✅ Solo mensaje genérico
      alert('Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button type="submit">Send</button>
    </form>
  );
}
```

---

## 3. Server Component con Service Key

```typescript
// app/[locale]/(app)/dashboard/page.tsx
// NO tiene "use client" - puede usar SERVICE_ROLE_KEY

import { createServerClient } from '@/lib/supabase/server';
import { createLogger, ErrorCodes } from '@/lib/secure-logging';

export default async function DashboardPage() {
  const logger = createLogger();

  try {
    // ✅ SERVICE_ROLE_KEY solo accesible aquí (servidor)
    const supabase = createServerClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .single();

    if (error) {
      logger.error('dashboard_load', ErrorCodes.RESOURCE_NOT_FOUND);
      return <div>Error loading profile</div>;
    }

    logger.info('dashboard_load');

    return (
      <div>
        <h1>Welcome, {profile.display_name}</h1>
        {/* Renderizar datos... */}
      </div>
    );
  } catch (error) {
    logger.error('dashboard_load', ErrorCodes.INTERNAL_ERROR);
    return <div>An error occurred</div>;
  }
}
```

---

## 4. Patrones Comunes

### 4.1 Validar que no haya PII en analytics

```typescript
// ❌ MAL - contiene email
trackEvent('user_signup', { 
  email: user.email,
  name: user.name 
});

// ✅ BIEN - solo metadata no-PII
trackEvent('user_signup', { 
  signupMethod: 'google',
  locale: 'es',
  timestamp: Date.now()
});
```

### 4.2 Respuestas de error consistentes

```typescript
// Crear helper para respuestas estándar:
function errorResponse(
  message: string, 
  requestId: string, 
  status: number
): NextResponse {
  return NextResponse.json(
    { error: message, requestId },
    { status }
  );
}

// Uso:
return errorResponse('Invalid input', logger.getRequestId(), 400);
```

### 4.3 Sanitizar datos de terceros

```typescript
// Si una API externa retorna PII, no la loggees:
const externalData = await fetchFromExternalAPI();

// ❌ NO:
logger.info('external_api_response', { data: externalData });

// ✅ SÍ:
logger.info('external_api_response', { 
  statusCode: externalData.status,
  recordCount: externalData.items?.length 
});
```

---

## 5. Testing de Seguridad

### 5.1 Unit Test para Logger

```typescript
// __tests__/secure-logging.test.ts
import { SecureLogger } from '@/lib/secure-logging';

describe('SecureLogger', () => {
  it('should redact PII fields', () => {
    const logger = new SecureLogger();
    const consoleSpy = jest.spyOn(console, 'log');

    logger.info('test_event', { 
      email: 'user@example.com',
      safeField: 'ok' 
    });

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.email).toBe('[REDACTED]');
    expect(logged.safeField).toBe('ok');
  });

  it('should not log in client', () => {
    // Simular entorno de navegador
    (global as any).window = {};
    
    const logger = new SecureLogger();
    const consoleSpy = jest.spyOn(console, 'log');

    logger.info('test_event');

    expect(consoleSpy).not.toHaveBeenCalled();
    
    delete (global as any).window;
  });
});
```

### 5.2 Integration Test para API

```typescript
// __tests__/api/chat.test.ts
import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';

describe('POST /api/chat', () => {
  it('should not expose stack trace on error', async () => {
    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    });

    const res = await POST(req);
    const body = await res.json();

    // Verificar que NO hay stack trace
    expect(body).not.toHaveProperty('stack');
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('requestId');
    expect(typeof body.error).toBe('string');
    expect(body.error).not.toContain('Error:');
    expect(body.error).not.toContain('at ');
  });
});
```

---

## 6. Pre-commit Hook

Agregar a `.husky/pre-commit` o similar:

```bash
#!/bin/bash

echo "🔒 Running security checks..."

# 1. Buscar console.log con PII
CONSOLE_PII=$(grep -rE "console\.(log|error|warn).*\b(email|password|token|user\.)" src/ || true)
if [ ! -z "$CONSOLE_PII" ]; then
  echo "❌ Found console.log with potential PII:"
  echo "$CONSOLE_PII"
  exit 1
fi

# 2. Buscar SERVICE_ROLE_KEY en cliente
SERVICE_KEY_CLIENT=$(grep -r "SUPABASE_SERVICE_ROLE_KEY" src/components/ src/app/\(marketing\)/ src/app/\(auth\)/ || true)
if [ ! -z "$SERVICE_KEY_CLIENT" ]; then
  echo "❌ Found SERVICE_ROLE_KEY in client code:"
  echo "$SERVICE_KEY_CLIENT"
  exit 1
fi

# 3. Buscar hardcoded secrets
HARDCODED_SECRETS=$(grep -rE "(sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36})" src/ || true)
if [ ! -z "$HARDCODED_SECRETS" ]; then
  echo "❌ Found hardcoded secrets:"
  echo "$HARDCODED_SECRETS"
  exit 1
fi

echo "✅ Security checks passed"
```

---

## 7. Checklist de Implementación

Al agregar un nuevo endpoint o feature:

- [ ] Usar `createLogger()` para todos los logs
- [ ] Validar que logs solo contienen requestId + status
- [ ] Errores usan `sanitizeError()` o mensajes genéricos
- [ ] SERVICE_ROLE_KEY solo en archivos de servidor
- [ ] Analytics usa `trackEvent()` sin PII
- [ ] No hay `console.log` sin `devLog()` condicional
- [ ] Respuestas de error no exponen stack traces
- [ ] Tests verifican que no se expone PII

---

**Siguiente paso**: Ejecutar el script de verificación antes de deploy.

