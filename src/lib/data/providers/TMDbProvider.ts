/**
 * TMDb Provider Implementation
 * 
 * Complete implementation of MovieProvider interface for The Movie Database API.
 * 
 * Features:
 * - All 20+ MovieProvider methods
 * - Token bucket rate limiting (40 req/10s)
 * - Circuit breaker protection
 * - Exponential backoff retry
 * - Error transformation to unified types
 * - Image URL generation with size support
 * - Request/response transformation
 * 
 * API Documentation: https://developers.themoviedb.org/3
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Movie,
  MovieDetails,
  MovieCredits,
  MovieVideo,
  MovieImage,
  PaginatedResponse,
  CursorPaginatedResponse,
  MovieFilters,
  ProviderConfig,
  CastMember,
  CrewMember,
  Genre,
  ProductionCompany,
  ProductionCountry,
  SpokenLanguage,
} from '../types/movie';
import {
  APIError,
  RateLimitError,
  NetworkError,
  AuthenticationError,
} from '../types/movie';
import type { MovieProvider } from './MovieProvider';
import { TokenBucket } from '../resilience/TokenBucket';
import { CircuitBreaker, CircuitState } from '../resilience/CircuitBreaker';
import { RetryStrategy } from '../resilience/RetryStrategy';

/**
 * TMDb API response types
 */
interface TMDbMovieResponse {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  original_language: string;
  original_title: string;
  genre_ids: number[];
}

interface TMDbMovieDetailsResponse extends TMDbMovieResponse {
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  homepage: string | null;
  imdb_id: string | null;
  genres: Array<{ id: number; name: string }>;
  production_companies: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  production_countries: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  spoken_languages: Array<{
    iso_639_1: string;
    name: string;
    english_name: string;
  }>;
}

interface TMDbPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TMDbCreditsResponse {
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }>;
}

interface TMDbVideosResponse {
  results: Array<{
    id: string;
    key: string;
    name: string;
    site: string;
    size: number;
    type: string;
    official: boolean;
    published_at: string;
  }>;
}

interface TMDbImagesResponse {
  backdrops: Array<{
    aspect_ratio: number;
    height: number;
    width: number;
    file_path: string;
    vote_average: number;
    vote_count: number;
  }>;
  posters: Array<{
    aspect_ratio: number;
    height: number;
    width: number;
    file_path: string;
    vote_average: number;
    vote_count: number;
  }>;
  logos: Array<{
    aspect_ratio: number;
    height: number;
    width: number;
    file_path: string;
    vote_average: number;
    vote_count: number;
  }>;
}

/**
 * TMDb Provider Configuration
 */
export interface TMDbProviderConfig extends Partial<ProviderConfig> {
  apiKey: string;
  language?: string;
  region?: string;
}

/**
 * TMDb Provider Implementation
 */
export class TMDbProvider implements MovieProvider {
  readonly name = 'tmdb';
  
  private client: AxiosInstance;
  private imageBaseUrl: string;
  private rateLimiter: TokenBucket;
  private circuitBreaker: CircuitBreaker;
  private retryStrategy: RetryStrategy;
  private language: string;
  private region?: string;

