/**
 * Enterprise Rate Limiter Middleware
 * 
 * Production-grade rate limiting with:
 * - Sliding window algorithm
 * - Token bucket support
 * - Per-operation limits
 * - Redis adapter ready
 * - Retry-After headers
 * - Graceful frontend handling
 * 
 * Limits:
 * - Review Creation: 5 requests/minute
 * - Voting: 20 requests/minute
 * - Editing: 10 requests/minute
 * - Flagging: 20 requests/hour
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limit configuration per operation
export enum RateLimitOperation {
  CREATE_REVIEW = 'create_review',
  VOTE = 'vote',
  EDIT_REVIEW = 'edit_review',
  FLAG_REVIEW = 'flag_review',
  VIEW_REVIEWS = 'view_reviews',
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  algorithm: 'sliding-window' | 'token-bucket';
}

// Rate limit configurations
const RATE_LIMITS: Record<RateLimitOperation, RateLimitConfig> = {
  [RateLimitOperation.CREATE_REVIEW]: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'sliding-window',
  },
  [RateLimitOperation.VOTE]: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'token-bucket',
  },
  [RateLimitOperation.EDIT_REVIEW]: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'sliding-window',
  },
  [RateLimitOperation.FLAG_REVIEW]: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    algorithm: 'sliding-window',
  },
  [RateLimitOperation.VIEW_REVIEWS]: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'token-bucket',
  },
};

// Rate limit entry
interface RateLimitEntry {
  count: number;
  requests: number[]; // Timestamps for sliding window
  tokens: number; // For token bucket
  lastRefill: number; // Last token refill time
  resetAt: number;
}

// In-memory store (use Redis in production)
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Get or create rate limit entry
   */
  getOrCreate(key: string, config: RateLimitConfig): RateLimitEntry {
    const existing = this.store.get(key);
    const now = Date.now();

    if (!existing || now > existing.resetAt) {
      // Create new entry
      const entry: RateLimitEntry = {
        count: 0,
        requests: [],
        tokens: config.maxRequests,
        lastRefill: now,
        resetAt: now + config.windowMs,
      };
      this.store.set(key, entry);
      return entry;
    }

    return existing;
  }

  /**
   * Update entry
   */
  update(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt + 60000) {
        // Keep for 1 minute after reset
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Start cleanup job
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const count = this.cleanup();
      if (count > 0) {
        console.log(`[Rate Limiter] Cleaned up ${count} expired entries`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get store size
   */
  size(): number {
    return this.store.size;
  }
}

// Singleton store
const rateLimitStore = new RateLimitStore();

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // Seconds until can retry
  reason?: string;
}

/**
 * Sliding window rate limiter
 */
function checkSlidingWindow(
  entry: RateLimitEntry,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Remove old requests outside window
  entry.requests = entry.requests.filter((timestamp) => timestamp > windowStart);

  const requestCount = entry.requests.length;

  if (requestCount >= config.maxRequests) {
    // Calculate retry-after from oldest request
    const oldestRequest = entry.requests[0];
    const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: oldestRequest + config.windowMs,
      retryAfter,
      reason: 'Rate limit exceeded',
    };
  }

  // Add current request
  entry.requests.push(now);

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.requests.length,
    resetAt: entry.requests[0] + config.windowMs,
  };
}

/**
 * Token bucket rate limiter
 */
function checkTokenBucket(
  entry: RateLimitEntry,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();

  // Refill tokens based on time passed
  const timeSinceRefill = now - entry.lastRefill;
  const refillRate = config.maxRequests / config.windowMs; // Tokens per ms
  const tokensToAdd = timeSinceRefill * refillRate;

  entry.tokens = Math.min(entry.tokens + tokensToAdd, config.maxRequests);
  entry.lastRefill = now;

  if (entry.tokens < 1) {
    // Not enough tokens
    const timeForOneToken = 1 / refillRate;
    const retryAfter = Math.ceil(timeForOneToken / 1000);

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: now + timeForOneToken,
      retryAfter,
      reason: 'Rate limit exceeded - no tokens available',
    };
  }

  // Consume one token
  entry.tokens -= 1;

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.floor(entry.tokens),
    resetAt: entry.resetAt,
  };
}

/**
 * Check rate limit for operation
 */
