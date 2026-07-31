/**
 * TMDb Provider Implementation
 * 
 * Full implementation of MovieProvider interface for TMDb API
 */

import { MovieProvider } from '../base/MovieProvider';
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
  ProviderName,
} from '@/types/movie';
import { APIResponseError, NetworkError } from '@/types/movie';
import { TMDB_CONFIG, getTMDbApiKey } from './config';
import {
  mapTMDbMovie,
  mapTMDbMovieDetails,
  mapTMDbCredits,
  mapTMDbVideos,
  mapTMDbImages,
  mapTMDbPaginatedResponse,
  mapTMDbGenre,
} from './mappers';
import { withTimeout, fetchWithTimeout } from '@/lib/resilience/timeout';
import { retry, isRetryable } from '@/lib/resilience/retry';
import { circuitBreakerRegistry } from '@/lib/resilience/circuitBreaker';
import { tokenBucketRegistry, RequestPriority } from '@/lib/resilience/tokenBucket';
import { withTrace } from '@/lib/telemetry/tracing';
import { recordRequest, recordError } from '@/lib/telemetry/metrics';

export class TMDbProvider extends MovieProvider {
  readonly name: ProviderName = 'tmdb';
  readonly priority: number = 1; // Highest priority

  private apiKey: string | null;
  private baseUrl: string = TMDB_CONFIG.BASE_URL;
  private timeout: number = TMDB_CONFIG.TIMEOUT;
  private circuitBreaker = circuitBreakerRegistry.get('tmdb');
  private rateLimiter = tokenBucketRegistry.get('tmdb', {
    capacity: 40,
    refillRate: 10,
    refillInterval: 1000,
  });
  private genreCache: Map<number, string> = new Map();
  private isConfigured: boolean;

  constructor() {
    super();
    this.apiKey = getTMDbApiKey();
    this.isConfigured = this.apiKey !== null;
    
    if (!this.isConfigured) {
      console.warn('TMDbProvider: Running in demo mode without API key. Movie data will use fallback data.');
    }
  }

  /**
   * Check if provider is properly configured
   */
  private ensureConfigured(): void {
    if (!this.isConfigured || !this.apiKey) {
      throw new Error('TMDb API key not configured. This feature requires NEXT_PUBLIC_TMDB_API_KEY in .env.local');
    }
  }

  /**
   * Make HTTP request to TMDb API with full resilience
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {},
    priority: RequestPriority = RequestPriority.MEDIUM,
    traceId?: string
  ): Promise<T> {
    this.ensureConfigured();
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey!);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const startTime = Date.now();
    let success = false;

    try {
      // Execute through rate limiter
      const response = await this.rateLimiter.execute(
        async () => {
          // Execute through circuit breaker
          return this.circuitBreaker.execute(async () => {
            // Execute with retry
            return retry(
              async () => {
                const res = await fetchWithTimeout(url.toString(), {}, this.timeout);

                if (!res.ok) {
                  const retryable = [429, 500, 502, 503, 504].includes(res.status);
                  throw new APIResponseError(
                    'tmdb',
                    res.status,
                    `TMDb API error: ${res.statusText}`,
                    retryable,
                    { endpoint },
                    traceId
                  );
                }

                return res.json();
              },
              {
                maxAttempts: TMDB_CONFIG.RETRY_ATTEMPTS,
                initialDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
                jitter: true,
              }
            );
          }, traceId);
        },
        priority,
        undefined,
        traceId
      );

      success = true;
      return response as T;
    } catch (error) {
      recordError('tmdb', endpoint, error as Error, traceId);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      recordRequest('tmdb', endpoint, duration, success, traceId);
    }
  }

  /**
   * Get movie by ID
   */
  async getMovie(id: number, traceId?: string): Promise<Movie> {
    return withTrace('getMovie', 'tmdb', async (trace) => {
      const response = await this.request<any>(`/movie/${id}`, {}, RequestPriority.HIGH, trace.traceId);
      return mapTMDbMovie(response, this.genreCache);
    });
  }

  /**
   * Get movie details with all related data
   */
  async getMovieDetails(id: number, traceId?: string): Promise<MovieDetails> {
    return withTrace('getMovieDetails', 'tmdb', async (trace) => {
      // Fetch all data in parallel
      const [movie, credits, videos, images, reviews, similar, recommendations] = await Promise.all([
        this.request<any>(`/movie/${id}`, {}, RequestPriority.HIGH, trace.traceId),
        this.request<any>(`/movie/${id}/credits`, {}, RequestPriority.MEDIUM, trace.traceId),
        this.request<any>(`/movie/${id}/videos`, {}, RequestPriority.MEDIUM, trace.traceId),
        this.request<any>(`/movie/${id}/images`, {}, RequestPriority.LOW, trace.traceId),
        this.request<any>(`/movie/${id}/reviews`, { page: 1 }, RequestPriority.LOW, trace.traceId),
        this.request<any>(`/movie/${id}/similar`, { page: 1 }, RequestPriority.LOW, trace.traceId),
        this.request<any>(`/movie/${id}/recommendations`, { page: 1 }, RequestPriority.LOW, trace.traceId),
      ]);

      return mapTMDbMovieDetails(movie, credits, videos, images, reviews, similar, recommendations);
    });
  }

