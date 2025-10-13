/**
 * Secure Logging Utility
 * 
 * Implementa las políticas de seguridad y PII definidas en docs/SECURITY_PII_POLICIES.md
 * 
 * Uso:
 * import { createLogger, sanitizeError } from '@/lib/secure-logging';
 * 
 * const logger = createLogger();
 * logger.info('chat_request', { customField: 'value' });
 * logger.error('chat_request', 'OPENAI_TIMEOUT');
 */

export type LogLevel = 'info' | 'warn' | 'error';
export type LogStatus = 'ok' | 'error';

export interface LogEntry {
  requestId: string;
  event: string;
  status: LogStatus;
  level: LogLevel;
  errorCode?: string;
  timestamp: string;
  [key: string]: unknown; // Permitir campos extra no-PII
}

/**
 * Genera un requestId único para tracking
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para entornos sin crypto.randomUUID
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Logger seguro que previene exposición de PII
 */
export class SecureLogger {
  private requestId: string;

  constructor(requestId?: string) {
    this.requestId = requestId || generateRequestId();
  }

  /**
   * Log exitoso (status: ok)
   */
  info(event: string, extraFields?: Record<string, unknown>): void {
    this.log('info', event, 'ok', undefined, extraFields);
  }

  /**
   * Log de advertencia
   */
  warn(event: string, message?: string, extraFields?: Record<string, unknown>): void {
    this.log('warn', event, 'ok', message, extraFields);
  }

  /**
   * Log de error (status: error)
   */
  error(event: string, errorCode: string, extraFields?: Record<string, unknown>): void {
    this.log('error', event, 'error', errorCode, extraFields);
  }

  /**
   * Obtiene el requestId actual
   */
  getRequestId(): string {
    return this.requestId;
  }

  /**
   * Método interno de logging
   */
  private log(
    level: LogLevel,
    event: string,
    status: LogStatus,
    errorCode?: string,
    extraFields?: Record<string, unknown>
  ): void {
    // Solo loggear en servidor
    if (typeof window !== 'undefined') {
      return; // No loggear en cliente
    }

    const logEntry: LogEntry = {
      requestId: this.requestId,
      event,
      status,
      level,
      timestamp: new Date().toISOString(),
      ...(errorCode && { errorCode }),
      ...(extraFields && this.sanitizeFields(extraFields)),
    };

    const logString = JSON.stringify(logEntry);

    switch (level) {
      case 'info':
        console.log(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
        console.error(logString);
        break;
    }
  }

  /**
   * Sanitiza campos extra para remover PII accidental
   */
  private sanitizeFields(fields: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const piiKeys = ['email', 'password', 'token', 'accessToken', 'refreshToken', 'userId', 'user_id', 'name', 'phone'];

    for (const [key, value] of Object.entries(fields)) {
      // Remover campos con nombres sospechosos de PII
      if (piiKeys.some(piiKey => key.toLowerCase().includes(piiKey))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

/**
 * Crea un logger con requestId opcional
 */
export function createLogger(requestId?: string): SecureLogger {
  return new SecureLogger(requestId);
}

/**
 * Sanitiza errores para respuestas al cliente
 * 
 * @param error - Error original
 * @param genericMessage - Mensaje genérico para el usuario
 * @returns Objeto de error sanitizado con requestId
 */
export function sanitizeError(
  error: unknown,
  genericMessage = 'An error occurred. Please try again.'
): { error: string; requestId: string } {
  const requestId = generateRequestId();

  // Loggear el error real en servidor (sin PII)
  const logger = createLogger(requestId);
  const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
  logger.error('api_error', errorType);

  // Retornar solo mensaje genérico al cliente
  return {
    error: genericMessage,
    requestId,
  };
}

/**
 * Códigos de error estándar (sin detalles internos)
 */
export const ErrorCodes = {
  AUTH_FAILED: 'AUTH_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Helper para desarrollo: permite console.log solo en dev
 */
export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Dev]', ...args);
  }
}

/**
 * Redacta URLs removiendo tokens/secrets de query params
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ['token', 'access_token', 'refresh_token', 'api_key', 'secret'];
    
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    });
    
    return parsed.toString();
  } catch {
    return '[INVALID_URL]';
  }
}

