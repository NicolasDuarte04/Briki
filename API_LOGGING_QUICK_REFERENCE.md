# API Logging Quick Reference

## 🚀 Quick Start

```typescript
import { createErrorResponse, createSuccessResponse, logRequest } from '@/lib/api-logger';

const ROUTE_NAME = '/api/your-route';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    logRequest({ requestId, route: ROUTE_NAME, phase: 'start' });
    
    const { user, currentOrg } = await getCurrentOrg();
    const result = await yourBusinessLogic();
    
    return createSuccessResponse(
      requestId, 
      result, 
      ROUTE_NAME, 
      startTime, 
      user.id, 
      currentOrg.id
    );
  } catch (error: any) {
    return createErrorResponse(
      requestId, 
      error, 
      ROUTE_NAME, 
      startTime
    );
  }
}
```

## 📊 Log Format

Single-line JSON:
```json
{"timestamp":"...","requestId":"...","route":"...","phase":"...","elapsedMs":123,"status":200}
```

## 🎯 Status Code Mapping

| Error Code | Status | Description |
|-----------|--------|-------------|
| `invalid_api_key` | 400 | Bad request |
| `authentication_error` | 401 | Unauthorized |
| `permission_error` | 403 | Forbidden |
| `not_found_error` | 404 | Not found |
| `rate_limit_exceeded` | 429 | Too many requests |
| `insufficient_quota` | 503 | Service unavailable |
| `server_error` | 503 | Service unavailable |
| _(unknown)_ | 500 | Internal error |

## ✅ Response Format

**Success:**
```typescript
{ ok: true, data: {...}, requestId: "..." }
```

**Error:**
```typescript
{ ok: false, error: "message", requestId: "..." }
```

## 🔧 Frontend Integration

```typescript
const result = await fetch('/api/endpoint', {...}).then(r => r.json());

if (!result.ok) {
  console.error(`Error: ${result.error} (ID: ${result.requestId})`);
}
```

## 📝 Best Practices

✅ **DO:**
- Generate requestId first thing
- Log at phase boundaries (start, success, error)
- Include user/org context when available
- Use createSuccessResponse/createErrorResponse helpers

❌ **DON'T:**
- Log passwords, API keys, or tokens
- Log full prompts (they're huge)
- Return different error messages in prod vs dev (handled automatically)
- Use generic 500 for all errors

## 🔍 Debugging

**Find all logs for a request:**
```bash
grep "requestId-here" logs.json
```

**Find all errors:**
```bash
grep '"phase":"error"' logs.json | jq
```

**Find slow requests (>2s):**
```bash
jq 'select(.elapsedMs > 2000)' logs.json
```

## 📚 Full Documentation

See `src/lib/api-logger.README.md` for complete documentation.

