// @ts-nocheck
/**
 * ETag Cache Implementation
 * 
 * HTTP ETag (Entity Tag) caching for bandwidth optimization.
 * When server returns 304 Not Modified, reuse cached data instead
 * of re-downloading. Massive bandwidth saver for Netflix-scale apps.
 * 
 * Flow:
 * 1. First request: Server returns ETag + data
 * 2. Cache ETag with data
 * 3. Next request: Send If-None-Match with ETag
 * 4. Server returns 304 if unchanged → Reuse cache (no body transfer!)
 * 5. Server returns 200 with new ETag if changed → Update cache
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * ETag cache entry
 */
interface ETagCacheEntry<T = any> {
  /** Cached data */
  data: T;
  /** ETag value */
  etag: string;
  /** Timestamp when cached */
  cachedAt: number;
  /** Last validated timestamp */
  lastValidated: number;
  /** Cache hits */
  hits: number;
}

/**
 * ETag Cache Manager
 */
export class ETagCacheManager {
  private cache = new Map<string, ETagCacheEntry>();
  private stats = {
    hits: 0,         // 304 Not Modified responses
    misses: 0,       // 200 OK responses (data changed)
    validations: 0,  // Total validation requests
    bytesSaved: 0,   // Estimated bandwidth saved
  };

