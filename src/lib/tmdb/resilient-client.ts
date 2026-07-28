/**
 * Resilient TMDB Client with Production Features
 * 
 * Features:
 * - Circuit breaker
 * - Retry with exponential backoff + jitter
 * - Request coalescing
 * - ETag support
 * - HTTP caching
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { TMDB_CONFIG } from '@/config/tmdb';
import { withCircuitBreaker } from './circuit-breaker';
import { retry } from './retry';
import { requestCache, createCacheKey } from './cache';

class ResilientTMDBClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: TMDB_CONFIG.BASE_URL,
      params: {
        api_key: TMDB_CONFIG.API_KEY,
      },
      timeout: 10000,
      // Enable ETag support
      validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add cache control headers
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers['Cache-Control'] = 'public, max-age=3600, stale-while-revalidate=86400';
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log cache hits
        if (response.status === 304) {
          console.log('[TMDB] 304 Not Modified - using cache');
        }
        
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          console.error('[TMDB] API Error:', {
            status: error.response.status,
            url: error.config?.url,
            data: error.response.data,
          });
        } else if (error.request) {
          console.error('[TMDB] Network Error:', {
            message: error.message,
            code: error.code,
            url: error.config?.url,
          });
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET with full resilience (circuit breaker + retry + cache + coalescing)
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = createCacheKey('tmdb', url, JSON.stringify(config?.params || {}));

    return requestCache.get(
      cacheKey,
      async () => {
        // Circuit breaker protection
        return withCircuitBreaker(
          'tmdb',
          async () => {
            // Retry with exponential backoff
            return retry(
              async () => {
                const response = await this.client.get<T>(url, config);
                return response.data;
              },
              {
                maxAttempts: 3,
                initialDelay: 1000,
                maxDelay: 10000,
                factor: 2,
                jitter: true,
              }
            );
          },
          {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 30000,
            monitoringPeriod: 60000,
          }
        );
      },
      5 * 60 * 1000 // 5 minute cache
    );
  }

  /**
   * GET with ETag support (conditional requests)
   */
  async getWithETag<T>(
    url: string,
    etag?: string,
    config?: AxiosRequestConfig
  ): Promise<{ data: T; etag?: string; notModified?: boolean }> {
    const cacheKey = createCacheKey('tmdb-etag', url, JSON.stringify(config?.params || {}));

    return requestCache.getWithETag(
      cacheKey,
      async (cachedETag) => {
        const headers = cachedETag
          ? { ...config?.headers, 'If-None-Match': cachedETag }
          : config?.headers;

        return withCircuitBreaker('tmdb', async () => {
          return retry(
            async () => {
              const response = await this.client.get<T>(url, {
                ...config,
                headers,
              });

              // 304 Not Modified
              if (response.status === 304) {
                return {
                  data: null as any,
                  notModified: true,
                };
              }

              return {
                data: response.data,
                etag: response.headers['etag'],
              };
            },
            {
              maxAttempts: 3,
              initialDelay: 1000,
            }
          );
        });
      },
      5 * 60 * 1000
    );
  }

  /**
   * GET without cache (bypass resilience for fresh data)
   */
  async getFresh<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST (no caching)
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return withCircuitBreaker('tmdb', async () => {
      return retry(
        async () => {
          const response = await this.client.post<T>(url, data, config);
          return response.data;
        },
        {
          maxAttempts: 2, // Fewer retries for POST
          initialDelay: 1000,
        }
      );
    });
  }

  /**
   * Prefetch (warm cache)
   */
  async prefetch(url: string, config?: AxiosRequestConfig): Promise<void> {
    const cacheKey = createCacheKey('tmdb', url, JSON.stringify(config?.params || {}));
    
    await requestCache.prefetch(
      cacheKey,
      async () => {
        const response = await this.client.get(url, config);
        return response.data;
      },
      5 * 60 * 1000
    );
  }

  /**
   * Invalidate cache
   */
  invalidateCache(url: string, config?: AxiosRequestConfig): void {
    const cacheKey = createCacheKey('tmdb', url, JSON.stringify(config?.params || {}));
    requestCache.invalidate(cacheKey);
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateCachePattern(pattern: string): void {
    requestCache.invalidatePattern(pattern);
  }
}

// Singleton instance
export const resilientTMDBClient = new ResilientTMDBClient();

export default resilientTMDBClient;
