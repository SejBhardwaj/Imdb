/**
 * Movie Repository Integration Tests
 * 
 * Tests for MovieRepository with real provider integration.
 */

import { test, expect, describe, beforeAll } from '@playwright/test';
import { MovieRepository } from '../../src/lib/data/repositories/MovieRepository';
import { providerRegistry } from '../../src/lib/data/providers/MovieProvider';
import { MockProvider } from '../../src/lib/data/providers/MockProvider';
import { MemoryCacheAdapter } from '../../src/lib/data/cache/CacheManager';

describe('MovieRepository Integration', () => {
  let repository: MovieRepository;
  let cache: MemoryCacheAdapter;

  beforeAll(() => {
    // Register mock provider
    const mockProvider = new MockProvider({
      delay: 10,
      failureRate: 0,
      verbose: false,
    });

    providerRegistry.register('mock', mockProvider);

    // Create cache
    cache = new MemoryCacheAdapter(100, 'test');

    // Create repository
    repository = new MovieRepository({
      primaryProvider: 'mock',
      cache,
      enableDeduplication: true,
    });
  });

  test('should fetch movie by ID', async () => {
    const movie = await repository.getMovie(1);

    expect(movie).toBeDefined();
    expect(movie.id).toBe(1);
    expect(movie.title).toContain('Mock Movie');
  });

  test('should cache movie data', async () => {
    // First fetch (cache miss)
    const movie1 = await repository.getMovie(2);
    expect(movie1).toBeDefined();

    // Second fetch (cache hit)
    const movie2 = await repository.getMovie(2);
    expect(movie2).toEqual(movie1);

    // Verify cache was used
    const cacheStats = await cache.getStats();
    expect(cacheStats.hits).toBeGreaterThan(0);
  });

  test('should fetch popular movies', async () => {
    const response = await repository.getPopularMovies(1);

    expect(response.results).toBeDefined();
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.page).toBe(1);
    expect(response.totalPages).toBeGreaterThan(0);
  });

  test('should search movies', async () => {
    const response = await repository.searchMovies('test', 1);

    expect(response.results).toBeDefined();
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].title).toContain('test');
  });

  test('should get movie recommendations', async () => {
    const response = await repository.getRecommendations(1, 1);

    expect(response.results).toBeDefined();
    expect(response.results.length).toBeGreaterThan(0);
  });

  test('should get movie credits', async () => {
    const credits = await repository.getMovieCredits(1);

    expect(credits.cast).toBeDefined();
    expect(credits.crew).toBeDefined();
    expect(credits.cast.length).toBeGreaterThan(0);
  });

  test('should get movie videos', async () => {
    const videos = await repository.getMovieVideos(1);

    expect(videos).toBeDefined();
    expect(videos.length).toBeGreaterThan(0);
    expect(videos[0]).toHaveProperty('key');
  });

  test('should deduplicate concurrent requests', async () => {
    // Make 5 concurrent requests for same movie
    const promises = Array.from({ length: 5 }, () => repository.getMovie(3));

    const results = await Promise.all(promises);

    // All should return same data
    results.forEach((result) => {
      expect(result).toEqual(results[0]);
    });

    // Verify only one request was made (check pending count was reduced)
    const stats = repository.getStats();
    expect(stats.pendingRequests).toBe(0);
  });

  test('should batch fetch movies', async () => {
    const ids = [10, 11, 12, 13, 14];
    const movies = await repository.getMoviesBatch(ids);

    expect(movies.length).toBe(5);
    expect(movies[0].id).toBe(10);
    expect(movies[4].id).toBe(14);
  });

  test('should invalidate cache by tags', async () => {
    // Fetch and cache a movie
    await repository.getMovie(20);

    // Verify it's cached
    const cached1 = await cache.get('movie:20');
    expect(cached1).toBeDefined();

    // Invalidate by tag
    await repository.invalidateCache(['movie:20']);

    // Verify cache cleared
    const cached2 = await cache.get('movie:20');
    expect(cached2).toBeNull();
  });

  test('should handle provider fallback', async () => {
    // Register a failing provider
    const failingProvider = new MockProvider({
      delay: 10,
      failureRate: 1.0, // Always fail
      failureType: 'network',
    });

    providerRegistry.register('failing', failingProvider);

    // Register working fallback
    const fallbackProvider = new MockProvider({
      delay: 10,
      failureRate: 0,
    });

    providerRegistry.register('fallback', fallbackProvider);

    // Create repository with fallback
    const repoWithFallback = new MovieRepository({
      primaryProvider: 'failing',
      fallbackProvider: 'fallback',
      cache,
    });

    // Should succeed using fallback
    const movie = await repoWithFallback.getMovie(100);
    expect(movie).toBeDefined();
    expect(movie.id).toBe(100);
  });

  test('should get repository statistics', () => {
    const stats = repository.getStats();

    expect(stats).toHaveProperty('primaryProvider');
    expect(stats).toHaveProperty('pendingRequests');
    expect(stats).toHaveProperty('cacheEnabled');

    expect(stats.primaryProvider).toBe('mock');
    expect(stats.cacheEnabled).toBe(true);
  });

  test('should prefetch movie', async () => {
    // Prefetch movie
    await repository.prefetchMovie(50);

    // Verify it's cached
    const cached = await cache.get('movie:50');
    expect(cached).toBeDefined();
  });

  test('should get image URL', () => {
    const url = repository.getImageUrl('/path/to/image.jpg', 'medium');

    expect(url).toContain('/path/to/image.jpg');
    expect(url).toContain('medium');
  });
});
