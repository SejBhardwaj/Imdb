/**
 * Movie Repository
 * 
 * Business logic layer that aggregates data from multiple providers.
 * 
 * Features:
 * - Provider fallback (TMDb → OMDb)
 * - Unified caching strategy
 * - Request deduplication
 * - Batch operations
 * - Incremental loading
 * - Cache invalidation
 * - Business rules enforcement
 * 
 * Architecture:
 * UI → Repository → Cache → Provider → API
 */

import type {
  Movie,
  MovieDetails,
  MovieCredits,
  MovieVideo,
  MovieImage,
  PaginatedResponse,
  CursorPaginatedResponse,
  MovieFilters,
  APIError,
  CacheMetadata,
  TelemetryEvent,
} from '../types/movie';
import type { MovieProvider } from '../providers/MovieProvider';
import { providerRegistry } from '../providers/MovieProvider';
import type { CacheAdapter } from '../cache/CacheManager';

/**
 * Repository configuration
 */
export interface RepositoryConfig {
  /** Primary provider name */
  primaryProvider: string;
  /** Fallback provider name */
  fallbackProvider?: string;
  /** Cache adapter */
  cache?: CacheAdapter;
  /** Enable request deduplication */
  enableDeduplication?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: {
    movie: number;
    list: number;
    search: number;
    credits: number;
    videos: number;
    images: number;
  };
  /** Telemetry callback */
  onTelemetry?: (event: TelemetryEvent) => void;
}

/**
 * In-flight request tracker for deduplication
 */
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  /**
   * Execute or deduplicate request
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request already in flight
    const existing = this.pending.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    // Start new request
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pending.clear();
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pending.size;
  }
}

/**
 * Movie Repository Implementation
 */
export class MovieRepository {
  private primaryProvider: MovieProvider;
  private fallbackProvider?: MovieProvider;
  private cache?: CacheAdapter;
  private deduplicator: RequestDeduplicator;
  private config: Required<Omit<RepositoryConfig, 'fallbackProvider' | 'cache'>>;

  constructor(config: RepositoryConfig) {
    // Get providers
    this.primaryProvider = providerRegistry.get(config.primaryProvider)!;
    if (!this.primaryProvider) {
      throw new Error(`Primary provider "${config.primaryProvider}" not found`);
    }

    if (config.fallbackProvider) {
      this.fallbackProvider = providerRegistry.get(config.fallbackProvider);
      if (!this.fallbackProvider) {
        console.warn(`Fallback provider "${config.fallbackProvider}" not found`);
      }
    }

    this.cache = config.cache;
    this.deduplicator = new RequestDeduplicator();

    // Default configuration
    this.config = {
      primaryProvider: config.primaryProvider,
      enableDeduplication: config.enableDeduplication ?? true,
      cacheTTL: config.cacheTTL ?? {
        movie: 3600, // 1 hour
        list: 300, // 5 minutes
        search: 600, // 10 minutes
        credits: 7200, // 2 hours
        videos: 7200, // 2 hours
        images: 7200, // 2 hours
      },
      onTelemetry: config.onTelemetry ?? (() => {}),
    };
  }

  /**
   * Execute with telemetry
   */
  private emitTelemetry(event: Omit<TelemetryEvent, 'timestamp'>): void {
    this.config.onTelemetry({
      ...event,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute with cache
   */
  private async withCache<T>(
    cacheKey: string,
    ttl: number,
    tags: string[],
    fn: () => Promise<T>
  ): Promise<T> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) {
        this.emitTelemetry({
          type: 'cache_hit',
          provider: this.primaryProvider.name,
          metadata: { cacheKey },
        });
        return cached;
      }

      this.emitTelemetry({
        type: 'cache_miss',
        provider: this.primaryProvider.name,
        metadata: { cacheKey },
      });
    }

    // Execute and cache
    const startTime = Date.now();
    try {
      const result = await fn();

      if (this.cache) {
        await this.cache.set(cacheKey, result, ttl, tags);
      }

      this.emitTelemetry({
        type: 'request',
        provider: this.primaryProvider.name,
        duration: Date.now() - startTime,
        statusCode: 200,
        metadata: { cacheKey },
      });

      return result;
    } catch (error: any) {
      this.emitTelemetry({
        type: 'error',
        provider: this.primaryProvider.name,
        duration: Date.now() - startTime,
        statusCode: error.statusCode,
        error: error.message,
        metadata: { cacheKey },
      });
      throw error;
    }
  }

