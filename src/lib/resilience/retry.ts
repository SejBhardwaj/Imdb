/**
 * Enterprise Retry Strategy
 * 
 * Implements exponential backoff with full jitter, retry budgets, and selective retrying
 */

import type { APIError, RetryConfig } from '@/types/movie';

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Determine if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  // Network failures - always retry
  if (error instanceof Error) {
    if (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('fetch failed') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT')
    ) {
      return true;
    }
  }

  // Check APIError interface
  if (typeof error === 'object' && error !== null && 'retryable' in error) {
    return (error as APIError).retryable;
  }

  // HTTP status codes
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    
    // Retry these status codes
    if ([429, 500, 502, 503, 504].includes(status)) {
      return true;
    }

    // Never retry these
    if ([400, 401, 403, 404, 422].includes(status)) {
      return false;
    }
  }

  // Default: don't retry unknown errors
  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // Apply full jitter if enabled
  if (config.jitter) {
    return Math.random() * cappedDelay;
  }

  return cappedDelay;
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
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt < fullConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if retryable
      if (!isRetryable(error)) {
        throw error;
      }

      // Last attempt - don't wait
      if (attempt === fullConfig.maxAttempts - 1) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, fullConfig);

      // Notify retry callback
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Retry Budget - limits total retry attempts across all requests
 */
export class RetryBudget {
  private budget: number;
  private maxBudget: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(maxBudget: number = 100, refillRate: number = 10) {
    this.maxBudget = maxBudget;
    this.budget = maxBudget;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Refill budget based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const refillAmount = Math.floor(elapsed * this.refillRate);

    if (refillAmount > 0) {
      this.budget = Math.min(this.maxBudget, this.budget + refillAmount);
      this.lastRefill = now;
    }
  }

  /**
   * Check if retry is allowed
   */
  canRetry(): boolean {
    this.refill();
    return this.budget > 0;
  }

  /**
   * Consume retry budget
   */
  consumeRetry(): boolean {
    this.refill();
    
    if (this.budget > 0) {
      this.budget--;
      return true;
    }
    
    return false;
  }

  /**
   * Get current budget
   */
  getBudget(): number {
    this.refill();
    return this.budget;
  }

  /**
   * Get budget percentage
   */
  getBudgetPercentage(): number {
    return (this.getBudget() / this.maxBudget) * 100;
  }
}

/**
 * Global retry budget instance
 */
export const globalRetryBudget = new RetryBudget();

/**
 * Retry with budget enforcement
 */
export async function retryWithBudget<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  budget: RetryBudget = globalRetryBudget,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  return retry(
    fn,
    config,
    (attempt, error) => {
      // Check budget before retry
      if (!budget.consumeRetry()) {
        throw new Error('Retry budget exhausted');
      }

      // Call original callback
      if (onRetry) {
        onRetry(attempt, error);
      }
    }
  );
}
