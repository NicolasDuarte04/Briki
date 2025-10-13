# Security Quick Start Guide

Guía rápida para implementar las políticas de seguridad y PII en Briki.

---

## 🚀 Inicio Rápido (5 minutos)

### 1. Ejecutar el Check de Seguridad

```bash
# Antes de cada deploy:
./scripts/security-check.sh
```

Si falla, revisa los errores y corrige antes de deployar.

---

### 2. Usar el Logger Seguro en API Routes

```typescript
import { createLogger, ErrorCodes } from '@/lib/secure-logging';

export async function POST(request: NextRequest) {
  const logger = createLogger();
  
  try {
    logger.info('api_endpoint_name');
    // ... tu código ...
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('api_endpoint_name', ErrorCodes.INTERNAL_ERROR);
    return NextResponse.json(
      { error: 'Error message', requestId: logger.getRequestId() },
      { status: 500 }
    );
  }
}
```

---

### 3. Usar devLog en Componentes Cliente

```typescript
import { devLog } from '@/lib/secure-logging';

// ❌ NO:
console.log('User clicked', user.email);

// ✅ SÍ:
devLog('User clicked button');
```

---

## 📚 Documentación Completa

| Archivo | Propósito |
|---------|-----------|
| `docs/SECURITY_PII_POLICIES.md` | **Políticas completas**: reglas, checklist, ejemplos |
| `docs/SECURITY_IMPLEMENTATION_EXAMPLE.md` | **Ejemplos de código**: API routes, componentes, tests |
| `src/lib/secure-logging.ts` | **Utilidad de logging**: logger seguro, sanitización |
| `scripts/security-check.sh` | **Script de verificación**: ejecutar pre-deploy |

---

## ✅ Checklist Pre-Deploy (1 minuto)

Antes de hacer deploy a producción:

```bash
# 1. Ejecutar security check
./scripts/security-check.sh

# 2. Verificar que no hay console.log residuales
grep -r "console.log" src/app/ src/components/ | wc -l
# Debe ser 0 o muy bajo (solo devLog)

# 3. Build y verificar bundle
pnpm build
grep -rE "(service.*role|SUPABASE_SERVICE_ROLE)" .next/static/ | wc -l
# Debe ser 0

# 4. Test manual en staging
curl https://staging.briki.com/api/chat \
  -X POST \
  -d '{"invalid":"data"}' \
  -H "Content-Type: application/json"
# Debe retornar error genérico, no stack trace
```

---

## 🔐 Reglas de Oro

### ❌ NUNCA

1. Loggear emails, nombres, contraseñas, tokens
2. Exponer `SUPABASE_SERVICE_ROLE_KEY` en cliente
3. Retornar stack traces al cliente
4. Usar `console.log` sin guard de desarrollo
5. Commitear archivos `.env`

### ✅ SIEMPRE

1. Usar `createLogger()` en servidor
2. Usar `devLog()` en cliente
3. Redactar errores con mensajes genéricos
4. Incluir `requestId` en respuestas de error
5. Ejecutar `security-check.sh` antes de deploy

---

## 🐛 Troubleshooting

### "Found console.log with potential PII"

**Solución**: Reemplazar con `devLog()` o remover:

```typescript
// Antes:
console.log('User email:', user.email);

// Después:
devLog('User action performed');
```

---

### "Found SERVICE_ROLE_KEY in client code"

**Solución**: Mover lógica a API route o Server Component:

```typescript
// ❌ NO - componente cliente:
"use client";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ SÍ - API route:
// app/api/my-endpoint/route.ts
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

---

### "Found stack trace in API response"

**Solución**: Usar `sanitizeError()`:

```typescript
// Antes:
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// Después:
catch (error) {
  const sanitized = sanitizeError(error);
  return NextResponse.json(sanitized, { status: 500 });
}
```

---

## 🔄 Workflow Recomendado

### Durante Desarrollo

1. Usar `devLog()` libremente para debugging
2. Nunca loggear datos reales de usuarios
3. Usar `.env.local` para secrets (nunca commitear)

### Antes de PR

1. Ejecutar `./scripts/security-check.sh`
2. Revisar que logs solo contienen metadata
3. Verificar que errores son genéricos

### Antes de Deploy

1. `pnpm build` → revisar warnings
2. `./scripts/security-check.sh` → debe pasar
3. Test manual en staging → verificar respuestas de error
4. Deploy a producción
5. Revisar logs de Vercel primeros 5 minutos

---

## 📞 Ayuda

- **Políticas completas**: `docs/SECURITY_PII_POLICIES.md`
- **Ejemplos de código**: `docs/SECURITY_IMPLEMENTATION_EXAMPLE.md`
- **Issues conocidos**: Buscar "security" en GitHub Issues

---

**Última actualización**: 2025-10-11

