/**
 * Centralized retry helper for Prisma transactions
 * 
 * Handles connection pool saturation errors (P2024, P2028) with
 * exponential backoff. Designed for encrypted data operations
 * that MUST use $transaction for atomic decrypt_pii() calls.
 * 
 * @module withTransactionRetry
 * @see src/lib/data/workspace.ts - Original implementation in getPinnedClients
 */

import { Prisma } from '@prisma/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default retry configuration
 * Conservative values to balance reliability vs latency
 */
export const DEFAULT_RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  maxRetries: 3,
  /** Initial delay in milliseconds (doubles each retry) */
  initialDelayMs: 500,
  /** Maximum delay cap in milliseconds */
  maxDelayMs: 4000,
} as const;

/**
 * Prisma error codes that are safe to retry
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
const RETRYABLE_ERROR_CODES = new Set([
  'P2024', // Timed out fetching a new connection from the connection pool
  'P2028', // Transaction API error (unable to start transaction)
]);

/**
 * Error message patterns that indicate retryable conditions
 */
const RETRYABLE_ERROR_PATTERNS = [
  'Unable to start a transaction',
  'Connection pool timeout',
  'Timed out fetching a new connection',
] as const;

// ============================================================================
// TYPES
// ============================================================================

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  /** Optional context for logging (e.g., function name) */
  context?: string;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error | undefined;
  attempts: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determines if an error is retryable based on code or message
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const prismaError = error as { code?: string; message?: string };
  
  // Check error code
  if (prismaError.code && RETRYABLE_ERROR_CODES.has(prismaError.code)) {
    return true;
  }
  
  // Check error message patterns
  if (prismaError.message) {
    return RETRYABLE_ERROR_PATTERNS.some(pattern => 
      prismaError.message!.includes(pattern)
    );
  }
  
  return false;
}

/**
 * Calculates delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms...
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1);
  
  // Cap at maximum
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  
  // Add small jitter (±10%) to prevent thundering herd
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
  
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Executes an async operation with retry logic for Prisma transaction errors.
 * 
 * Use this wrapper for any function that uses prisma.$transaction(),
 * especially those involving encrypt/decrypt operations that require
 * atomic execution via set_config().
 * 
 * @example
 * ```typescript
 * const result = await withTransactionRetry(
 *   () => prisma.$transaction(async (tx) => {
 *     await tx.$executeRaw`SELECT set_config('app.encryption_key', ${key}, true)`;
 *     return tx.$queryRaw`SELECT decrypt_pii(name_enc) FROM clients`;
 *   }),
 *   { context: 'getClients', maxRetries: 3 }
 * );
 * 
 * if (result.success) {
 *   return result.data;
 * } else {
 *   console.error('All retries failed:', result.error);
 *   return []; // Graceful degradation
 * }
 * ```
 * 
 * @param operation - Async function to execute (typically wraps $transaction)
 * @param config - Optional retry configuration
 * @returns RetryResult with success status, data, and attempt count
 */
export async function withTransactionRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    initialDelayMs = DEFAULT_RETRY_CONFIG.initialDelayMs,
    maxDelayMs = DEFAULT_RETRY_CONFIG.maxDelayMs,
    context = 'transaction',
  } = config;

  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await operation();
      return { success: true, data, attempts: attempt };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const canRetry = isRetryableError(error) && attempt < maxRetries;
      
      if (canRetry) {
        const delay = calculateDelay(attempt, initialDelayMs, maxDelayMs);
        console.warn(
          `[${context}] Retry ${attempt}/${maxRetries} after ${delay}ms:`,
          lastError.message
        );
        await sleep(delay);
        continue;
      }
      
      // Non-retryable error or max retries reached
      if (attempt === maxRetries) {
        console.error(`[${context}] All ${maxRetries} attempts failed:`, lastError.message);
      }
      
      break;
    }
  }
  
  return { 
    success: false, 
    error: lastError, 
    attempts: maxRetries 
  };
}

/**
 * Simplified wrapper that returns data or fallback on failure.
 * 
 * Use when you want graceful degradation without handling RetryResult.
 * 
 * @example
 * ```typescript
 * const clients = await withTransactionRetryOrDefault(
 *   () => fetchEncryptedClients(orgId),
 *   [], // Fallback to empty array
 *   { context: 'getPinnedClients' }
 * );
 * ```
 */
export async function withTransactionRetryOrDefault<T>(
  operation: () => Promise<T>,
  fallback: T,
  config: RetryConfig = {}
): Promise<T> {
  const result = await withTransactionRetry(operation, config);
  return result.success ? result.data! : fallback;
}
