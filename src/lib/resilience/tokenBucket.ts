/**
 * Enterprise Token Bucket Rate Limiter
 * 
 * Protects APIs from request bursts and prevents HTTP 429 errors
 */

import { RateLimitError, type TokenBucketConfig } from '@/types/movie';

export enum RequestPriority {
  HIGH = 3,
  MEDIUM = 2,
  LOW = 1,
}

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  priority: RequestPriority;
  timestamp: number;
  timeout?: number;
  timeoutId?: NodeJS.Timeout;
  traceId?: string;
}

const DEFAULT_TOKEN_BUCKET_CONFIG: TokenBucketConfig = {
  capacity: 40, // Max burst
  refillRate: 10, // Tokens per interval
  refillInterval: 1000, // 1 second
};

export class TokenBucket {
  private tokens: number;
  private config: TokenBucketConfig;
  private queue: QueuedRequest<unknown>[] = [];
  private refillTimer: NodeJS.Timeout | null = null;
  private readonly name: string;
  private processing: boolean = false;

  // Metrics
  private totalRequests: number = 0;
  private queuedRequests: number = 0;
  private rejectedRequests: number = 0;
  private timeoutRequests: number = 0;

  constructor(name: string, config: Partial<TokenBucketConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_TOKEN_BUCKET_CONFIG, ...config };
    this.tokens = this.config.capacity;
    this.startRefill();
  }

  /**
   * Execute request with rate limiting
   */
  async execute<T>(
    fn: () => Promise<T>,
    priority: RequestPriority = RequestPriority.MEDIUM,
    timeout?: number,
    traceId?: string
  ): Promise<T> {
    this.totalRequests++;

    // Try immediate execution if tokens available
    if (this.tokens > 0) {
      this.tokens--;
      this.processQueue(); // Process any queued requests
      
      try {
        return await fn();
      } catch (error) {
        throw error;
      }
    }

    // Queue request
    return new Promise<T>((resolve, reject) => {
      this.queuedRequests++;

      const request: QueuedRequest<T> = {
        fn: fn as any,
        resolve: resolve as any,
        reject,
        priority,
        timestamp: Date.now(),
        timeout,
        traceId,
      };

      // Set timeout if specified
      if (timeout) {
        request.timeoutId = setTimeout(() => {
          this.removeFromQueue(request);
          this.timeoutRequests++;
          this.queuedRequests--;
          reject(new RateLimitError(this.name, undefined, traceId));
        }, timeout);
      }

      // Add to queue (maintain priority order)
      this.addToQueue(request);
    });
  }

  /**
   * Add request to priority queue
   */
  private addToQueue(request: QueuedRequest<unknown>): void {
    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex((r) => r.priority < request.priority);
    
    if (insertIndex === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(insertIndex, 0, request);
    }

    // Try to process queue
    this.processQueue();
  }

  /**
   * Remove request from queue
   */
  private removeFromQueue(request: QueuedRequest<unknown>): void {
    const index = this.queue.indexOf(request);
    if (index > -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.tokens > 0) {
      const request = this.queue.shift()!;
      this.tokens--;
      this.queuedRequests--;

      // Clear timeout
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }

      // Execute request
      try {
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Refill tokens periodically
   */
  private startRefill(): void {
    this.refillTimer = setInterval(() => {
      // Add tokens up to capacity
      this.tokens = Math.min(
        this.config.capacity,
        this.tokens + this.config.refillRate
      );

      // Process any queued requests
      this.processQueue();
    }, this.config.refillInterval);

    // Prevent timer from keeping process alive
    if (this.refillTimer.unref) {
      this.refillTimer.unref();
    }
  }

  /**
   * Stop refill timer
   */
  stop(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }

    // Reject all queued requests
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      this.rejectedRequests++;
      request.reject(new Error('Token bucket stopped'));
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      tokens: this.tokens,
      capacity: this.config.capacity,
      queueLength: this.queue.length,
      refillRate: this.config.refillRate,
      utilization: (1 - this.tokens / this.config.capacity) * 100,
    };
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      totalRequests: this.totalRequests,
      queuedRequests: this.queuedRequests,
      rejectedRequests: this.rejectedRequests,
      timeoutRequests: this.timeoutRequests,
      currentQueueLength: this.queue.length,
      averageQueueTime: this.calculateAverageQueueTime(),
    };
  }

  /**
   * Calculate average queue time
   */
  private calculateAverageQueueTime(): number {
    if (this.queue.length === 0) {
      return 0;
    }

    const now = Date.now();
    const totalTime = this.queue.reduce((sum, req) => sum + (now - req.timestamp), 0);
    return totalTime / this.queue.length;
  }

  /**
   * Cancel queued request by trace ID
   */
  cancelRequest(traceId: string): boolean {
    const index = this.queue.findIndex((r) => r.traceId === traceId);
    
    if (index > -1) {
      const request = this.queue[index];
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      this.queue.splice(index, 1);
      this.queuedRequests--;
      request.reject(new Error('Request cancelled'));
      return true;
    }

    return false;
  }

  /**
   * Get queue position for trace ID
   */
  getQueuePosition(traceId: string): number {
    return this.queue.findIndex((r) => r.traceId === traceId);
  }

  /**
   * Manually add tokens (for testing)
   */
  addTokens(amount: number): void {
    this.tokens = Math.min(this.config.capacity, this.tokens + amount);
    this.processQueue();
  }

  /**
   * Reset bucket
   */
  reset(): void {
    this.tokens = this.config.capacity;
    this.totalRequests = 0;
    this.queuedRequests = 0;
    this.rejectedRequests = 0;
    this.timeoutRequests = 0;
  }
}

/**
 * Token Bucket Registry - manages multiple rate limiters
 */
export class TokenBucketRegistry {
  private buckets: Map<string, TokenBucket> = new Map();

  /**
   * Get or create token bucket
   */
  get(name: string, config?: Partial<TokenBucketConfig>): TokenBucket {
    if (!this.buckets.has(name)) {
      this.buckets.set(name, new TokenBucket(name, config));
    }
    return this.buckets.get(name)!;
  }

  /**
   * Get all buckets
   */
  getAll(): TokenBucket[] {
    return Array.from(this.buckets.values());
  }

  /**
   * Get aggregated metrics
   */
  getMetrics() {
    const metrics: Record<string, ReturnType<TokenBucket['getMetrics']>> = {};
    
    for (const [name, bucket] of this.buckets) {
      metrics[name] = bucket.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Stop all buckets
   */
  stopAll(): void {
    for (const bucket of this.buckets.values()) {
      bucket.stop();
    }
  }

  /**
   * Reset all buckets
   */
  resetAll(): void {
    for (const bucket of this.buckets.values()) {
      bucket.reset();
    }
  }
}

/**
 * Global token bucket registry
 */
export const tokenBucketRegistry = new TokenBucketRegistry();
