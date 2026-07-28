/**
 * Retry Strategy with Exponential Backoff
 * 
 * Retries failed requests with increasing delays.
 * Includes jitter to prevent thundering herd problem.
 * 
 * Algorithm:
 * Attempt 1 → wait 1s
 * Attempt 2 → wait 2s
 * Attempt 3 → wait 4s
 * Attempt 4 → wait 8s
 * + random jitter (0-50% of delay)
 */

import { APIError, RateLimitError, AuthenticationError, NetworkError } from '../types/movie';

export interface RetryConfig {
  maxAttempts: number; // Maximum retry attempts
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay cap
  exponentialBase: number; // Base for exponential calculation (default: 2)
  jitterPercent: number; // Jitter as percentage (0-100)
  retryableStatusCodes: number[]; // HTTP status codes to retry
  shouldRetry?: (error: any) => boolean; // Custom retry logic
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError: Error;
  totalDelay: number;
  delays: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 32000, // 32 seconds
  exponentialBase: 2,
  jitterPercent: 50,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: baseDelay * (exponentialBase ^ attempt)
  const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt - 1);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // Add jitter (0 to jitterPercent of delay)
  const jitterRange = cappedDelay * (config.jitterPercent / 100);
  const jitter = Math.random() * jitterRange;

  return Math.floor(cappedDelay + jitter);
}

/**
 * Determine if error is retryable
 */
function isRetryable(error: any, config: RetryConfig): boolean {
  // Custom retry logic takes precedence
  if (config.shouldRetry) {
    return config.shouldRetry(error);
  }

  // Never retry authentication errors
  if (error instanceof AuthenticationError) {
    return false;
  }

  // Always retry network errors
  if (error instanceof NetworkError) {
    return true;
  }

  // Retry based on status code
  if (error instanceof APIError && error.statusCode) {
    return config.retryableStatusCodes.includes(error.statusCode);
  }

  // Retry rate limit errors (429)
  if (error instanceof RateLimitError) {
    return true;
  }

  // Default: retry for network-like errors
  if (
    error.name === 'TypeError' ||
    error.message?.includes('fetch') ||
    error.message?.includes('network')
  ) {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (context: RetryContext) => void
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const delays: number[] = [];
  let lastError: Error;
  let totalDelay = 0;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const shouldRetryError = isRetryable(error, finalConfig);

      // If last attempt or not retryable, throw immediately
      if (attempt >= finalConfig.maxAttempts || !shouldRetryError) {
        throw error;
      }

      // Handle rate limit with Retry-After header
      let delay: number;
      if (error instanceof RateLimitError && error.retryAfter) {
        delay = error.retryAfter * 1000; // Convert to ms
      } else {
        delay = calculateDelay(attempt, finalConfig);
      }

      delays.push(delay);
      totalDelay += delay;

      // Notify retry callback
      if (onRetry) {
        onRetry({
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          lastError,
          totalDelay,
          delays,
        });
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError!;
}

/**
 * Retry wrapper class for easier use
 */
export class RetryStrategy {
  private config: RetryConfig;
  private onRetry?: (context: RetryContext) => void;

  constructor(
    config: Partial<RetryConfig> = {},
    onRetry?: (context: RetryContext) => void
  ) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.onRetry = onRetry;
  }

  /**
   * Execute function with retry
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return retry(fn, this.config, this.onRetry);
  }

  /**
   * Wrap a function with retry logic
   */
  wrap<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return ((...args: any[]) => {
      return this.execute(() => fn(...args));
    }) as T;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * Retry decorator for class methods
 */
export function Retry(config: Partial<RetryConfig> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}

/**
 * Example usage:
 * 
 * ```typescript
 * // Simple retry
 * const movie = await retry(() => fetchMovie(550), {
 *   maxAttempts: 3,
 *   baseDelay: 1000,
 * });
 * 
 * // With retry strategy
 * const retryStrategy = new RetryStrategy({
 *   maxAttempts: 5,
 *   baseDelay: 1000,
 *   maxDelay: 30000,
 * }, (context) => {
 *   console.log(`Retry attempt ${context.attempt}/${context.maxAttempts}`);
 * });
 * 
 * const movie = await retryStrategy.execute(() => fetchMovie(550));
 * 
 * // As decorator
 * class MovieService {
 *   @Retry({ maxAttempts: 3 })
 *   async getMovie(id: number) {
 *     return fetchMovie(id);
 *   }
 * }
 * ```
 */
