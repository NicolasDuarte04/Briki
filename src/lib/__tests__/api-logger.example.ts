/**
 * Example Usage of API Logger
 * 
 * This file demonstrates how the structured logging works in practice.
 * It's not a real test, but shows expected behavior.
 */

// Example 1: Success Case Log Output
const successLog = {
  "timestamp": "2025-10-25T10:30:00.123Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "route": "/api/chat/process-message",
  "phase": "success",
  "elapsedMs": 1234,
  "status": 200,
  "userId": "user_abc123",
  "orgId": "org_xyz789"
};

// Example 2: OpenAI Rate Limit Error Log Output
const rateLimitLog = {
  "timestamp": "2025-10-25T10:30:05.456Z",
  "requestId": "661e9511-f30c-52e5-b827-557766551111",
  "route": "/api/chat/process-message",
  "phase": "error",
  "elapsedMs": 456,
  "status": 429,
  "userId": "user_abc123",
  "orgId": "org_xyz789",
  "error": {
    "name": "RateLimitError",
    "message": "Rate limit exceeded",
    "code": "rate_limit_exceeded"
  }
};

// Example 3: OpenAI Quota Exceeded Error Log Output
const quotaLog = {
  "timestamp": "2025-10-25T10:30:10.789Z",
  "requestId": "772fa622-g41d-63f6-c938-668877662222",
  "route": "/api/chat/process-message",
  "phase": "error",
  "elapsedMs": 234,
  "status": 503,
  "userId": "user_abc123",
  "orgId": "org_xyz789",
  "error": {
    "name": "InsufficientQuotaError",
    "message": "Insufficient quota",
    "code": "insufficient_quota"
  }
};

// Example 4: Validation Error Log Output
const validationLog = {
  "timestamp": "2025-10-25T10:30:15.012Z",
  "requestId": "883gb733-h52e-74g7-d049-779988773333",
  "route": "/api/chat/process-message",
  "phase": "error",
  "elapsedMs": 12,
  "status": 400,
  "userId": undefined, // User not available for validation errors
  "orgId": undefined,
  "error": {
    "name": "Error",
    "message": "Bad request: caseId: Required",
    "code": undefined
  }
};

// Example 5: Success API Response to Client
const successResponse = {
  ok: true,
  data: {
    response: "Based on the documents provided, here's my analysis...",
    caseId: "case_abc123"
  },
  requestId: "550e8400-e29b-41d4-a716-446655440000"
};

// Example 6: Error API Response to Client (Production)
const errorResponseProd = {
  ok: false,
  error: "Service temporarily unavailable. Please try again later.",
  requestId: "661e9511-f30c-52e5-b827-557766551111"
};

// Example 7: Error API Response to Client (Development)
const errorResponseDev = {
  ok: false,
  error: "Rate limit exceeded. Please try again in a moment.",
  requestId: "661e9511-f30c-52e5-b827-557766551111"
};

// Example 8: Frontend Error Display
const frontendErrorMessage = 
  "Disculpa, hubo un problema procesando tu mensaje. ¿Puedes intentar de nuevo? " +
  "(Request ID: 661e9511-f30c-52e5-b827-557766551111)";

/**
 * Expected Log Sequence for a Successful Request:
 * 
 * 1. Start log:
 * {"timestamp":"2025-10-25T10:30:00.000Z","requestId":"550e8400...","route":"/api/chat/process-message","phase":"start"}
 * 
 * 2. Success log:
 * {"timestamp":"2025-10-25T10:30:00.123Z","requestId":"550e8400...","route":"/api/chat/process-message","phase":"success","elapsedMs":1234,"status":200,"userId":"user_abc123","orgId":"org_xyz789"}
 */

/**
 * Expected Log Sequence for a Failed Request:
 * 
 * 1. Start log:
 * {"timestamp":"2025-10-25T10:30:05.000Z","requestId":"661e9511...","route":"/api/chat/process-message","phase":"start"}
 * 
 * 2. Error log:
 * {"timestamp":"2025-10-25T10:30:05.456Z","requestId":"661e9511...","route":"/api/chat/process-message","phase":"error","elapsedMs":456,"status":429,"userId":"user_abc123","orgId":"org_xyz789","error":{"name":"RateLimitError","message":"Rate limit exceeded","code":"rate_limit_exceeded"}}
 */

/**
 * Status Code Mapping Examples:
 */
const statusCodeExamples = {
  // Client Errors (4xx)
  validation: { code: undefined, status: 400 },
  invalidApiKey: { code: 'invalid_api_key', status: 400 },
  authentication: { code: 'authentication_error', status: 401 },
  permission: { code: 'permission_error', status: 403 },
  notFound: { code: 'not_found_error', status: 404 },
  rateLimit: { code: 'rate_limit_exceeded', status: 429 },
  
  // Server Errors (5xx)
  unknown: { code: undefined, status: 500 },
  quota: { code: 'insufficient_quota', status: 503 },
  serverError: { code: 'server_error', status: 503 },
};

export {
  successLog,
  rateLimitLog,
  quotaLog,
  validationLog,
  successResponse,
  errorResponseProd,
  errorResponseDev,
  frontendErrorMessage,
  statusCodeExamples,
};