  /**
   * Execute with provider fallback
   */
  private async withFallback<T>(
    operation: string,
    primaryFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryFn();
    } catch (error: any) {
      // If not retryable or no fallback, throw immediately
      if (!error.retryable || !this.fallbackProvider || !fallbackFn) {
        throw error;
      }

      console.warn(
        `[MovieRepository] Primary provider failed for ${operation}, trying fallback`,
        error.message
      );

      // Try fallback provider
      try {
        const result = await fallbackFn();
        this.emitTelemetry({
          type: 'request',
          provider: this.fallbackProvider.name,
          metadata: { operation, fallback: true },
        });
        return result;
      } catch (fallbackError) {
        console.error(
          `[MovieRepository] Fallback provider also failed for ${operation}`,
          fallbackError
        );
        throw error; // Throw original error
      }
    }
  }

  /**
   * Execute with deduplication
   */
  private async withDeduplication<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.config.enableDeduplication) {
      return this.deduplicator.execute(key, fn);
    }
    return fn();
  }

  // ===============================================
  // Public API Methods
  // ===============================================

  /**
   * Get a single movie by ID
   */
  async getMovie(id: number | string): Promise<MovieDetails> {
    const cacheKey = `movie:${id}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.movie, [`movie:${id}`], () =>
        this.withFallback(
          'getMovie',
          () => this.primaryProvider.getMovie(id),
          this.fallbackProvider ? () => this.fallbackProvider!.getMovie(id) : undefined
        )
      )
    );
  }

  /**
   * Get popular movies
   */
  async getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    const cacheKey = `popular:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.list, ['popular'], () =>
        this.primaryProvider.getPopularMovies(page)
      )
    );
  }

  /**
   * Get popular movies with cursor pagination
   */
  async getPopularMoviesCursor(cursor?: string): Promise<CursorPaginatedResponse<Movie>> {
    const cacheKey = `popular:cursor:${cursor || 'first'}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.list, ['popular'], () =>
        this.primaryProvider.getPopularMoviesCursor(cursor)
      )
    );
  }

  /**
   * Get top-rated movies
   */
  async getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    const cacheKey = `top-rated:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.list, ['top-rated'], () =>
        this.primaryProvider.getTopRatedMovies(page)
      )
    );
  }

  /**
   * Get now playing movies
   */
  async getNowPlayingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    const cacheKey = `now-playing:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.list, ['now-playing'], () =>
        this.primaryProvider.getNowPlayingMovies(page)
      )
    );
  }

  /**
   * Get upcoming movies
   */
  async getUpcomingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    const cacheKey = `upcoming:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.list, ['upcoming'], () =>
        this.primaryProvider.getUpcomingMovies(page)
      )
    );
  }

  /**
   * Search movies
   */
  async searchMovies(query: string, page: number = 1): Promise<PaginatedResponse<Movie>> {
    const cacheKey = `search:${query}:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.search, [`search:${query}`], () =>
        this.withFallback(
          'searchMovies',
          () => this.primaryProvider.searchMovies(query, page),
          this.fallbackProvider ? () => this.fallbackProvider!.searchMovies(query, page) : undefined
        )
      )
    );
  }

  /**
   * Search movies with filters
   */
  async searchMoviesWithFilters(
    query: string,
    filters: MovieFilters,
    page: number = 1
  ): Promise<PaginatedResponse<Movie>> {
    const filterKey = JSON.stringify(filters);
    const cacheKey = `search:${query}:${filterKey}:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.search, [`search:${query}`], () =>
        this.primaryProvider.searchMoviesWithFilters(query, filters, page)
      )
    );
  }

  /**
   * Get movie recommendations
   */
  async getRecommendations(movieId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    const cacheKey = `recommendations:${movieId}:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.list, [`recommendations:${movieId}`], () =>
        this.primaryProvider.getRecommendations(movieId, page)
      )
    );
  }

  /**
   * Get similar movies
   */
  async getSimilarMovies(movieId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    const cacheKey = `similar:${movieId}:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.list, [`similar:${movieId}`], () =>
        this.primaryProvider.getSimilarMovies(movieId, page)
      )
    );
  }

  /**
   * Get movie credits
   */
  async getMovieCredits(movieId: number): Promise<MovieCredits> {
    const cacheKey = `credits:${movieId}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.credits, [`movie:${movieId}`, 'credits'], () =>
        this.primaryProvider.getMovieCredits(movieId)
      )
    );
  }

  /**
   * Get movie videos
   */
  async getMovieVideos(movieId: number): Promise<MovieVideo[]> {
    const cacheKey = `videos:${movieId}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.videos, [`movie:${movieId}`, 'videos'], () =>
        this.primaryProvider.getMovieVideos(movieId)
      )
    );
  }

  /**
   * Get movie images
   */
  async getMovieImages(movieId: number): Promise<{
    backdrops: MovieImage[];
    posters: MovieImage[];
    logos: MovieImage[];
  }> {
    const cacheKey = `images:${movieId}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.images, [`movie:${movieId}`, 'images'], () =>
        this.primaryProvider.getMovieImages(movieId)
      )
    );
  }

  /**
   * Discover movies by genre
   */
  async discoverByGenre(genreId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    const cacheKey = `discover:genre:${genreId}:${page}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.list, [`genre:${genreId}`], () =>
        this.primaryProvider.discoverByGenre(genreId, page)
      )
    );
  }

  /**
   * Get movie by external ID (IMDb ID)
   */
  async getMovieByExternalId(imdbId: string): Promise<MovieDetails> {
    const cacheKey = `external:${imdbId}`;

    return this.withDeduplication(cacheKey, () =>
      this.withCache(cacheKey, this.config.cacheTTL.movie, [`external:${imdbId}`], () =>
        this.withFallback(
          'getMovieByExternalId',
          () => this.primaryProvider.getMovieByExternalId!(imdbId),
          this.fallbackProvider?.getMovieByExternalId
            ? () => this.fallbackProvider!.getMovieByExternalId!(imdbId)
            : undefined
        )
      )
    );
  }

  /**
   * Batch get movies (optimized)
   */
  async getMoviesBatch(ids: number[]): Promise<MovieDetails[]> {
    // Check cache for each movie first
    const results: (MovieDetails | null)[] = [];
    const missingIds: number[] = [];
    const missingIndexes: number[] = [];

    if (this.cache) {
      for (let i = 0; i < ids.length; i++) {
        const cached = await this.cache.get<MovieDetails>(`movie:${ids[i]}`);
        if (cached) {
          results[i] = cached;
          this.emitTelemetry({
            type: 'cache_hit',
            provider: this.primaryProvider.name,
            metadata: { movieId: ids[i] },
          });
        } else {
          results[i] = null;
          missingIds.push(ids[i]);
          missingIndexes.push(i);
        }
      }
    } else {
      missingIds.push(...ids);
      missingIndexes.push(...ids.map((_, i) => i));
    }

    // Fetch missing movies
    if (missingIds.length > 0) {
      const fetchedMovies = this.primaryProvider.getMoviesBatch
        ? await this.primaryProvider.getMoviesBatch(missingIds)
        : await Promise.all(missingIds.map((id) => this.primaryProvider.getMovie(id)));

      // Update results and cache
      for (let i = 0; i < missingIds.length; i++) {
        const movie = fetchedMovies[i];
        const resultIndex = missingIndexes[i];
        results[resultIndex] = movie;

        if (this.cache) {
          await this.cache.set(`movie:${missingIds[i]}`, movie, this.config.cacheTTL.movie, [
            `movie:${missingIds[i]}`,
          ]);
        }
      }
    }

    return results as MovieDetails[];
  }

  /**
   * Prefetch movie (for hover prefetching)
   */
  async prefetchMovie(id: number): Promise<void> {
    const cacheKey = `movie:${id}`;

    // Check if already cached
    if (this.cache) {
      const cached = await this.cache.get<MovieDetails>(cacheKey);
      if (cached) {
        return; // Already cached
      }
    }

    // Prefetch and cache
    const movie = await this.primaryProvider.getMovie(id);
    if (this.cache) {
      await this.cache.set(cacheKey, movie, this.config.cacheTTL.movie, [`movie:${id}`]);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateCache(tags: string[]): Promise<void> {
    if (this.cache?.invalidateByTags) {
      await this.cache.invalidateByTags(tags);
    }
  }

  /**
   * Invalidate movie cache
   */
  async invalidateMovie(id: number | string): Promise<void> {
    await this.invalidateCache([`movie:${id}`]);
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    if (this.cache?.clear) {
      await this.cache.clear();
    }
  }

  /**
   * Get image URL
   */
  getImageUrl(path: string, size?: 'small' | 'medium' | 'large' | 'original'): string {
    return this.primaryProvider.getImageUrl(path, size);
  }

  /**
   * Get repository statistics
   */
  getStats() {
    return {
      primaryProvider: this.primaryProvider.name,
      fallbackProvider: this.fallbackProvider?.name,
      pendingRequests: this.deduplicator.getPendingCount(),
      cacheEnabled: !!this.cache,
    };
  }
}