  /**
   * Get popular movies
   */
  async getPopularMovies(page: number = 1, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return withTrace('getPopularMovies', 'tmdb', async (trace) => {
      const response = await this.request<any>('/movie/popular', { page }, RequestPriority.MEDIUM, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Get trending movies
   */
  async getTrendingMovies(
    timeWindow: 'day' | 'week' = 'week',
    page: number = 1,
    traceId?: string
  ): Promise<PaginatedResponse<Movie>> {
    return withTrace('getTrendingMovies', 'tmdb', async (trace) => {
      const response = await this.request<any>(`/trending/movie/${timeWindow}`, { page }, RequestPriority.MEDIUM, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Get top rated movies
   */
  async getTopRatedMovies(page: number = 1, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return withTrace('getTopRatedMovies', 'tmdb', async (trace) => {
      const response = await this.request<any>('/movie/top_rated', { page }, RequestPriority.MEDIUM, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Get upcoming movies
   */
  async getUpcomingMovies(page: number = 1, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return withTrace('getUpcomingMovies', 'tmdb', async (trace) => {
      const response = await this.request<any>('/movie/upcoming', { page }, RequestPriority.MEDIUM, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Get now playing movies
   */
  async getNowPlayingMovies(page: number = 1, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return withTrace('getNowPlayingMovies', 'tmdb', async (trace) => {
      const response = await this.request<any>('/movie/now_playing', { page }, RequestPriority.MEDIUM, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Search movies
   */
  async searchMovies(query: SearchQuery, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return withTrace('searchMovies', 'tmdb', async (trace) => {
      const params: Record<string, string | number | boolean> = {
        query: query.query,
        page: query.page || 1,
        include_adult: query.include_adult || false,
      };

      if (query.year) params.year = query.year;
      if (query.language) params.language = query.language;

      const response = await this.request<any>('/search/movie', params, RequestPriority.HIGH, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Discover movies with filters
   */
  async discoverMovies(options: DiscoverOptions, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return withTrace('discoverMovies', 'tmdb', async (trace) => {
      const params: Record<string, string | number> = {
        page: options.page || 1,
      };

      if (options.sort_by) params.sort_by = options.sort_by;
      if (options.with_genres) params.with_genres = options.with_genres;
      if (options.without_genres) params.without_genres = options.without_genres;
      if (options.year) params.year = options.year;
      if (options.vote_average_gte) params['vote_average.gte'] = options.vote_average_gte;
      if (options.vote_count_gte) params['vote_count.gte'] = options.vote_count_gte;
      if (options.with_runtime_gte) params['with_runtime.gte'] = options.with_runtime_gte;
      if (options.with_runtime_lte) params['with_runtime.lte'] = options.with_runtime_lte;

      const response = await this.request<any>('/discover/movie', params, RequestPriority.MEDIUM, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Get movie credits
   */
  async getMovieCredits(id: number, traceId?: string): Promise<Credits> {
    return withTrace('getMovieCredits', 'tmdb', async (trace) => {
      const response = await this.request<any>(`/movie/${id}/credits`, {}, RequestPriority.MEDIUM, trace.traceId);
      return mapTMDbCredits(response);
    });
  }

  /**
   * Get movie videos
   */
  async getMovieVideos(id: number, traceId?: string): Promise<VideoCollection> {
    return withTrace('getMovieVideos', 'tmdb', async (trace) => {
      const response = await this.request<any>(`/movie/${id}/videos`, {}, RequestPriority.MEDIUM, trace.traceId);
      return mapTMDbVideos(response);
    });
  }

  /**
   * Get movie images
   */
  async getMovieImages(id: number, traceId?: string): Promise<ImageCollection> {
    return withTrace('getMovieImages', 'tmdb', async (trace) => {
      const response = await this.request<any>(`/movie/${id}/images`, {}, RequestPriority.LOW, trace.traceId);
      return mapTMDbImages(response);
    });
  }

  /**
   * Get movie reviews
   */
  async getMovieReviews(id: number, page: number = 1, traceId?: string): Promise<PaginatedResponse<Review>> {
    return withTrace('getMovieReviews', 'tmdb', async (trace) => {
      const response = await this.request<any>(`/movie/${id}/reviews`, { page }, RequestPriority.LOW, trace.traceId);
      return mapTMDbPaginatedResponse(response, (r: any) => r) as PaginatedResponse<Review>;
    });
  }

  /**
   * Get similar movies
   */
  async getSimilarMovies(id: number, page: number = 1, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return withTrace('getSimilarMovies', 'tmdb', async (trace) => {
      const response = await this.request<any>(`/movie/${id}/similar`, { page }, RequestPriority.LOW, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Get recommended movies
   */
  async getRecommendedMovies(id: number, page: number = 1, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return withTrace('getRecommendedMovies', 'tmdb', async (trace) => {
      const response = await this.request<any>(`/movie/${id}/recommendations`, { page }, RequestPriority.LOW, trace.traceId);
      return mapTMDbPaginatedResponse(response, (m: any) => mapTMDbMovie(m, this.genreCache)) as PaginatedResponse<Movie>;
    });
  }

  /**
   * Get genres and cache them
   */
  async getGenres(traceId?: string): Promise<Genre[]> {
    return withTrace('getGenres', 'tmdb', async (trace) => {
      const response = await this.request<{ genres: any[] }>('/genre/movie/list', {}, RequestPriority.LOW, trace.traceId);
      
      // Update genre cache
      response.genres.forEach((g: any) => {
        this.genreCache.set(g.id, g.name);
      });

      return response.genres.map(mapTMDbGenre);
    });
  }

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(genreId: number, page: number = 1, traceId?: string): Promise<PaginatedResponse<Movie>> {
    return this.discoverMovies({ with_genres: String(genreId), page }, traceId);
  }

  /**
   * Health check
   */
  async healthCheck(traceId?: string): Promise<boolean> {
    try {
      await this.request<any>('/configuration', {}, RequestPriority.LOW, traceId);
      return true;
    } catch {
      return false;
    }
  }
}