  constructor(config: TMDbProviderConfig) {
    // Validate API key
    if (!config.apiKey) {
      throw new Error('TMDb API key is required');
    }

    this.language = config.language || 'en-US';
    this.region = config.region;
    this.imageBaseUrl = config.imageBaseUrl || 'https://image.tmdb.org/t/p/';

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.themoviedb.org/3',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    // Initialize rate limiter (TMDb: 40 requests per 10 seconds = 4 req/s)
    this.rateLimiter = new TokenBucket({
      capacity: config.rateLimitPerSecond ? config.rateLimitPerSecond * 10 : 40,
      refillRate: config.rateLimitPerSecond || 4,
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
        monitoringPeriod: 120000, // 2 minutes
      },
      (oldState, newState) => {
        console.warn(`[TMDbProvider] Circuit breaker: ${oldState} → ${newState}`);
      }
    );

    // Initialize retry strategy
    this.retryStrategy = new RetryStrategy(
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        exponentialBase: 2,
        jitterPercent: 50,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      },
      (context) => {
        console.log(
          `[TMDbProvider] Retry attempt ${context.attempt}/${context.maxAttempts} ` +
          `after ${context.delays[context.delays.length - 1]}ms`
        );
      }
    );
  }

  /**
   * Execute request with full resilience stack
   */
  private async executeRequest<T>(fn: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      await this.rateLimiter.consume();
      return this.retryStrategy.execute(fn);
    });
  }

  /**
   * Transform axios error to unified error type
   */
  private transformError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network error
      if (!axiosError.response) {
        return new NetworkError(
          axiosError.message || 'Network error occurred',
          this.name
        );
      }

      const status = axiosError.response.status;
      const message = (axiosError.response.data as any)?.status_message || axiosError.message;

      // Rate limit error
      if (status === 429) {
        const retryAfter = parseInt(axiosError.response.headers['retry-after'] || '60');
        return new RateLimitError(message, retryAfter, this.name);
      }

      // Authentication error
      if (status === 401) {
        return new AuthenticationError(message, this.name);
      }

      // Generic API error
      return new APIError(
        message,
        status,
        this.name,
        [408, 500, 502, 503, 504].includes(status)
      );
    }

    return error;
  }

  /**
   * Transform TMDb movie to unified format
   */
  private transformMovie(tmdbMovie: TMDbMovieResponse): Movie {
    return {
      id: tmdbMovie.id,
      title: tmdbMovie.title,
      overview: tmdbMovie.overview,
      posterPath: tmdbMovie.poster_path,
      backdropPath: tmdbMovie.backdrop_path,
      releaseDate: tmdbMovie.release_date,
      voteAverage: tmdbMovie.vote_average,
      voteCount: tmdbMovie.vote_count,
      popularity: tmdbMovie.popularity,
      adult: tmdbMovie.adult,
      originalLanguage: tmdbMovie.original_language,
      originalTitle: tmdbMovie.original_title,
      genreIds: tmdbMovie.genre_ids,
    };
  }

  /**
   * Transform TMDb movie details to unified format
   */
  private transformMovieDetails(tmdbMovie: TMDbMovieDetailsResponse): MovieDetails {
    return {
      ...this.transformMovie(tmdbMovie),
      runtime: tmdbMovie.runtime,
      budget: tmdbMovie.budget,
      revenue: tmdbMovie.revenue,
      status: tmdbMovie.status,
      tagline: tmdbMovie.tagline,
      homepage: tmdbMovie.homepage,
      imdbId: tmdbMovie.imdb_id,
      genres: tmdbMovie.genres.map((g) => ({
        id: g.id,
        name: g.name,
      })),
      productionCompanies: tmdbMovie.production_companies.map((pc) => ({
        id: pc.id,
        name: pc.name,
        logoPath: pc.logo_path,
        originCountry: pc.origin_country,
      })),
      productionCountries: tmdbMovie.production_countries.map((pc) => ({
        iso31661: pc.iso_3166_1,
        name: pc.name,
      })),
      spokenLanguages: tmdbMovie.spoken_languages.map((sl) => ({
        iso6391: sl.iso_639_1,
        name: sl.name,
        englishName: sl.english_name,
      })),
    };
  }

  /**
   * Transform TMDb paginated response
   */
  private transformPaginatedResponse<T>(
    tmdbResponse: TMDbPaginatedResponse<TMDbMovieResponse>,
    transformer: (item: TMDbMovieResponse) => T
  ): PaginatedResponse<T> {
    return {
      results: tmdbResponse.results.map(transformer),
      page: tmdbResponse.page,
      totalPages: tmdbResponse.total_pages,
      totalResults: tmdbResponse.total_results,
    };
  }

  /**
   * Convert page-based pagination to cursor
   */
  private pageToCursor(page: number): string {
    return Buffer.from(JSON.stringify({ page })).toString('base64');
  }

  /**
   * Convert cursor to page number
   */
  private cursorToPage(cursor: string): number {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
      return decoded.page || 1;
    } catch {
      return 1;
    }
  }

  /**
   * Get a single movie by ID
   */
  async getMovie(id: number | string): Promise<MovieDetails> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbMovieDetailsResponse>(`/movie/${id}`, {
          params: {
            language: this.language,
          },
        })
      );

      return this.transformMovieDetails(response.data);
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get popular movies (paginated)
   */
  async getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>('/movie/popular', {
          params: {
            page,
            language: this.language,
            region: this.region,
          },
        })
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get popular movies with cursor pagination
   */
  async getPopularMoviesCursor(cursor?: string): Promise<CursorPaginatedResponse<Movie>> {
    const page = cursor ? this.cursorToPage(cursor) : 1;
    const response = await this.getPopularMovies(page);

    const hasMore = response.page < response.totalPages;
    const nextCursor = hasMore ? this.pageToCursor(page + 1) : null;

    return {
      results: response.results,
      cursor: nextCursor,
      hasMore,
    };
  }

  /**
   * Get top-rated movies
   */
  async getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>('/movie/top_rated', {
          params: {
            page,
            language: this.language,
            region: this.region,
          },
        })
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get now playing movies
   */
  async getNowPlayingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>('/movie/now_playing', {
          params: {
            page,
            language: this.language,
            region: this.region,
          },
        })
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get upcoming movies
   */
  async getUpcomingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>('/movie/upcoming', {
          params: {
            page,
            language: this.language,
            region: this.region,
          },
        })
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Search movies
   */
  async searchMovies(query: string, page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>('/search/movie', {
          params: {
            query,
            page,
            language: this.language,
            region: this.region,
          },
        })
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Search movies with filters
   */
  async searchMoviesWithFilters(
    query: string,
    filters: MovieFilters,
    page: number = 1
  ): Promise<PaginatedResponse<Movie>> {
    try {
      const params: any = {
        query,
        page,
        language: this.language,
        region: this.region,
      };

      if (filters.year) {
        params.year = filters.year;
      }

      if (filters.genres && filters.genres.length > 0) {
        params.with_genres = filters.genres.join(',');
      }

      if (filters.minRating) {
        params['vote_average.gte'] = filters.minRating;
      }

      if (filters.maxRating) {
        params['vote_average.lte'] = filters.maxRating;
      }

      if (filters.sortBy) {
        const sortMap: Record<string, string> = {
          popularity: 'popularity',
          vote_average: 'vote_average',
          release_date: 'release_date',
          revenue: 'revenue',
        };
        const sortDir = filters.sortOrder === 'asc' ? 'asc' : 'desc';
        params.sort_by = `${sortMap[filters.sortBy]}.${sortDir}`;
      }

      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>('/search/movie', {
          params,
        })
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get movie recommendations
   */
  async getRecommendations(movieId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>(
          `/movie/${movieId}/recommendations`,
          {
            params: {
              page,
              language: this.language,
            },
          }
        )
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get similar movies
   */
  async getSimilarMovies(movieId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>(`/movie/${movieId}/similar`, {
          params: {
            page,
            language: this.language,
          },
        })
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get movie credits (cast + crew)
   */
  async getMovieCredits(movieId: number): Promise<MovieCredits> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbCreditsResponse>(`/movie/${movieId}/credits`)
      );

      const cast: CastMember[] = response.data.cast.map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path,
        order: c.order,
      }));

      const crew: CrewMember[] = response.data.crew.map((c) => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profilePath: c.profile_path,
      }));

      return { cast, crew };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get movie videos (trailers, teasers)
   */
  async getMovieVideos(movieId: number): Promise<MovieVideo[]> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbVideosResponse>(`/movie/${movieId}/videos`, {
          params: {
            language: this.language,
          },
        })
      );

      return response.data.results.map((v) => ({
        id: v.id,
        key: v.key,
        name: v.name,
        site: v.site,
        size: v.size,
        type: v.type,
        official: v.official,
        publishedAt: v.published_at,
      }));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get movie images
   */
  async getMovieImages(movieId: number): Promise<{
    backdrops: MovieImage[];
    posters: MovieImage[];
    logos: MovieImage[];
  }> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbImagesResponse>(`/movie/${movieId}/images`)
      );

      const transformImage = (img: any): MovieImage => ({
        aspectRatio: img.aspect_ratio,
        height: img.height,
        width: img.width,
        filePath: img.file_path,
        voteAverage: img.vote_average,
        voteCount: img.vote_count,
      });

      return {
        backdrops: response.data.backdrops.map(transformImage),
        posters: response.data.posters.map(transformImage),
        logos: response.data.logos?.map(transformImage) || [],
      };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Discover movies by genre
   */
  async discoverByGenre(genreId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<TMDbPaginatedResponse<TMDbMovieResponse>>('/discover/movie', {
          params: {
            with_genres: genreId,
            page,
            language: this.language,
            region: this.region,
            sort_by: 'popularity.desc',
          },
        })
      );

      return this.transformPaginatedResponse(response.data, (m) => this.transformMovie(m));
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get movie by external ID (IMDb ID)
   */
  async getMovieByExternalId(imdbId: string): Promise<MovieDetails> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<{
          movie_results: TMDbMovieDetailsResponse[];
        }>('/find/' + imdbId, {
          params: {
            external_source: 'imdb_id',
            language: this.language,
          },
        })
      );

      if (response.data.movie_results.length === 0) {
        throw new APIError(`Movie not found with IMDb ID: ${imdbId}`, 404, this.name, false);
      }

      return this.transformMovieDetails(response.data.movie_results[0]);
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Batch get movies (for efficiency)
   */
  async getMoviesBatch(ids: number[]): Promise<MovieDetails[]> {
    // TMDb doesn't have native batch endpoint, execute in parallel
    const promises = ids.map((id) => this.getMovie(id));
    
    try {
      return await Promise.all(promises);
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Prefetch movie data (for hover prefetching)
   */
  async prefetchMovie(id: number): Promise<void> {
    // Simply fetch and cache via rate limiter/circuit breaker
    await this.getMovie(id);
  }

  /**
   * Get full image URL
   */
  getImageUrl(path: string, size: 'small' | 'medium' | 'large' | 'original' = 'medium'): string {
    if (!path) {
      return '';
    }

    const sizeMap = {
      small: 'w185',
      medium: 'w500',
      large: 'w780',
      original: 'original',
    };

    return `${this.imageBaseUrl}${sizeMap[size]}${path}`;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    state: CircuitState;
    failures: number;
    successes: number;
  } {
    const stats = this.circuitBreaker.getStats();
    return {
      state: stats.state,
      failures: stats.failures,
      successes: stats.successes,
    };
  }

  /**
   * Get rate limiter status
   */
  getRateLimiterStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Stop all resilience mechanisms
   */
  shutdown(): void {
    this.rateLimiter.stop();
  }
}
