/**
 * OMDb Provider Implementation
 * 
 * Fallback provider using Open Movie Database API.
 * Implements subset of MovieProvider interface (OMDb has limited features).
 * 
 * Features:
 * - Movie search and details
 * - IMDb integration
 * - Simplified resilience (rate limiting + retry)
 * - Error transformation
 * 
 * API Documentation: http://www.omdbapi.com/
 * 
 * Note: OMDb is primarily used as fallback when TMDb unavailable
 * or for IMDb-specific lookups.
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
} from '../types/movie';
import {
  APIError,
  RateLimitError,
  NetworkError,
  AuthenticationError,
} from '../types/movie';
import type { MovieProvider } from './MovieProvider';
import { RateLimiter } from '../resilience/TokenBucket';
import { RetryStrategy } from '../resilience/RetryStrategy';

/**
 * OMDb API response types
 */
interface OMDbMovieResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{ Source: string; Value: string }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  Response: string;
  Error?: string;
}

interface OMDbSearchResponse {
  Search: Array<{
    Title: string;
    Year: string;
    imdbID: string;
    Type: string;
    Poster: string;
  }>;
  totalResults: string;
  Response: string;
  Error?: string;
}

/**
 * OMDb Provider Configuration
 */
export interface OMDbProviderConfig extends Partial<ProviderConfig> {
  apiKey: string;
}

/**
 * OMDb Provider Implementation
 */
export class OMDbProvider implements MovieProvider {
  readonly name = 'omdb';

  private client: AxiosInstance;
  private apiKey: string;
  private rateLimiter: RateLimiter;
  private retryStrategy: RetryStrategy;

  constructor(config: OMDbProviderConfig) {
    // Validate API key
    if (!config.apiKey) {
      throw new Error('OMDb API key is required');
    }

    this.apiKey = config.apiKey;

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://www.omdbapi.com',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize rate limiter (OMDb: 1000 requests/day for free tier ≈ 0.7 req/s)
    // Use conservative limit to avoid daily cap
    this.rateLimiter = new RateLimiter(
      config.rateLimitPerSecond || 0.5, // 0.5 req/s = 43,200 req/day (well under limit)
      2 // Allow small burst
    );

    // Initialize retry strategy
    this.retryStrategy = new RetryStrategy(
      {
        maxAttempts: 2, // Less aggressive than TMDb
        baseDelay: 2000,
        maxDelay: 10000,
      },
      (context) => {
        console.log(
          `[OMDbProvider] Retry attempt ${context.attempt}/${context.maxAttempts}`
        );
      }
    );
  }

  /**
   * Execute request with resilience
   */
  private async executeRequest<T>(fn: () => Promise<T>): Promise<T> {
    return this.rateLimiter.execute(() => this.retryStrategy.execute(fn));
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
      const message = (axiosError.response.data as any)?.Error || axiosError.message;

      // Rate limit error
      if (status === 429) {
        return new RateLimitError(message, 60, this.name);
      }

      // Authentication error
      if (status === 401) {
        return new AuthenticationError(message, this.name);
      }

      // Generic API error
      return new APIError(message, status, this.name, [408, 500, 502, 503, 504].includes(status));
    }

