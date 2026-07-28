/**
 * Token Bucket Unit Tests
 * 
 * Tests for token bucket rate limiter.
 */

import { test, expect, describe, beforeEach } from '@playwright/test';
import { TokenBucket, RateLimiter } from '../../src/lib/data/resilience/TokenBucket';

describe('TokenBucket', () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    bucket = new TokenBucket({
      capacity: 10,
      refillRate: 2, // 2 tokens per second
      initialTokens: 10,
    });
  });

  test('should consume tokens when available', async () => {
    await bucket.consume();
    expect(bucket.getTokens()).toBeLessThan(10);
  });

  test('should queue requests when tokens depleted', async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await bucket.consume();
    }

    expect(bucket.getTokens()).toBe(0);
    expect(bucket.getQueueLength()).toBe(0);

    // Next consume should queue
    const promise = bucket.consume();
    expect(bucket.getQueueLength()).toBe(1);

    bucket.stop();
    await expect(promise).rejects.toThrow('Token bucket stopped');
  });

  test('should refill tokens over time', async ({ page }) => {
    // Consume some tokens
    await bucket.consume();
    await bucket.consume();

    const tokensAfterConsume = bucket.getTokens();
    expect(tokensAfterConsume).toBe(8);

    // Wait for refill (1 second should add 2 tokens)
    await page.waitForTimeout(1100);

    const tokensAfterRefill = bucket.getTokens();
    expect(tokensAfterRefill).toBeGreaterThan(tokensAfterConsume);
  });

  test('should not exceed capacity', async ({ page }) => {
    // Start with full bucket
    expect(bucket.getTokens()).toBe(10);

    // Wait for refill attempt
    await page.waitForTimeout(1100);

    // Should still be at capacity
    expect(bucket.getTokens()).toBeLessThanOrEqual(10);
  });

  test('should calculate wait time correctly', () => {
    // Full bucket has no wait time
    expect(bucket.getWaitTime()).toBe(0);

    // Empty bucket
    bucket.consumeMany(10);
    const waitTime = bucket.getWaitTime();
    expect(waitTime).toBeGreaterThan(0);
  });

  test('should reset bucket state', async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await bucket.consume();
    }

    expect(bucket.getTokens()).toBe(0);

    // Reset
    bucket.reset();
    expect(bucket.getTokens()).toBe(10);
  });

  test('should provide status information', () => {
    const status = bucket.getStatus();

    expect(status).toHaveProperty('tokens');
    expect(status).toHaveProperty('capacity');
    expect(status).toHaveProperty('queueLength');
    expect(status).toHaveProperty('utilizationPercent');

    expect(status.capacity).toBe(10);
  });
});

describe('RateLimiter', () => {
  test('should limit request rate', async () => {
    const limiter = new RateLimiter(2); // 2 requests per second
    const requests: number[] = [];

    // Execute 4 requests
    const promises = Array.from({ length: 4 }, async (_, i) => {
      await limiter.execute(async () => {
        requests.push(Date.now());
      });
    });

    await Promise.all(promises);

    // Check that requests were spaced out
    expect(requests.length).toBe(4);

    // First 2 should be immediate (within burst capacity)
    const firstTwoGap = requests[1] - requests[0];
    expect(firstTwoGap).toBeLessThan(100);

    // Later requests should be rate limited
    const lastTwoGap = requests[3] - requests[2];
    expect(lastTwoGap).toBeGreaterThanOrEqual(400);

    limiter.stop();
  });

  test('should wrap functions with rate limiting', async () => {
    const limiter = new RateLimiter(1); // 1 request per second
    let callCount = 0;

    const wrappedFn = limiter.wrap(async () => {
      callCount++;
      return 'success';
    });

    // Execute multiple times
    await wrappedFn();
    await wrappedFn();

    expect(callCount).toBe(2);

    limiter.stop();
  });
});
