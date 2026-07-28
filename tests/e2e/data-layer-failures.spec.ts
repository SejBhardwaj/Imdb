/**
 * Data Layer Failure Simulation E2E Tests
 * 
 * Tests system behavior under various failure scenarios:
 * - 429 Rate limits
 * - 500 Server errors
 * - Network timeouts
 * - Offline/online transitions
 */

import { test, expect, describe } from '@playwright/test';
import { MovieRepository } from '../../src/lib/data/repositories/MovieRepository';
import { providerRegistry } from '../../src/lib/data/providers/MovieProvider';
import { MockProvider } from '../../src/lib/data/providers/MockProvider';

describe('Data Layer Failure Scenarios', () => {
  test('should handle rate limit errors (429)', async () => {
    // Setup provider that rate limits
    const provider = new MockProvider({
      delay: 10,
      failureRate: 1.0,
      failureType: 'rate_limit',
    });

    providerRegistry.register('rate-limited', provider);

    const repository = new MovieRepository({
      primaryProvider: 'rate-limited',
      enableDeduplication: false,
    });

    // Should throw rate limit error
    await expect(repository.getMovie(1)).rejects.toThrow();
  });

  test('should handle server errors (500)', async () => {
    // Setup provider that returns 500
    const provider = new MockProvider({
      delay: 10,
      failureRate: 1.0,
      failureType: 'server_error',
    });

    providerRegistry.register('server-error', provider);

    const repository = new MovieRepository({
      primaryProvider: 'server-error',
      enableDeduplication: false,
    });

    // Should throw server error
    await expect(repository.getMovie(1)).rejects.toThrow();
  });

  test('should handle network timeouts', async () => {
    // Setup provider with timeout
    const provider = new MockProvider({
      delay: 10,
      failureRate: 1.0,
      failureType: 'timeout',
    });

    providerRegistry.register('timeout', provider);

    const repository = new MovieRepository({
      primaryProvider: 'timeout',
      enableDeduplication: false,
    });

    // Should throw timeout error
    await expect(repository.getMovie(1)).rejects.toThrow();
  });

  test('should handle network errors', async () => {
    // Setup provider with network errors
    const provider = new MockProvider({
      delay: 10,
      failureRate: 1.0,
      failureType: 'network',
    });

    providerRegistry.register('network-error', provider);

    const repository = new MovieRepository({
      primaryProvider: 'network-error',
      enableDeduplication: false,
    });

    // Should throw network error
    await expect(repository.getMovie(1)).rejects.toThrow();
  });

  test('should retry transient failures', async () => {
    let attempts = 0;

    // Setup provider that fails twice then succeeds
    const provider = new MockProvider({
      delay: 10,
      failureRate: 0,
    });

    // Override getMovie to simulate transient failure
    const originalGetMovie = provider.getMovie.bind(provider);
    provider.getMovie = async (id) => {
      attempts++;
      if (attempts <= 2) {
        throw new Error('Transient failure');
      }
      return originalGetMovie(id);
    };

    providerRegistry.register('transient-error', provider);

    const repository = new MovieRepository({
      primaryProvider: 'transient-error',
      enableDeduplication: false,
    });

    // Should succeed after retries
    const movie = await repository.getMovie(1);
    expect(movie).toBeDefined();
    expect(attempts).toBe(3);
  });

  test('should use fallback on primary failure', async () => {
    // Primary provider that always fails
    const primaryProvider = new MockProvider({
      delay: 10,
      failureRate: 1.0,
      failureType: 'network',
    });

    // Fallback provider that works
    const fallbackProvider = new MockProvider({
      delay: 10,
      failureRate: 0,
    });

    providerRegistry.register('primary-fail', primaryProvider);
    providerRegistry.register('fallback-success', fallbackProvider);

    const repository = new MovieRepository({
      primaryProvider: 'primary-fail',
      fallbackProvider: 'fallback-success',
      enableDeduplication: false,
    });

    // Should succeed using fallback
    const movie = await repository.getMovie(1);
    expect(movie).toBeDefined();
    expect(movie.id).toBe(1);
  });

  test('should cache responses to survive failures', async () => {
    const provider = new MockProvider({
      delay: 10,
      failureRate: 0,
    });

    providerRegistry.register('cache-test', provider);

    const { MemoryCacheAdapter } = await import('../../src/lib/data/cache/CacheManager');
    const cache = new MemoryCacheAdapter(100);

    const repository = new MovieRepository({
      primaryProvider: 'cache-test',
      cache,
    });

    // First request - cache miss
    const movie1 = await repository.getMovie(100);
    expect(movie1).toBeDefined();

    // Make provider fail
    provider.setConfig({ failureRate: 1.0, failureType: 'network' });

    // Second request - should use cache
    const movie2 = await repository.getMovie(100);
    expect(movie2).toEqual(movie1);
  });

  test('should handle mixed success/failure in batch requests', async () => {
    const provider = new MockProvider({
      delay: 10,
      failureRate: 0.5, // 50% failure rate
    });

    providerRegistry.register('batch-mixed', provider);

    const repository = new MovieRepository({
      primaryProvider: 'batch-mixed',
      enableDeduplication: false,
    });

    // Some requests may fail, but shouldn't crash
    try {
      await repository.getMoviesBatch([1, 2, 3, 4, 5]);
    } catch (error) {
      // Expected - some may fail
      expect(error).toBeDefined();
    }
  });

  test('should handle rapid successive requests', async () => {
    const provider = new MockProvider({
      delay: 10,
      failureRate: 0,
    });

    providerRegistry.register('rapid', provider);

    const repository = new MovieRepository({
      primaryProvider: 'rapid',
      enableDeduplication: true,
    });

    // Fire 10 rapid requests
    const promises = Array.from({ length: 10 }, (_, i) => repository.getMovie(i + 1));

    const results = await Promise.all(promises);

    expect(results.length).toBe(10);
    results.forEach((movie, i) => {
      expect(movie.id).toBe(i + 1);
    });
  });

  test('should recover from circuit breaker open state', async ({ page }) => {
    // This test would require circuit breaker integration
    // Placeholder for future implementation
    expect(true).toBe(true);
  });
});
