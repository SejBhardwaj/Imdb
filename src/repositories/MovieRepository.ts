/**
 * Movie Repository
 * 
 * Single source of truth for all movie data operations
 * Coordinates providers, cache, resilience, and telemetry
 */

import type {
  Movie,
  MovieDetails,
  PaginatedResponse,
  SearchQuery,
  DiscoverOptions,
  Credits,
  VideoCollection,
  ImageCollection,
  Review,
  Genre,
} from '@/types/movie';
import { providerRegistry } from '@/providers/registry';
import { memoryCache } from '@/lib/cache/memoryCache';
import { generateTraceId } from '@/lib/telemetry/tracing';
import { recordCacheHit, recordCacheMiss } from '@/lib/telemetry/metrics';

class MovieRepository {
  /**
   * Get movie by ID with caching
   */
  async getMovie(id: number, skipCache: boolean = false): Promise<Movie> {
    const traceId = generateTraceId();
    const cacheKey = `movie:${id}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<Movie>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getMovie', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getMovie', traceId);
    }

    // Fetch from provider with fallback
    const movie = await providerRegistry.executeWithFallback(
      async (provider) => provider.getMovie(id, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, movie, movie.provider || 'unknown', 300000, [
      `movie:${id}`,
      'movies',
    ]);

    return movie;
  }

  /**
   * Get movie details with caching
   */
  async getMovieDetails(id: number, skipCache: boolean = false): Promise<MovieDetails> {
    const traceId = generateTraceId();
    const cacheKey = `movie_details:${id}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<MovieDetails>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getMovieDetails', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getMovieDetails', traceId);
    }

    // Fetch from provider with fallback
    const details = await providerRegistry.executeWithFallback(
      async (provider) => provider.getMovieDetails(id, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, details, details.provider || 'unknown', 600000, [
      `movie:${id}`,
      `movie_details:${id}`,
      'movies',
    ]);

    return details;
  }

  /**
   * Get popular movies with caching
   */
  async getPopularMovies(page: number = 1, skipCache: boolean = false): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `popular:${page}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getPopularMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getPopularMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getPopularMovies(page, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 300000, [
      'popular',
      `popular:page:${page}`,
      'movies',
    ]);

    return result;
  }

  /**
   * Get trending movies with caching
   */
  async getTrendingMovies(
    timeWindow: 'day' | 'week' = 'week',
    page: number = 1,
    skipCache: boolean = false
  ): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `trending:${timeWindow}:${page}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getTrendingMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getTrendingMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getTrendingMovies(timeWindow, page, traceId),
      traceId
    );

    // Cache result (shorter cache time for trending)
    memoryCache.set(cacheKey, result, 'repository', 180000, [
      'trending',
      `trending:${timeWindow}`,
      `trending:page:${page}`,
      'movies',
    ]);

    return result;
  }

  /**
   * Get top rated movies with caching
   */
  async getTopRatedMovies(page: number = 1, skipCache: boolean = false): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `top_rated:${page}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getTopRatedMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getTopRatedMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getTopRatedMovies(page, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 600000, [
      'top_rated',
      `top_rated:page:${page}`,
      'movies',
    ]);

    return result;
  }

  /**
   * Get upcoming movies with caching
   */
  async getUpcomingMovies(page: number = 1, skipCache: boolean = false): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `upcoming:${page}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getUpcomingMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getUpcomingMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getUpcomingMovies(page, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 300000, [
      'upcoming',
      `upcoming:page:${page}`,
      'movies',
    ]);

    return result;
  }

  /**
   * Get now playing movies with caching
   */
  async getNowPlayingMovies(page: number = 1, skipCache: boolean = false): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `now_playing:${page}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getNowPlayingMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getNowPlayingMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getNowPlayingMovies(page, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 300000, [
      'now_playing',
      `now_playing:page:${page}`,
      'movies',
    ]);

    return result;
  }

  /**
   * Search movies with caching
   */
  async searchMovies(query: SearchQuery, skipCache: boolean = false): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `search:${query.query}:${query.page || 1}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'searchMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'searchMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.searchMovies(query, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 300000, [
      'search',
      `search:${query.query}`,
      'movies',
    ]);

    return result;
  }

  /**
   * Discover movies with caching
   */
  async discoverMovies(options: DiscoverOptions, skipCache: boolean = false): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `discover:${JSON.stringify(options)}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'discoverMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'discoverMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.discoverMovies(options, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 300000, [
      'discover',
      'movies',
    ]);

    return result;
  }

  /**
   * Get movie credits with caching
   */
  async getMovieCredits(id: number, skipCache: boolean = false): Promise<Credits> {
    const traceId = generateTraceId();
    const cacheKey = `credits:${id}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<Credits>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getMovieCredits', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getMovieCredits', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getMovieCredits(id, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 600000, [
      `movie:${id}`,
      `credits:${id}`,
    ]);

    return result;
  }

  /**
   * Get movie videos with caching
   */
  async getMovieVideos(id: number, skipCache: boolean = false): Promise<VideoCollection> {
    const traceId = generateTraceId();
    const cacheKey = `videos:${id}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<VideoCollection>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getMovieVideos', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getMovieVideos', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getMovieVideos(id, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 600000, [
      `movie:${id}`,
      `videos:${id}`,
    ]);

    return result;
  }

  /**
   * Get similar movies with caching
   */
  async getSimilarMovies(id: number, page: number = 1, skipCache: boolean = false): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `similar:${id}:${page}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getSimilarMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getSimilarMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getSimilarMovies(id, page, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 600000, [
      `movie:${id}`,
      `similar:${id}`,
      'movies',
    ]);

    return result;
  }

  /**
   * Get recommended movies with caching
   */
  async getRecommendedMovies(id: number, page: number = 1, skipCache: boolean = false): Promise<PaginatedResponse<Movie>> {
    const traceId = generateTraceId();
    const cacheKey = `recommendations:${id}:${page}`;

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<PaginatedResponse<Movie>>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getRecommendedMovies', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getRecommendedMovies', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getRecommendedMovies(id, page, traceId),
      traceId
    );

    // Cache result
    memoryCache.set(cacheKey, result, 'repository', 600000, [
      `movie:${id}`,
      `recommendations:${id}`,
      'movies',
    ]);

    return result;
  }

  /**
   * Get genres with caching
   */
  async getGenres(skipCache: boolean = false): Promise<Genre[]> {
    const traceId = generateTraceId();
    const cacheKey = 'genres';

    // Check cache
    if (!skipCache) {
      const cached = memoryCache.get<Genre[]>(cacheKey);
      if (cached) {
        recordCacheHit('repository', 'getGenres', traceId);
        return cached;
      }
      recordCacheMiss('repository', 'getGenres', traceId);
    }

    // Fetch from provider with fallback
    const result = await providerRegistry.executeWithFallback(
      async (provider) => provider.getGenres(traceId),
      traceId
    );

    // Cache result (long cache time for genres)
    memoryCache.set(cacheKey, result, 'repository', 86400000, ['genres']); // 24 hours

    return result;
  }

  /**
   * Invalidate cache for movie
   */
  invalidateMovie(id: number): void {
    memoryCache.invalidateByTags([`movie:${id}`]);
  }

  /**
   * Invalidate cache for list
   */
  invalidateList(listType: string): void {
    memoryCache.invalidateByTags([listType]);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    memoryCache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return memoryCache.getStats();
  }
}

/**
 * Global repository instance
 */
export const movieRepository = new MovieRepository();