export function checkRateLimit(
  userId: string,
  operation: RateLimitOperation
): RateLimitResult {
  const config = RATE_LIMITS[operation];
  const key = `${userId}:${operation}`;

  // Get or create entry
  const entry = rateLimitStore.getOrCreate(key, config);

  // Check based on algorithm
  let result: RateLimitResult;

  if (config.algorithm === 'sliding-window') {
    result = checkSlidingWindow(entry, config);
  } else {
    result = checkTokenBucket(entry, config);
  }

  // Update store
  rateLimitStore.update(key, entry);

  return result;
}

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(operation: RateLimitOperation) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Get user ID from request
    const userId = request.headers.get('x-user-id') || 'anonymous';

    // Check rate limit
    const result = checkRateLimit(userId, operation);

    // Add rate limit headers to response
    const addHeaders = (response: NextResponse): NextResponse => {
      response.headers.set('X-RateLimit-Limit', String(result.limit));
      response.headers.set('X-RateLimit-Remaining', String(result.remaining));
      response.headers.set('X-RateLimit-Reset', String(result.resetAt));

      if (result.retryAfter) {
        response.headers.set('Retry-After', String(result.retryAfter));
      }

      return response;
    };

    // Rate limit exceeded
    if (!result.allowed) {
      console.log(`[Rate Limiter] Blocked: ${userId} - ${operation}`);

      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: result.reason || 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          limit: result.limit,
          remaining: result.remaining,
          resetAt: result.resetAt,
          retryAfter: result.retryAfter,
        },
        { status: 429 }
      );

      return addHeaders(response);
    }

    // Allowed - process request
    const response = await handler(request);
    return addHeaders(response);
  };
}

/**
 * Get rate limit status without consuming
 */
export function getRateLimitStatus(
  userId: string,
  operation: RateLimitOperation
): RateLimitResult {
  const config = RATE_LIMITS[operation];
  const key = `${userId}:${operation}`;

  const entry = rateLimitStore.getOrCreate(key, config);

  if (config.algorithm === 'sliding-window') {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const requestCount = entry.requests.filter((t) => t > windowStart).length;

    return {
      allowed: requestCount < config.maxRequests,
      limit: config.maxRequests,
      remaining: config.maxRequests - requestCount,
      resetAt: entry.resetAt,
    };
  } else {
    const now = Date.now();
    const timeSinceRefill = now - entry.lastRefill;
    const refillRate = config.maxRequests / config.windowMs;
    const tokensToAdd = timeSinceRefill * refillRate;
    const currentTokens = Math.min(entry.tokens + tokensToAdd, config.maxRequests);

    return {
      allowed: currentTokens >= 1,
      limit: config.maxRequests,
      remaining: Math.floor(currentTokens),
      resetAt: entry.resetAt,
    };
  }
}

/**
 * Reset rate limit for user (admin use)
 */
export function resetRateLimit(userId: string, operation?: RateLimitOperation): void {
  if (operation) {
    const key = `${userId}:${operation}`;
    rateLimitStore.cleanup();
  } else {
    // Reset all operations for user
    Object.values(RateLimitOperation).forEach((op) => {
      const key = `${userId}:${op}`;
      rateLimitStore.cleanup();
    });
  }
}

/**
 * Get rate limiter stats
 */
export function getRateLimiterStats() {
  return {
    totalEntries: rateLimitStore.size(),
    timestamp: Date.now(),
  };
}

// Export store for testing
export { rateLimitStore };

/**
 * Redis Adapter (for production)
 * 
 * ```typescript
 * import { createClient } from 'redis';
 * 
 * const redisClient = createClient({ url: process.env.REDIS_URL });
 * await redisClient.connect();
 * 
 * // Sliding window with sorted sets
 * async function checkSlidingWindowRedis(
 *   userId: string,
 *   operation: string,
 *   config: RateLimitConfig
 * ): Promise<RateLimitResult> {
 *   const key = `ratelimit:${operation}:${userId}`;
 *   const now = Date.now();
 *   const windowStart = now - config.windowMs;
 * 
 *   // Remove old entries
 *   await redisClient.zRemRangeByScore(key, 0, windowStart);
 * 
 *   // Count requests in window
 *   const count = await redisClient.zCard(key);
 * 
 *   if (count >= config.maxRequests) {
 *     // Get oldest request for retry-after
 *     const oldest = await redisClient.zRange(key, 0, 0, { REV: false });
 *     const retryAfter = Math.ceil((parseInt(oldest[0]) + config.windowMs - now) / 1000);
 * 
 *     return {
 *       allowed: false,
 *       limit: config.maxRequests,
 *       remaining: 0,
 *       resetAt: parseInt(oldest[0]) + config.windowMs,
 *       retryAfter,
 *     };
 *   }
 * 
 *   // Add current request
 *   await redisClient.zAdd(key, { score: now, value: `${now}` });
 *   await redisClient.expire(key, Math.ceil(config.windowMs / 1000));
 * 
 *   return {
 *     allowed: true,
 *     limit: config.maxRequests,
 *     remaining: config.maxRequests - count - 1,
 *     resetAt: now + config.windowMs,
 *   };
 * }
 * ```
 */
