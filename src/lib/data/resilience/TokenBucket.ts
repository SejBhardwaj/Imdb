/**
 * Token Bucket Rate Limiter
 * 
 * Implements token bucket algorithm for smooth rate limiting.
 * Prevents burst API requests that would trigger 429 responses.
 * 
 * Algorithm:
 * - Bucket has fixed capacity
 * - Each request consumes 1 token
 * - Tokens refill at constant rate
 * - If bucket empty: queue or delay request
 */

export interface TokenBucketConfig {
  capacity: number; // Maximum tokens in bucket
  refillRate: number; // Tokens added per second
  initialTokens?: number; // Starting tokens (default: capacity)
}

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private refillInterval: NodeJS.Timeout | null = null;

  constructor(config: TokenBucketConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.tokens = config.initialTokens ?? config.capacity;
    this.lastRefill = Date.now();

    // Start refill loop
    this.startRefill();
  }

  /**
   * Try to consume a token
   * Returns immediately if token available
   * Otherwise waits until token becomes available
   */
  async consume(): Promise<void> {
    // Refill tokens based on time passed
    this.refill();

    // If token available, consume it immediately
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    // Otherwise, queue the request
    return new Promise((resolve, reject) => {
      this.queue.push({
        resolve,
        reject,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Try to consume multiple tokens at once
   */
  async consumeMany(count: number): Promise<void> {
    if (count > this.capacity) {
      throw new Error(`Requested ${count} tokens exceeds bucket capacity ${this.capacity}`);
    }

    // Refill first
    this.refill();

    // If enough tokens, consume immediately
    if (this.tokens >= count) {
      this.tokens -= count;
      return Promise.resolve();
    }

    // Wait for enough tokens
    const promises: Promise<void>[] = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.consume());
    }

    await Promise.all(promises);
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds

    // Calculate tokens to add
    const tokensToAdd = elapsed * this.refillRate;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.capacity, this.tokens + Math.floor(tokensToAdd));
      this.lastRefill = now;

      // Process queue with available tokens
      this.processQueue();
    }
  }

  /**
   * Process queued requests with available tokens
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.tokens >= 1) {
      const item = this.queue.shift();
      if (item) {
        this.tokens -= 1;
        item.resolve();
      }
    }
  }

  /**
   * Start automatic refill loop
   */
  private startRefill(): void {
    // Refill every 100ms
    this.refillInterval = setInterval(() => {
      this.refill();
    }, 100);
  }

  /**
   * Stop refill loop
   */
  stop(): void {
    if (this.refillInterval) {
      clearInterval(this.refillInterval);
      this.refillInterval = null;
    }

    // Reject all queued requests
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.reject(new Error('Token bucket stopped'));
      }
    }
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill(); // Ensure tokens are up to date
    return this.tokens;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Reset bucket to full capacity
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.processQueue();
  }

  /**
   * Get estimated wait time for next token
   */
  getWaitTime(): number {
    if (this.tokens >= 1) {
      return 0;
    }

    // Time until next token refill
    const tokensNeeded = 1 - this.tokens;
    return (tokensNeeded / this.refillRate) * 1000; // Convert to ms
  }

  /**
   * Get bucket status
   */
  getStatus(): {
    tokens: number;
    capacity: number;
    queueLength: number;
    utilizationPercent: number;
  } {
    this.refill();

    return {
      tokens: this.tokens,
      capacity: this.capacity,
      queueLength: this.queue.length,
      utilizationPercent: ((this.capacity - this.tokens) / this.capacity) * 100,
    };
  }
}

/**
 * Rate limiter that wraps token bucket for easier use
 */
export class RateLimiter {
  private bucket: TokenBucket;

  constructor(requestsPerSecond: number, burstCapacity?: number) {
    this.bucket = new TokenBucket({
      capacity: burstCapacity ?? requestsPerSecond * 2, // Allow 2x burst
      refillRate: requestsPerSecond,
    });
  }

  /**
   * Execute function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.bucket.consume();
    return fn();
  }

  /**
   * Wrap a function with rate limiting
   */
  wrap<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: any[]) => {
      await this.bucket.consume();
      return fn(...args);
    }) as T;
  }

  /**
   * Get rate limiter status
   */
  getStatus() {
    return this.bucket.getStatus();
  }

  /**
   * Stop rate limiter
   */
  stop(): void {
    this.bucket.stop();
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * // TMDb allows 40 requests per 10 seconds = 4 req/s
 * const rateLimiter = new RateLimiter(4, 40);
 * 
 * // Execute with rate limiting
 * const movie = await rateLimiter.execute(() => fetchMovie(550));
 * 
 * // Or wrap the function
 * const fetchMovieRateLimited = rateLimiter.wrap(fetchMovie);
 * const movie = await fetchMovieRateLimited(550);
 * ```
 */
