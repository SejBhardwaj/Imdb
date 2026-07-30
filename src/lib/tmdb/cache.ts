/**
 * Request Coalescing and Caching
 * 
 * Ensures identical requests are deduplicated:
 * - Multiple components request same movie → ONE network request
 * - Shared cache across all consumers
 * - ETag support for conditional requests
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  expiresAt: number;
}

interface RequestCoalescing<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inflight = new Map<string, RequestCoalescing<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get from cache or execute function
   * Coalesces identical concurrent requests
   */
  public async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[Cache] HIT: ${key}`);
      return cached.data;
    }

    // Check if request is already in flight
    const inflight = this.inflight.get(key);
    if (inflight) {
      console.log(`[Cache] COALESCE: ${key} (reusing in-flight request)`);
      return inflight.promise;
    }

    // Execute new request
    console.log(`[Cache] MISS: ${key} (fetching...)`);
    const promise = this.executeFetch(key, fetcher, ttl);
    
    // Store in-flight request
    this.inflight.set(key, {
      promise,
      timestamp: Date.now(),
    });

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up in-flight
      this.inflight.delete(key);
    }
  }

  /**
   * Execute fetch and cache result
   */
  private async executeFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      const data = await fetcher();
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      });

      return data;
    } catch (error) {
      console.error(`[Cache] FETCH ERROR: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get with ETag support for conditional requests
   */
  public async getWithETag<T>(
    key: string,
    fetcher: (etag?: string) => Promise<{ data: T; etag?: string; notModified?: boolean }>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    // If cached and has ETag, try conditional request
    if (cached && cached.etag) {
      try {
        console.log(`[Cache] Conditional request with ETag: ${cached.etag}`);
        const result = await fetcher(cached.etag);
        
        // 304 Not Modified - reuse cache
        if (result.notModified) {
          console.log(`[Cache] 304 Not Modified: ${key}`);
          
          // Extend expiration
          cached.expiresAt = Date.now() + ttl;
          this.cache.set(key, cached);
          
          return cached.data;
        }
        
        // New data - update cache
        this.cache.set(key, {
          data: result.data,
          timestamp: Date.now(),
          etag: result.etag,
          expiresAt: Date.now() + ttl,
        });
        
        return result.data;
      } catch (error) {
        console.warn(`[Cache] ETag request failed, falling back to cache`, error);
        
        // Return stale cache if available
        if (cached) {
          return cached.data;
        }
        
        throw error;
      }
    }

    // No ETag or no cache - regular fetch
    const result = await fetcher();
    
    this.cache.set(key, {
      data: result.data,
      timestamp: Date.now(),
      etag: result.etag,
      expiresAt: Date.now() + ttl,
    });

    return result.data;
  }

  /**
   * Set cache entry manually
   */
  public set<T>(key: string, data: T, ttl: number = this.defaultTTL, etag?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Invalidate cache entry
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[Cache] INVALIDATE: ${key}`);
  }

  /**
   * Invalidate by pattern (prefix match)
   */
  public invalidatePattern(pattern: string): void {
    let count = 0;
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`[Cache] INVALIDATE PATTERN: ${pattern} (${count} entries)`);
  }

  /**
   * Clear entire cache
   */
  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.inflight.clear();
    console.log(`[Cache] CLEAR: ${size} entries removed`);
  }

  /**
   * Clean expired entries
   */
  public cleanExpired(): void {
    const now = Date.now();
    let count = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`[Cache] CLEANUP: ${count} expired entries removed`);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      totalEntries: this.cache.size,
      inflightRequests: this.inflight.size,
      expiredEntries: entries.filter(e => now >= e.expiresAt).length,
      validEntries: entries.filter(e => now < e.expiresAt).length,
      oldestEntry: entries.length > 0
        ? new Date(Math.min(...entries.map(e => e.timestamp)))
        : null,
      newestEntry: entries.length > 0
        ? new Date(Math.max(...entries.map(e => e.timestamp)))
        : null,
    };
  }

  /**
   * Prefetch (warm cache)
   */
  public async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    // Check if already cached
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return; // Already cached
    }

    // Check if already in flight
    if (this.inflight.has(key)) {
      return; // Already fetching
    }

    // Start prefetch in background
    console.log(`[Cache] PREFETCH: ${key}`);
    this.get(key, fetcher, ttl).catch(error => {
      console.warn(`[Cache] PREFETCH FAILED: ${key}`, error);
    });
  }
}

// Singleton instance
export const requestCache = new RequestCache();

/**
 * Helper to create cache key
 */
export function createCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

/**
 * Periodic cleanup (run every 5 minutes)
 */
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.cleanExpired();
  }, 5 * 60 * 1000);
}

export { RequestCache };