    return error;
  }

  /**
   * Parse runtime string to minutes
   */
  private parseRuntime(runtime: string): number | null {
    const match = runtime.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Parse IMDb rating to number
   */
  private parseRating(rating: string): number {
    const parsed = parseFloat(rating);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse IMDb votes to number
   */
  private parseVotes(votes: string): number {
    const parsed = parseInt(votes.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Extract year from year string (e.g., "2008" or "2008–2013")
   */
  private extractYear(year: string): string {
    return year.split('–')[0];
  }

  /**
   * Transform OMDb movie to unified format
   */
  private transformMovieDetails(omdbMovie: OMDbMovieResponse): MovieDetails {
    return {
      id: omdbMovie.imdbID,
      title: omdbMovie.Title,
      overview: omdbMovie.Plot,
      posterPath: omdbMovie.Poster !== 'N/A' ? omdbMovie.Poster : null,
      backdropPath: null, // OMDb doesn't provide backdrop
      releaseDate: omdbMovie.Released !== 'N/A' ? omdbMovie.Released : '',
      voteAverage: this.parseRating(omdbMovie.imdbRating),
      voteCount: this.parseVotes(omdbMovie.imdbVotes),
      popularity: 0, // OMDb doesn't provide popularity
      adult: omdbMovie.Rated === 'R' || omdbMovie.Rated === 'NC-17',
      originalLanguage: omdbMovie.Language?.split(',')[0]?.toLowerCase() || 'en',
      originalTitle: omdbMovie.Title,
      genreIds: [], // OMDb uses strings, not IDs
      runtime: this.parseRuntime(omdbMovie.Runtime),
      budget: 0, // OMDb doesn't provide budget
      revenue: 0, // OMDb doesn't provide revenue
      status: 'Released',
      tagline: '', // OMDb doesn't provide tagline
      homepage: omdbMovie.Website && omdbMovie.Website !== 'N/A' ? omdbMovie.Website : null,
      imdbId: omdbMovie.imdbID,
      genres: omdbMovie.Genre?.split(', ').map((name, index) => ({
        id: index,
        name,
      })) || [],
      productionCompanies: omdbMovie.Production
        ? [{
            id: 0,
            name: omdbMovie.Production,
            logoPath: null,
            originCountry: '',
          }]
        : [],
      productionCountries: omdbMovie.Country?.split(', ').map((name) => ({
        iso31661: '',
        name,
      })) || [],
      spokenLanguages: omdbMovie.Language?.split(', ').map((name) => ({
        iso6391: '',
        name,
        englishName: name,
      })) || [],
    };
  }

  /**
   * Transform search result to Movie
   */
  private transformSearchResult(result: OMDbSearchResponse['Search'][0]): Movie {
    return {
      id: result.imdbID,
      title: result.Title,
      overview: '',
      posterPath: result.Poster !== 'N/A' ? result.Poster : null,
      backdropPath: null,
      releaseDate: this.extractYear(result.Year),
      voteAverage: 0,
      voteCount: 0,
      popularity: 0,
      adult: false,
      originalLanguage: 'en',
      originalTitle: result.Title,
      genreIds: [],
    };
  }

  /**
   * Get a single movie by ID (IMDb ID)
   */
  async getMovie(id: number | string): Promise<MovieDetails> {
    try {
      const response = await this.executeRequest(() =>
        this.client.get<OMDbMovieResponse>('/', {
          params: {
            apikey: this.apiKey,
            i: id,
            plot: 'full',
          },
        })
      );

      if (response.data.Response === 'False') {
        throw new APIError(
          response.data.Error || 'Movie not found',
          404,
          this.name,
          false
        );
      }

      return this.transformMovieDetails(response.data);
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
        this.client.get<OMDbSearchResponse>('/', {
          params: {
            apikey: this.apiKey,
            s: query,
            type: 'movie',
            page,
          },
        })
      );

      if (response.data.Response === 'False') {
        // No results, return empty
        return {
          results: [],
          page,
          totalPages: 0,
          totalResults: 0,
        };
      }

      const totalResults = parseInt(response.data.totalResults);
      const totalPages = Math.ceil(totalResults / 10); // OMDb returns 10 per page

      return {
        results: response.data.Search.map((r) => this.transformSearchResult(r)),
        page,
        totalPages,
        totalResults,
      };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Get movie by external ID (IMDb ID)
   */
  async getMovieByExternalId(imdbId: string): Promise<MovieDetails> {
    return this.getMovie(imdbId);
  }

  /**
   * Get full image URL (OMDb returns full URLs)
   */
  getImageUrl(path: string, size?: 'small' | 'medium' | 'large' | 'original'): string {
    return path || '';
  }

  // ===============================================
  // Methods NOT supported by OMDb API
  // Return empty/stub responses
  // ===============================================

  async getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    throw new APIError('OMDb does not support popular movies', 501, this.name, false);
  }

  async getPopularMoviesCursor(cursor?: string): Promise<CursorPaginatedResponse<Movie>> {
    throw new APIError('OMDb does not support cursor pagination', 501, this.name, false);
  }

  async getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    throw new APIError('OMDb does not support top-rated movies', 501, this.name, false);
  }

  async getNowPlayingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    throw new APIError('OMDb does not support now playing movies', 501, this.name, false);
  }

  async getUpcomingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    throw new APIError('OMDb does not support upcoming movies', 501, this.name, false);
  }

  async searchMoviesWithFilters(
    query: string,
    filters: MovieFilters,
    page?: number
  ): Promise<PaginatedResponse<Movie>> {
    // OMDb supports year filter only
    if (filters.year) {
      try {
        const response = await this.executeRequest(() =>
          this.client.get<OMDbSearchResponse>('/', {
            params: {
              apikey: this.apiKey,
              s: query,
              type: 'movie',
              y: filters.year,
              page: page || 1,
            },
          })
        );

        if (response.data.Response === 'False') {
          return {
            results: [],
            page: page || 1,
            totalPages: 0,
            totalResults: 0,
          };
        }

        const totalResults = parseInt(response.data.totalResults);
        const totalPages = Math.ceil(totalResults / 10);

        return {
          results: response.data.Search.map((r) => this.transformSearchResult(r)),
          page: page || 1,
          totalPages,
          totalResults,
        };
      } catch (error) {
        throw this.transformError(error);
      }
    }

    // Fallback to regular search
    return this.searchMovies(query, page);
  }

  async getRecommendations(movieId: number, page?: number): Promise<PaginatedResponse<Movie>> {
    throw new APIError('OMDb does not support recommendations', 501, this.name, false);
  }

  async getSimilarMovies(movieId: number, page?: number): Promise<PaginatedResponse<Movie>> {
    throw new APIError('OMDb does not support similar movies', 501, this.name, false);
  }

  async getMovieCredits(movieId: number): Promise<MovieCredits> {
    // OMDb provides cast/crew as comma-separated strings, not structured data
    throw new APIError('OMDb does not support structured credits', 501, this.name, false);
  }

  async getMovieVideos(movieId: number): Promise<MovieVideo[]> {
    throw new APIError('OMDb does not support videos', 501, this.name, false);
  }

  async getMovieImages(movieId: number): Promise<{
    backdrops: MovieImage[];
    posters: MovieImage[];
    logos: MovieImage[];
  }> {
    throw new APIError('OMDb does not support images', 501, this.name, false);
  }

  async discoverByGenre(genreId: number, page?: number): Promise<PaginatedResponse<Movie>> {
    throw new APIError('OMDb does not support genre discovery', 501, this.name, false);
  }

  /**
   * Stop rate limiter
   */
  shutdown(): void {
    this.rateLimiter.stop();
  }
}
