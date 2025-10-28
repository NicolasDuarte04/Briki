// src/lib/api-logger.ts
import { NextResponse } from 'next/server';

export interface LogContext {
  requestId: string;
  route: string;
  phase: 'start' | 'success' | 'error';
  elapsedMs?: number;
  status?: number;
  userId?: string;
  orgId?: string;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Logs structured JSON for API requests
 * Safe for production - does not log secrets or sensitive data
 */
export function logRequest(context: LogContext): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId: context.requestId,
    route: context.route,
    phase: context.phase,
    elapsedMs: context.elapsedMs,
    status: context.status,
    userId: context.userId,
    orgId: context.orgId,
    ...(context.error && {
      error: {
        name: context.error.name,
        message: context.error.message,
        code: context.error.code,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: context.error.stack }),
      },
    }),
  };

  // Output as single-line JSON for easier parsing
  console.log(JSON.stringify(logEntry));
}

/**
 * Extracts HTTP status from various error types
 * Handles OpenAI SDK errors, HTTP errors, and generic errors
 */
export function getErrorStatus(error: any): number {
  // OpenAI SDK errors have a status property
  if (error.status && typeof error.status === 'number') {
    return error.status;
  }

  // Some errors might have statusCode
  if (error.statusCode && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  // Check for common error codes that map to specific statuses
  if (error.code) {
    switch (error.code) {
      case 'invalid_api_key':
      case 'invalid_request_error':
        return 400;
      case 'authentication_error':
        return 401;
      case 'permission_error':
        return 403;
      case 'not_found_error':
        return 404;
      case 'rate_limit_exceeded':
        return 429;
      case 'insufficient_quota':
      case 'server_error':
        return 503;
      default:
        return 500;
    }
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Creates a safe error message for client response
 * Removes sensitive information while keeping useful context
 */
export function getSafeErrorMessage(error: any): string {
  // For development, return more details
  if (process.env.NODE_ENV === 'development') {
    return error.message || 'An unexpected error occurred';
  }

  // For production, return generic messages based on error type
  const status = getErrorStatus(error);

  if (status >= 400 && status < 500) {
    // Client errors - safe to expose some details
    return error.message || 'Invalid request';
  }

  if (status >= 500) {
    // Server errors - use generic message
    return 'Service temporarily unavailable. Please try again later.';
  }

  return 'An unexpected error occurred';
}

/**
 * Helper to create error responses with requestId
 */
export function createErrorResponse(
  requestId: string,
  error: any,
  route: string,
  startTime: number,
  userId?: string,
  orgId?: string
): NextResponse {
  const status = getErrorStatus(error);
  const safeMessage = getSafeErrorMessage(error);
  const elapsedMs = Date.now() - startTime;

  // Log the error
  logRequest({
    requestId,
    route,
    phase: 'error',
    elapsedMs,
    status,
    userId,
    orgId,
    error: {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      code: error.code,
      stack: error.stack,
    },
  });

  // Return error response
  return NextResponse.json(
    {
      ok: false,
      error: safeMessage,
      requestId,
    },
    { status }
  );
}

/**
 * Helper to create success responses with requestId
 */
export function createSuccessResponse(
  requestId: string,
  data: any,
  route: string,
  startTime: number,
  userId?: string,
  orgId?: string
): NextResponse {
  const elapsedMs = Date.now() - startTime;

  // Log the success
  logRequest({
    requestId,
    route,
    phase: 'success',
    elapsedMs,
    status: 200,
    userId,
    orgId,
  });

  // Return success response
  return NextResponse.json({
    ok: true,
    data,
    requestId,
  });
}

