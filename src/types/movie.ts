/**
 * Unified Movie Type System
 * 
 * Provider-agnostic types for movie data across TMDb, OMDb, and mock providers
 */

// ===== CORE TYPES =====

export interface Movie {
  id: number;
  title: string;
  year: number;
  rating: number;
  votes: string;
  genres: string[];
  runtime: string;
  overview: string;
  tagline?: string;
  poster: string;
  backdrop: string;
  certification?: string;
  language?: string;
  director?: string;
  cast?: string[];
  status?: string;
  revenue?: string;
  budget?: string;
  popularity?: number;
  trailer?: string;
  provider?: string;
}

export interface MovieDetails extends Movie {
  credits?: Credits;
  videos?: VideoCollection;
  images?: ImageCollection;
  recommendations?: Movie[];
  similar?: Movie[];
  reviews?: Review[];
}

export interface Credits {
  id: number;
  cast: CastMember[];
  crew: CrewMember[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string;
  order: number;
  popularity?: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string;
}

export interface VideoCollection {
  results: Video[];
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
  size?: number;
}

export interface ImageCollection {
  backdrops: Image[];
  posters: Image[];
  logos: Image[];
}

export interface Image {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
  vote_count: number;
}

export interface Review {
  id: string;
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path?: string;
    rating?: number;
  };
  content: string;
  created_at: string;
  updated_at: string;
  url?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface TVShow {
  id: number;
  title: string;
  year: number;
  rating: number;
  genres: string[];
  overview: string;
  poster: string;
  backdrop: string;
  network?: string;
  seasons?: number;
  status?: string;
  popularity?: number;
}

export interface Actor {
  id: number;
  name: string;
  role: string;
  photo: string;
  popularity: number;
  knownFor?: string;
  character?: string;
}

// ===== PAGINATION =====

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  total_pages: number;
  total_results: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CursorPaginatedResponse<T> {
  results: T[];
  nextCursor?: string;
  previousCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface InfiniteQueryPage<T> {
  data: T[];
  nextCursor?: string;
  pageParam: number | string;
}

// ===== FILTERS & QUERIES =====

export interface MovieFilters {
  genre?: string;
  year?: number;
  rating_min?: number;
  rating_max?: number;
  sort_by?: 'popularity' | 'rating' | 'release_date' | 'title' | 'vote_average' | 'vote_count';
  language?: string;
  with_genres?: string;
  without_genres?: string;
  with_cast?: string;
  with_crew?: string;
  certification?: string;
  certification_country?: string;
}

export interface SearchQuery {
  query: string;
  page?: number;
  year?: number;
  include_adult?: boolean;
  language?: string;
  region?: string;
}

export interface DiscoverOptions {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  without_genres?: string;
  year?: number;
  vote_average_gte?: number;
  vote_count_gte?: number;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
}

// ===== ERRORS =====

export interface APIError {
  code: string;
  message: string;
  retryable: boolean;
  provider: string;
  status: number;
  timestamp: number;
  details?: unknown;
  traceId?: string;
}

export class NetworkError extends Error implements APIError {
  code = 'NETWORK_ERROR';
  retryable = true;
  provider: string;
  status = 0;
  timestamp: number;
  details?: unknown;
  traceId?: string;

  constructor(provider: string, message: string, details?: unknown, traceId?: string) {
    super(message);
    this.provider = provider;
    this.timestamp = Date.now();
    this.details = details;
    this.traceId = traceId;
    this.name = 'NetworkError';
  }
}

export class APIResponseError extends Error implements APIError {
  code: string;
  retryable: boolean;
  provider: string;
  status: number;
  timestamp: number;
  details?: unknown;
  traceId?: string;

  constructor(
    provider: string,
    status: number,
    message: string,
    retryable: boolean = false,
    details?: unknown,
    traceId?: string
  ) {
    super(message);
    this.code = `HTTP_${status}`;
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
    this.timestamp = Date.now();
    this.details = details;
    this.traceId = traceId;
    this.name = 'APIResponseError';
  }
}

export class TimeoutError extends Error implements APIError {
  code = 'TIMEOUT_ERROR';
  retryable = true;
  provider: string;
  status = 0;
  timestamp: number;
  details?: unknown;
  traceId?: string;

  constructor(provider: string, timeout: number, traceId?: string) {
    super(`Request timeout after ${timeout}ms`);
    this.provider = provider;
    this.timestamp = Date.now();
    this.details = { timeout };
    this.traceId = traceId;
    this.name = 'TimeoutError';
  }
}

export class CircuitBreakerOpenError extends Error implements APIError {
  code = 'CIRCUIT_BREAKER_OPEN';
  retryable = false;
  provider: string;
  status = 0;
  timestamp: number;
  details?: unknown;
  traceId?: string;

  constructor(provider: string, traceId?: string) {
    super(`Circuit breaker is open for ${provider}`);
    this.provider = provider;
    this.timestamp = Date.now();
    this.traceId = traceId;
    this.name = 'CircuitBreakerOpenError';
  }
}

export class RateLimitError extends Error implements APIError {
  code = 'RATE_LIMIT_EXCEEDED';
  retryable = true;
  provider: string;
  status = 429;
  timestamp: number;
  details?: unknown;
  traceId?: string;

  constructor(provider: string, retryAfter?: number, traceId?: string) {
    super(`Rate limit exceeded for ${provider}`);
    this.provider = provider;
    this.timestamp = Date.now();
    this.details = { retryAfter };
    this.traceId = traceId;
    this.name = 'RateLimitError';
  }
}

// ===== CACHE METADATA =====

export interface CacheMetadata {
  key: string;
  timestamp: number;
  staleTime: number;
  provider: string;
  hitCount: number;
  lastAccessed: number;
  size?: number;
  tags?: string[];
}

export interface CacheEntry<T> {
  data: T;
  metadata: CacheMetadata;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}

// ===== TELEMETRY =====

export interface TelemetryEvent {
  type: 'request' | 'cache_hit' | 'cache_miss' | 'error' | 'retry' | 'circuit_breaker' | 'rate_limit';
  provider: string;
  operation: string;
  duration?: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}

export interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  retryCount: number;
  cacheHitRate: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
}

export interface RequestTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  provider: string;
  success: boolean;
  error?: APIError;
  metadata?: Record<string, unknown>;
  children?: RequestTrace[];
}

// ===== PROVIDER TYPES =====

export type ProviderName = 'tmdb' | 'omdb' | 'mock';

export interface ProviderConfig {
  name: ProviderName;
  apiKey?: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  priority: number;
}

export interface ProviderHealth {
  provider: ProviderName;
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
}

// ===== RESILIENCE =====

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxAttempts: number;
}

export interface TokenBucketConfig {
  capacity: number;
  refillRate: number;
  refillInterval: number;
}

export interface RateLimiterState {
  tokens: number;
  lastRefill: number;
  queueLength: number;
}
