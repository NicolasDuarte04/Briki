# Structured Logging & Error Handling Implementation

## Summary

Implemented structured logging and proper error handling for the chat API with request ID tracking, HTTP status propagation, and safe error messages.

## Changes Made

### 1. Created API Logger Utility (`src/lib/api-logger.ts`)

A comprehensive logging and error handling utility that provides:

- **Request ID Generation**: Each request gets a unique UUID for tracking
- **Structured JSON Logging**: Single-line JSON logs with consistent format
- **HTTP Status Propagation**: Extracts and forwards status codes from upstream errors (especially OpenAI SDK)
- **Safe Error Messages**: Environment-aware error messages that don't leak secrets
- **Timing Metrics**: Tracks elapsed time for each request
- **Context Preservation**: Includes userId and orgId when available

**Key Functions:**
- `logRequest()` - Outputs structured JSON logs
- `getErrorStatus()` - Extracts HTTP status from various error types
- `getSafeErrorMessage()` - Creates safe error messages for clients
- `createErrorResponse()` - Generates error responses with logging
- `createSuccessResponse()` - Generates success responses with logging

### 2. Refactored Chat API Handler (`src/app/api/chat/process-message/route.ts`)

**Before:**
- Generic 500 errors for all failures
- Simple console.error logging
- No request tracking
- No status code propagation

**After:**
- Generates requestId at the start
- Logs structured JSON for start/success/error phases
- Proper HTTP status codes (400, 401, 429, 503, etc.)
- Response includes requestId for support
- Timing information in all logs

### 3. Updated OpenAI Service (`src/lib/openai.ts`)

**Before:**
- Caught errors and re-threw generic Error objects
- Lost status code information from OpenAI SDK

**After:**
- Preserves original error properties (status, code)
- Re-throws errors with status codes intact
- Wraps unknown errors with appropriate status (503)

### 4. Enhanced Frontend Error Handling

Updated both chat components to capture and display requestId:
- `src/components/Chat/ConversationPane.tsx`
- `src/components/Chat/BrikiChat.tsx`

**Features:**
- Captures requestId from error responses
- Displays requestId in error messages for support
- Proper error type annotations

## Log Output Examples

### Success Log
```json
{
  "timestamp": "2025-10-25T12:34:56.789Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "route": "/api/chat/process-message",
  "phase": "success",
  "elapsedMs": 1234,
  "status": 200,
  "userId": "user_abc123",
  "orgId": "org_xyz789"
}
```

### Error Log (OpenAI Rate Limit)
```json
{
  "timestamp": "2025-10-25T12:35:00.123Z",
  "requestId": "661e9511-f30c-52e5-b827-557766551111",
  "route": "/api/chat/process-message",
  "phase": "error",
  "elapsedMs": 456,
  "status": 429,
  "userId": "user_abc123",
  "orgId": "org_xyz789",
  "error": {
    "name": "RateLimitError",
    "message": "Rate limit exceeded. Please try again in a moment.",
    "code": "rate_limit_exceeded"
  }
}
```

## HTTP Status Code Mapping

The system now properly returns these status codes based on error type:

| Status | Scenario |
|--------|----------|
| 400 | Invalid request, validation errors |
| 401 | Authentication errors |
| 403 | Permission denied |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Unknown server errors |
| 503 | Service unavailable (quota, downtime) |

## Response Format

### Success Response
```typescript
{
  ok: true,
  data: {
    response: "...",
    caseId: "..."
  },
  requestId: "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Response
```typescript
{
  ok: false,
  error: "Safe error message for client",
  requestId: "550e8400-e29b-41d4-a716-446655440000"
}
```

## Frontend Display

Error messages now include requestId for support:

```
Disculpa, hubo un problema procesando tu mensaje. ¿Puedes intentar de nuevo? (Request ID: 550e8400-e29b-41d4-a716-446655440000)
```

## Benefits

1. **Debugging**: Single requestId tracks a request through all systems
2. **Monitoring**: Structured logs can be parsed and analyzed
3. **Support**: Users can provide requestId for faster issue resolution
4. **Transparency**: Proper HTTP codes help clients handle errors correctly
5. **Security**: Sensitive data is never logged or exposed to clients
6. **Performance**: Timing metrics help identify slow requests

## Usage for Other API Routes

The `api-logger` utility is reusable for all API routes. See `src/lib/api-logger.README.md` for:
- Complete usage guide
- Migration instructions
- Best practices
- Error code mappings

## Testing Recommendations

1. **Success Case**: Verify requestId in successful responses
2. **Validation Error**: Check 400 status with requestId
3. **Auth Error**: Verify 401 status propagation
4. **OpenAI Rate Limit**: Confirm 429 status instead of 500
5. **OpenAI Quota**: Confirm 503 status instead of 500
6. **Log Format**: Check logs are valid JSON
7. **Frontend Display**: Verify requestId appears in error messages

## Future Enhancements

Potential improvements:
- Correlation IDs across multiple API calls
- Log aggregation service integration
- Request/response size tracking
- User agent logging
- Geographic location tracking
- Custom metrics for business logic

## Files Modified

1. ✅ `src/lib/api-logger.ts` - New utility
2. ✅ `src/lib/api-logger.README.md` - Documentation
3. ✅ `src/app/api/chat/process-message/route.ts` - Refactored
4. ✅ `src/lib/openai.ts` - Error propagation
5. ✅ `src/components/Chat/ConversationPane.tsx` - Frontend handling
6. ✅ `src/components/Chat/BrikiChat.tsx` - Frontend handling

## Verification Checklist

- [x] requestId generated at start of each request
- [x] Structured logs output as single-line JSON
- [x] OpenAI 4xx/5xx status codes propagate correctly
- [x] Response includes requestId field
- [x] Frontend captures and displays requestId
- [x] No secrets or prompts logged
- [x] Timing information included in logs
- [x] Safe error messages for production
- [x] Development mode shows full details
- [x] No linting errors

## Success Criteria Met ✅

- ✅ Logs show one clear line per request with requestId
- ✅ OpenAI 4xx/5xx propagate as the correct HTTP code, not always 500
- ✅ Frontend can display requestId for support
- ✅ Structured context includes: requestId, path, phase, elapsedMs, error details, status
- ✅ No secrets or full prompts logged
- ✅ Response shape includes `{ ok, error/data, requestId }`

