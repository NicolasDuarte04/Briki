# API Logger Utility

## Overview

Structured logging and error handling utility for API routes that provides:
- Request ID tracking for debugging
- Proper HTTP status code propagation from upstream services (e.g., OpenAI SDK)
- Structured JSON logging with timing information
- Safe error messages that don't leak secrets

## Usage

### Basic Setup

```typescript
import {
  logRequest,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-logger';

const ROUTE_NAME = '/api/your-route';

export async function POST(request: NextRequest) {
  // Generate requestId and start timer at the very beginning
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Log request start
    logRequest({
      requestId,
      route: ROUTE_NAME,
      phase: 'start',
    });

    // Get user context if available
    const { user, currentOrg } = await getCurrentOrg();

    // Your business logic here
    const result = await someOperation();

    // Return success with structured logging
    return createSuccessResponse(
      requestId,
      { result },
      ROUTE_NAME,
      startTime,
      user.id,
      currentOrg.id
    );

  } catch (error: any) {
    // Return error with proper status code and logging
    return createErrorResponse(
      requestId,
      error,
      ROUTE_NAME,
      startTime,
      user?.id,
      currentOrg?.id
    );
  }
}
```

## Features

### 1. Request ID Tracking

Every request gets a unique `requestId` that:
- Is included in all log entries
- Is returned to the client in the response
- Can be used by support to trace issues

### 2. HTTP Status Propagation

The error handler automatically extracts HTTP status codes from:
- OpenAI SDK errors (`error.status`)
- HTTP errors (`error.statusCode`)
- Error codes mapped to appropriate statuses

### 3. Structured Logging

All logs are output as single-line JSON for easy parsing:

```json
{
  "timestamp": "2025-10-25T12:34:56.789Z",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "route": "/api/chat/process-message",
  "phase": "success",
  "elapsedMs": 1234,
  "status": 200,
  "userId": "user_123",
  "orgId": "org_456"
}
```

Error logs include additional context:

```json
{
  "timestamp": "2025-10-25T12:34:56.789Z",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "route": "/api/chat/process-message",
  "phase": "error",
  "elapsedMs": 456,
  "status": 429,
  "userId": "user_123",
  "orgId": "org_456",
  "error": {
    "name": "RateLimitError",
    "message": "Rate limit exceeded",
    "code": "rate_limit_exceeded"
  }
}
```

### 4. Safe Error Messages

Error messages are sanitized based on environment:
- **Development**: Full error details for debugging
- **Production**: Generic messages that don't leak sensitive information

### 5. OpenAI Error Mapping

Common OpenAI error codes are automatically mapped to appropriate HTTP status codes:

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `invalid_api_key` | 400 | Invalid request |
| `authentication_error` | 401 | Authentication failed |
| `permission_error` | 403 | Forbidden |
| `not_found_error` | 404 | Not found |
| `rate_limit_exceeded` | 429 | Too many requests |
| `insufficient_quota` | 503 | Service unavailable |

## Response Format

### Success Response

```typescript
{
  ok: true,
  data: {
    // Your response data
  },
  requestId: "123e4567-e89b-12d3-a456-426614174000"
}
```

### Error Response

```typescript
{
  ok: false,
  error: "Safe error message for client",
  requestId: "123e4567-e89b-12d3-a456-426614174000"
}
```

## Frontend Integration

The frontend can display the `requestId` to users for support purposes:

```typescript
try {
  const response = await fetch('/api/chat/process-message', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  const result = await response.json();
  
  if (!response.ok || !result.ok) {
    const error: any = new Error(result.error);
    error.requestId = result.requestId;
    throw error;
  }
  
  // Handle success
} catch (error: any) {
  // Display error with requestId
  const requestIdInfo = error.requestId 
    ? ` (Request ID: ${error.requestId})` 
    : '';
  
  showError(`Error: ${error.message}${requestIdInfo}`);
}
```

## Best Practices

1. **Always generate requestId first** - Before any async operations
2. **Log at phase boundaries** - Start, success, and error
3. **Don't log sensitive data** - Passwords, API keys, tokens
4. **Don't log full prompts** - They can be very large
5. **Include user/org context** - When available for debugging
6. **Use try-finally for cleanup** - If you need guaranteed logging

## Migration Guide

To migrate existing API routes:

1. Import the logger utilities
2. Generate `requestId` at the start
3. Replace success responses with `createSuccessResponse`
4. Replace error handling with `createErrorResponse`
5. Update frontend to handle `requestId` in responses

Example migration:

**Before:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const result = await doWork();
    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**After:**
```typescript
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    logRequest({ requestId, route: ROUTE_NAME, phase: 'start' });
    const result = await doWork();
    return createSuccessResponse(requestId, result, ROUTE_NAME, startTime);
  } catch (error: any) {
    return createErrorResponse(requestId, error, ROUTE_NAME, startTime);
  }
}
```

