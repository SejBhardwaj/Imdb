/**
 * Retry Strategy Unit Tests
 * 
 * Tests for exponential backoff retry logic.
 */

import { test, expect, describe } from '@playwright/test';
import { retry, RetryStrategy } from '../../src/lib/data/resilience/RetryStrategy';
import { APIError, AuthenticationError, RateLimitError, NetworkError } from '../../src/lib/data/types/movie';

describe('Retry Strategy', () => {
  test('should succeed on first attempt', async () => {
    let attempts = 0;

    const result = await retry(async () => {
      attempts++;
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  test('should retry on failure and succeed', async () => {
    let attempts = 0;

    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      },
      { maxAttempts: 5, baseDelay: 10 }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should fail after max attempts', async () => {
    let attempts = 0;

    await expect(
      retry(
        async () => {
          attempts++;
          throw new Error('Persistent failure');
        },
        { maxAttempts: 3, baseDelay: 10 }
      )
    ).rejects.toThrow('Persistent failure');

    expect(attempts).toBe(3);
  });

  test('should not retry authentication errors', async () => {
    let attempts = 0;

    await expect(
      retry(
        async () => {
          attempts++;
          throw new AuthenticationError('Invalid API key', 'test');
        },
        { maxAttempts: 5, baseDelay: 10 }
      )
    ).rejects.toThrow('Invalid API key');

    expect(attempts).toBe(1);
  });

  test('should retry network errors', async () => {
    let attempts = 0;

    await expect(
      retry(
        async () => {
          attempts++;
          throw new NetworkError('Connection failed', 'test');
        },
        { maxAttempts: 3, baseDelay: 10 }
      )
    ).rejects.toThrow('Connection failed');

    expect(attempts).toBe(3);
  });

  test('should retry 500 errors', async () => {
    let attempts = 0;

    await expect(
      retry(
        async () => {
          attempts++;
          throw new APIError('Server error', 500, 'test', true);
        },
        { maxAttempts: 3, baseDelay: 10 }
      )
    ).rejects.toThrow('Server error');

    expect(attempts).toBe(3);
  });

  test('should not retry 404 errors', async () => {
    let attempts = 0;

    await expect(
      retry(
        async () => {
          attempts++;
          throw new APIError('Not found', 404, 'test', false);
        },
        { maxAttempts: 5, baseDelay: 10 }
      )
    ).rejects.toThrow('Not found');

    expect(attempts).toBe(1);
  });

  test('should use rate limit retry-after', async ({ page }) => {
    let attempts = 0;
    const startTime = Date.now();

    try {
      await retry(
        async () => {
          attempts++;
          if (attempts === 1) {
            throw new RateLimitError('Rate limited', 1, 'test'); // 1 second retry-after
          }
          return 'success';
        },
        { maxAttempts: 3, baseDelay: 10 }
      );
    } catch (error) {
      // May fail
    }

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(900); // At least 1 second delay
  });

  test('should call onRetry callback', async () => {
    const retryContexts: any[] = [];

    await expect(
      retry(
        async () => {
          throw new Error('Test failure');
        },
        { maxAttempts: 3, baseDelay: 10 },
        (context) => {
          retryContexts.push(context);
        }
      )
    ).rejects.toThrow();

    expect(retryContexts).toHaveLength(2); // 2 retries
    expect(retryContexts[0].attempt).toBe(1);
    expect(retryContexts[1].attempt).toBe(2);
  });

  test('should apply exponential backoff', async () => {
    const delays: number[] = [];

    try {
      await retry(
        async () => {
          throw new Error('Test failure');
        },
        {
          maxAttempts: 4,
          baseDelay: 100,
          exponentialBase: 2,
          jitterPercent: 0, // No jitter for predictable test
        },
        (context) => {
          delays.push(context.delays[context.delays.length - 1]);
        }
      );
    } catch (error) {
      // Expected
    }

    // Verify exponential backoff: 100ms, 200ms, 400ms
    expect(delays[0]).toBeGreaterThanOrEqual(100);
    expect(delays[1]).toBeGreaterThanOrEqual(200);
    expect(delays[2]).toBeGreaterThanOrEqual(400);
  });

  test('should cap delay at maxDelay', async () => {
    const delays: number[] = [];

    try {
      await retry(
        async () => {
          throw new Error('Test failure');
        },
        {
          maxAttempts: 5,
          baseDelay: 1000,
          maxDelay: 2000,
          jitterPercent: 0,
        },
        (context) => {
          delays.push(context.delays[context.delays.length - 1]);
        }
      );
    } catch (error) {
      // Expected
    }

    // All delays should be <= maxDelay
    delays.forEach((delay) => {
      expect(delay).toBeLessThanOrEqual(2000);
    });
  });
});

describe('RetryStrategy Class', () => {
  test('should execute with configured retry', async () => {
    const strategy = new RetryStrategy({
      maxAttempts: 3,
      baseDelay: 10,
    });

    let attempts = 0;

    const result = await strategy.execute(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Temporary failure');
      }
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should wrap functions', async () => {
    const strategy = new RetryStrategy({
      maxAttempts: 3,
      baseDelay: 10,
    });

    let attempts = 0;

    const wrappedFn = strategy.wrap(async (value: string) => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Temporary failure');
      }
      return value;
    });

    const result = await wrappedFn('test');

    expect(result).toBe('test');
    expect(attempts).toBe(2);
  });

  test('should update configuration', () => {
    const strategy = new RetryStrategy({
      maxAttempts: 3,
      baseDelay: 1000,
    });

    const config1 = strategy.getConfig();
    expect(config1.maxAttempts).toBe(3);

    strategy.updateConfig({ maxAttempts: 5 });

    const config2 = strategy.getConfig();
    expect(config2.maxAttempts).toBe(5);
  });
});