  /**
   * Generate cache key from URL and params
   */
  private getCacheKey(url: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${url}:${paramStr}`;
  }

  /**
   * Get cached entry
   */
  get(url: string, params?: any): ETagCacheEntry | undefined {
    const key = this.getCacheKey(url, params);
    return this.cache.get(key);
  }

  /**
   * Set cache entry
   */
  set(url: string, data: any, etag: string, params?: any): void {
    const key = this.getCacheKey(url, params);
    const entry = this.cache.get(key);

    this.cache.set(key, {
      data,
      etag,
      cachedAt: entry?.cachedAt || Date.now(),
      lastValidated: Date.now(),
      hits: entry?.hits || 0,
    });
  }

  /**
   * Update validation timestamp and hits
   */
  updateValidation(url: string, params?: any): void {
    const key = this.getCacheKey(url, params);
    const entry = this.cache.get(key);

    if (entry) {
      entry.lastValidated = Date.now();
      entry.hits++;
      this.stats.hits++;
    }
  }

  /**
   * Record miss (data changed)
   */
  recordMiss(): void {
    this.stats.misses++;
  }

  /**
   * Record validation request
   */
  recordValidation(): void {
    this.stats.validations++;
  }

  /**
   * Estimate bandwidth saved
   */
  recordBytesSaved(bytes: number): void {
    this.stats.bytesSaved += bytes;
  }

  /**
   * Clear cache entry
   */
  delete(url: string, params?: any): void {
    const key = this.getCacheKey(url, params);
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    const hitRate = this.stats.validations > 0
      ? (this.stats.hits / this.stats.validations) * 100
      : 0;

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      cacheSize: this.cache.size,
      bytesSavedMB: (this.stats.bytesSaved / (1024 * 1024)).toFixed(2),
    };
  }

  /**
   * Get cache entries (for debugging)
   */
  getEntries() {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      etag: entry.etag,
      cachedAt: new Date(entry.cachedAt).toISOString(),
      lastValidated: new Date(entry.lastValidated).toISOString(),
      hits: entry.hits,
      age: Math.floor((Date.now() - entry.cachedAt) / 1000),
    }));
  }
}

/**
 * Global ETag cache instance
 */
export const etagCache = new ETagCacheManager();

/**
 * Axios interceptor for ETag support
 */
export function createETagInterceptor(cache: ETagCacheManager = etagCache) {
  return {
    /**
     * Request interceptor: Add If-None-Match header
     */
    request: (config: AxiosRequestConfig): AxiosRequestConfig => {
      // Only for GET requests
      if (config.method?.toUpperCase() !== 'GET') {
        return config;
      }

      // Check if we have cached ETag
      const cached = cache.get(config.url!, config.params);

      if (cached) {
        // Add If-None-Match header
        config.headers = config.headers || {};
        config.headers['If-None-Match'] = cached.etag;

        // Store estimated response size for bandwidth calculation
        (config as any)._estimatedSize = JSON.stringify(cached.data).length;
      }

      return config;
    },

    /**
     * Response interceptor: Handle 304 and cache ETags
     */
    response: (response: AxiosResponse): AxiosResponse => {
      const { config, status, headers, data } = response;

      cache.recordValidation();

      // Handle 304 Not Modified
      if (status === 304) {
        const cached = cache.get(config.url!, config.params);

        if (cached) {
          // Update validation timestamp
          cache.updateValidation(config.url!, config.params);

          // Calculate bandwidth saved
          const estimatedSize = (config as any)._estimatedSize || 0;
          cache.recordBytesSaved(estimatedSize);

          // Return cached data
          return {
            ...response,
            status: 200,
            data: cached.data,
            headers: {
              ...headers,
              'X-Cache': 'HIT',
              'X-ETag-Cached': 'true',
            },
          };
        }
      }

      // Handle 200 OK with ETag
      if (status === 200 && headers.etag) {
        cache.set(config.url!, data, headers.etag, config.params);
        cache.recordMiss();
      }

      return response;
    },

    /**
     * Error interceptor: Handle 304 errors
     */
    error: (error: any) => {
      if (error.response?.status === 304) {
        // This shouldn't happen, but handle gracefully
        const { config } = error;
        const cached = cache.get(config.url, config.params);

        if (cached) {
          return Promise.resolve({
            ...error.response,
            status: 200,
            data: cached.data,
          });
        }
      }

      return Promise.reject(error);
    },
  };
}

/**
 * Fetch wrapper with ETag support
 */
export async function fetchWithETag<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const cacheKey = url;
  const cached = etagCache.get(cacheKey);

  // Add If-None-Match header if we have cached ETag
  if (cached) {
    options.headers = {
      ...options.headers,
      'If-None-Match': cached.etag,
    };
  }

  etagCache.recordValidation();

  const response = await fetch(url, options);

  // Handle 304 Not Modified
  if (response.status === 304 && cached) {
    etagCache.updateValidation(cacheKey);
    
    // Calculate bandwidth saved
    const estimatedSize = JSON.stringify(cached.data).length;
    etagCache.recordBytesSaved(estimatedSize);
    
    return cached.data as T;
  }

  // Handle 200 OK
  if (response.ok) {
    const etag = response.headers.get('ETag');
    const data = await response.json();

    if (etag) {
      etagCache.set(cacheKey, data, etag);
    }

    etagCache.recordMiss();
    return data;
  }

  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

/**
 * Axios instance with ETag support
 */
export function createETagAxios() {
  const instance = axios.create();
  const interceptor = createETagInterceptor();

  // Add request interceptor
  instance.interceptors.request.use(
    interceptor.request,
    (error) => Promise.reject(error)
  );

  // Add response interceptor
  instance.interceptors.response.use(
    interceptor.response,
    interceptor.error
  );

  return instance;
}

/**
 * ETag-aware provider wrapper
 */
export class ETagProvider {
  private axios = createETagAxios();

  /**
   * GET request with ETag support
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.get<T>(url, config);
    return response.data;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return etagCache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    etagCache.clear();
  }

  /**
   * Invalidate specific URL
   */
  invalidate(url: string, params?: any): void {
    etagCache.delete(url, params);
  }
}

/**
 * Conditional request helpers
 */
export class ConditionalRequestHelper {
  /**
   * Check if resource is fresh
   */
  static isFresh(entry: ETagCacheEntry, maxAge: number): boolean {
    const age = Date.now() - entry.lastValidated;
    return age < maxAge;
  }

  /**
   * Check if validation needed
   */
  static needsValidation(entry: ETagCacheEntry, staleTime: number): boolean {
    const timeSinceValidation = Date.now() - entry.lastValidated;
    return timeSinceValidation > staleTime;
  }

  /**
   * Get freshness percentage
   */
  static getFreshnessPercent(entry: ETagCacheEntry, maxAge: number): number {
    const age = Date.now() - entry.cachedAt;
    const freshness = Math.max(0, 1 - age / maxAge);
    return freshness * 100;
  }
}

/**
 * ETag cache configuration
 */
export interface ETagConfig {
  /** Enable ETag caching */
  enabled: boolean;
  /** Maximum cache age (ms) */
  maxAge: number;
  /** Stale time before revalidation (ms) */
  staleTime: number;
  /** Enable automatic cleanup */
  autoCleanup: boolean;
  /** Cleanup interval (ms) */
  cleanupInterval: number;
}

/**
 * ETag cache with automatic cleanup
 */
export class ManagedETagCache extends ETagCacheManager {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private config: ETagConfig) {
    super();

    if (config.autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from((this as any).cache.entries());

    for (const [key, entry] of entries) {
      const age = now - entry.cachedAt;

      if (age > this.config.maxAge) {
        (this as any).cache.delete(key);
      }
    }
  }
}

