/**
 * Circuit Breaker Unit Tests
 * 
 * Tests for circuit breaker pattern implementation.
 */

import { test, expect, describe, beforeEach } from '@playwright/test';
import { CircuitBreaker, CircuitState, CircuitBreakerOpenError } from '../../src/lib/data/resilience/CircuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  let stateChanges: Array<{ old: CircuitState; new: CircuitState }> = [];

  beforeEach(() => {
    stateChanges = [];
    breaker = new CircuitBreaker(
      {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        monitoringPeriod: 5000,
      },
      (oldState, newState) => {
        stateChanges.push({ old: oldState, new: newState });
      }
    );
  });

  test('should start in CLOSED state', () => {
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  test('should open after failure threshold', async () => {
    // Execute failing requests
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
    expect(stateChanges).toHaveLength(1);
    expect(stateChanges[0]).toEqual({ old: CircuitState.CLOSED, new: CircuitState.OPEN });
  });

  test('should reject requests when OPEN', async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }

    // Next request should be rejected immediately
    await expect(
      breaker.execute(async () => 'success')
    ).rejects.toThrow(CircuitBreakerOpenError);
  });

  test('should transition to HALF_OPEN after timeout', async ({ page }) => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Wait for timeout
    await page.waitForTimeout(1100);

    // Check state (should transition to HALF_OPEN on next request)
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
  });

  test('should close after success threshold in HALF_OPEN', async ({ page }) => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }

    // Wait for timeout
    await page.waitForTimeout(1100);

    // Execute successful requests
    await breaker.execute(async () => 'success1');
    await breaker.execute(async () => 'success2');

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  test('should reopen if failure in HALF_OPEN', async ({ page }) => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }

    // Wait for timeout
    await page.waitForTimeout(1100);

    // Execute one successful request
    await breaker.execute(async () => 'success');
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    // Execute failing request
    try {
      await breaker.execute(async () => {
        throw new Error('Test failure');
      });
    } catch (error) {
      // Expected
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  test('should track statistics', async () => {
    // Execute some requests
    await breaker.execute(async () => 'success');

    try {
      await breaker.execute(async () => {
        throw new Error('Test failure');
      });
    } catch (error) {
      // Expected
    }

    const stats = breaker.getStats();

    expect(stats.successes).toBe(1);
    expect(stats.failures).toBe(1);
    expect(stats.consecutiveSuccesses).toBe(0);
    expect(stats.consecutiveFailures).toBe(1);
  });

  test('should allow forcing state', () => {
    breaker.forceState(CircuitState.OPEN);
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    breaker.forceState(CircuitState.CLOSED);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  test('should reset statistics when closed', () => {
    // Generate some failures
    for (let i = 0; i < 2; i++) {
      try {
        breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }

    const statsBefore = breaker.getStats();
    expect(statsBefore.failures).toBeGreaterThan(0);

    // Force close (which resets)
    breaker.forceState(CircuitState.CLOSED);

    const statsAfter = breaker.getStats();
    expect(statsAfter.failures).toBe(0);
  });
});
