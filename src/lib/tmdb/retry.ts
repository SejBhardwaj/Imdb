/**
 * Retry Logic with Exponential Backoff and Jitter
 * 
 * Implements resilient retry patterns:
 * - Exponential backoff: 1s → 2s → 4s → 8s
 * - Random jitter: Prevents thundering herd
 * - Configurable max attempts
 */

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;      // ms
  maxDelay: number;          // ms
  factor: number;            // multiplier for exponential backoff
  jitter: boolean;           // add random jitter
}

interface RetryStats {
  attempt: number;
  totalAttempts: number;
  delays: number[];
  errors: Error[];
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  factor: number,
  maxDelay: number,
  jitter: boolean
): number {
  // Exponential backoff: delay * (factor ^ attempt)
  let delay = initialDelay * Math.pow(factor, attempt);
  
  // Cap at max delay
  delay = Math.min(delay, maxDelay);
  
  // Add jitter (random 50-100% of delay)
  if (jitter) {
    const jitterAmount = delay * (0.5 + Math.random() * 0.5);
    delay = jitterAmount;
  }
  
  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff and jitter
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg: RetryConfig = {
    maxAttempts: 5,
    initialDelay: 1000,        // 1 second
    maxDelay: 30000,           // 30 seconds
    factor: 2,                 // double each time
    jitter: true,
    ...config,
  };

  const stats: RetryStats = {
    attempt: 0,
    totalAttempts: cfg.maxAttempts,
    delays: [],
    errors: [],
  };

  let lastError: Error;

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    stats.attempt = attempt + 1;

    try {
      const result = await fn();
      
      // Log success after retries
      if (attempt > 0) {
        console.log(`[Retry] Success on attempt ${attempt + 1}/${cfg.maxAttempts}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      stats.errors.push(lastError);

      // Last attempt, don't wait
      if (attempt === cfg.maxAttempts - 1) {
        console.error(`[Retry] All ${cfg.maxAttempts} attempts failed`, {
          errors: stats.errors.map(e => e.message),
          delays: stats.delays,
        });
        throw lastError;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        cfg.initialDelay,
        cfg.factor,
        cfg.maxDelay,
        cfg.jitter
      );
      
      stats.delays.push(delay);

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${cfg.maxAttempts} failed: ${lastError.message}. ` +
        `Retrying in ${delay}ms...`
      );

      // Wait before retry
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError!;
}

/**
 * Retry with custom shouldRetry predicate
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg: RetryConfig = {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    factor: 2,
    jitter: true,
    ...config,
  };

  let lastError: Error;

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      if (!shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Last attempt
      if (attempt === cfg.maxAttempts - 1) {
        throw lastError;
      }

      const delay = calculateDelay(
        attempt,
        cfg.initialDelay,
        cfg.factor,
        cfg.maxDelay,
        cfg.jitter
      );

      console.warn(`[Retry] Retrying after ${delay}ms (attempt ${attempt + 1})`);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Check if error is retryable (network errors, timeouts, 5xx)
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;
    
    // 5xx server errors are retryable
    if (status >= 500 && status < 600) {
      return true;
    }
    
    // 429 Too Many Requests (with backoff)
    if (status === 429) {
      return true;
    }
    
    // 408 Request Timeout
    if (status === 408) {
      return true;
    }
  }

  return false;
}

/**
 * Retry specifically for HTTP requests
 */
export async function retryHttp<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  return retryWithCondition(
    fn,
    (error, attempt) => isRetryableError(error),
    config
  );
}

/**
 * Batch retry - retry multiple operations with shared backoff
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  config: Partial<RetryConfig> = {}
): Promise<T[]> {
  const cfg: RetryConfig = {
    maxAttempts: 3, // Lower for batch operations
    initialDelay: 500,
    maxDelay: 10000,
    factor: 2,
    jitter: true,
    ...config,
  };

  const results: T[] = [];
  const failures: Array<{ index: number; error: Error }> = [];

  // Try all operations
  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await retry(operations[i], cfg);
      results[i] = result;
    } catch (error) {
      failures.push({ index: i, error: error as Error });
    }
  }

  // If any failed, throw error with details
  if (failures.length > 0) {
    const error = new Error(
      `Batch operation failed: ${failures.length}/${operations.length} operations failed`
    );
    (error as any).failures = failures;
    throw error;
  }

  return results;
}

export type { RetryConfig, RetryStats };
