/**
 * Movie Data Types
 * 
 * Unified type definitions for movie data across all providers.
 * Ensures consistent interfaces regardless of data source (TMDb, OMDb, etc.)
 */

/**
 * Base movie type - common fields across all providers
 */
export interface Movie {
  id: number | string;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  adult: boolean;
  originalLanguage: string;
  originalTitle: string;
  genreIds: number[];
}

/**
 * Detailed movie with additional metadata
 */
export interface MovieDetails extends Movie {
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  homepage: string | null;
  imdbId: string | null;
  genres: Genre[];
  productionCompanies: ProductionCompany[];
  productionCountries: ProductionCountry[];
  spokenLanguages: SpokenLanguage[];
}

/**
 * Genre definition
 */
export interface Genre {
  id: number;
  name: string;
}

/**
 * Production company
 */
export interface ProductionCompany {
  id: number;
  name: string;
  logoPath: string | null;
  originCountry: string;
}

/**
 * Production country
 */
export interface ProductionCountry {
  iso31661: string;
  name: string;
}

/**
 * Spoken language
 */
export interface SpokenLanguage {
  iso6391: string;
  name: string;
  englishName: string;
}

/**
 * Movie cast member
 */
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
}

/**
 * Movie crew member
 */
export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath: string | null;
}

/**
 * Movie credits (cast + crew)
 */
export interface MovieCredits {
  cast: CastMember[];
  crew: CrewMember[];
}

/**
 * Movie video (trailer, teaser, etc.)
 */
export interface MovieVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  publishedAt: string;
}

/**
 * Movie image
 */
export interface MovieImage {
  aspectRatio: number;
  height: number;
  width: number;
  filePath: string;
  voteAverage: number;
  voteCount: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Cursor-based paginated response
 */
export interface CursorPaginatedResponse<T> {
  results: T[];
  cursor: string | null; // Next page cursor
  hasMore: boolean;
}

/**
 * Movie search filters
 */
export interface MovieFilters {
  year?: number;
  genres?: number[];
  minRating?: number;
  maxRating?: number;
  sortBy?: 'popularity' | 'vote_average' | 'release_date' | 'revenue';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  imageBaseUrl?: string;
  rateLimitPerSecond?: number;
  timeout?: number;
}

/**
 * API Error types
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public provider?: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends APIError {
  constructor(
    message: string,
    public retryAfter: number, // seconds
    provider?: string
  ) {
    super(message, 429, provider, true);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends APIError {
  constructor(message: string, provider?: string) {
    super(message, undefined, provider, true);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, provider?: string) {
    super(message, 401, provider, false);
    this.name = 'AuthenticationError';
  }
}

/**
 * Cache entry metadata
 */
export interface CacheMetadata {
  cachedAt: number;
  expiresAt: number;
  tags: string[];
  source: 'tmdb' | 'omdb' | 'cache';
}

/**
 * Telemetry event
 */
export interface TelemetryEvent {
  type: 'request' | 'cache_hit' | 'cache_miss' | 'error' | 'retry' | 'circuit_break';
  timestamp: number;
  provider?: string;
  endpoint?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
  metadata?: Record<string, any>;
}
