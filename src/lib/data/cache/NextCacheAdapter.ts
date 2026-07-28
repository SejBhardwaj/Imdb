/**
 * Next.js Cache Adapter
 * 
 * Leverages Next.js built-in caching mechanisms:
 * - `unstable_cache` for data caching
 * - `revalidateTag` for tag-based invalidation
 * - Automatic ISR (Incremental Static Regeneration)
 * 
 * Features:
 * - Server-side only (uses Next.js cache)
 * - Tag-based revalidation
 * - Automatic stale-while-revalidate
 * - Zero configuration
 * - Vercel Edge Network integration
 * 
 * Note: This adapter only works in Next.js server environment
 */

import { unstable_cache, revalidateTag } from 'next/cache';
import type { CacheAdapter, CacheStats } from './CacheManager';

/**
 * Next.js Cache Adapter Configuration
 */
export interface NextCacheAdapterConfig {
  /** Namespace for cache keys */
  namespace?: string;
  /** Enable statistics tracking (uses separate cache) */
  enableStats?: boolean;
}

/**
 * Next.js Cache Adapter Implementation
 */
export class NextCacheAdapter implements CacheAdapter {
  private namespace: string;
  private enableStats: boolean;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(config: NextCacheAdapterConfig = {}) {
    this.namespace = config.namespace || 'movie-cache';
    this.enableStats = config.enableStats ?? false;

    // Validate environment
    if (typeof window !== 'undefined') {
      console.warn(
        '[NextCacheAdapter] This adapter only works in server environment. ' +
        'Use MemoryCacheAdapter for client-side caching.'
      );
    }
  }

  /**
   * Get namespaced key
   */
  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Create cached function that returns the value
      const cachedFn = unstable_cache(
        async () => {
          // If we're here, it means cache miss (Next.js will call this function)
          return null;
        },
        [this.getKey(key)],
        {
          tags: [this.getKey(key)],
        }
      );

      const value = await cachedFn();

      if (value === null) {
        if (this.enableStats) this.stats.misses++;
        return null;
      }

      if (this.enableStats) this.stats.hits++;
      return value as T;
    } catch (error) {
      console.error('[NextCacheAdapter] Error getting from cache:', error);
      if (this.enableStats) this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   * 
   * Note: Next.js cache is populated via unstable_cache wrapper,
   * not directly. This method uses a workaround.
   */
  async set<T>(key: string, value: T, ttl: number, tags: string[] = []): Promise<void> {
    try {
      // Create a cached function that returns the value
      const allTags = [this.getKey(key), ...tags.map((t) => `${this.namespace}:${t}`)];

      const cachedFn = unstable_cache(
        async () => value,
        [this.getKey(key)],
        {
          tags: allTags,
          revalidate: ttl, // Cache for TTL seconds
        }
      );

      // Execute to populate cache
      await cachedFn();

      if (this.enableStats) this.stats.sets++;
    } catch (error) {
      console.error('[NextCacheAdapter] Error setting cache:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      revalidateTag(this.getKey(key));
      if (this.enableStats) this.stats.deletes++;
    } catch (error) {
      console.error('[NextCacheAdapter] Error deleting from cache:', error);
    }
  }

  /**
   * Check if key exists
   * 
   * Note: Next.js doesn't provide a way to check existence without fetching.
   * This is a best-effort implementation.
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        revalidateTag(`${this.namespace}:${tag}`);
      }
    } catch (error) {
      console.error('[NextCacheAdapter] Error invalidating tags:', error);
    }
  }

  /**
   * Clear all cache
   * 
   * Note: Next.js doesn't provide a clear-all API.
   * We can only revalidate by tags.
   */
  async clear(): Promise<void> {
    console.warn(
      '[NextCacheAdapter] Clear operation not fully supported. ' +
      'Consider revalidating specific tags instead.'
    );
    // Revalidate namespace tag
    revalidateTag(this.namespace);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.enableStats) {
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        hitRate: 0,
      };
    }

    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      size: 0, // Next.js doesn't expose cache size
      hitRate,
    };
  }
}

/**
 * Helper function to create cached data fetcher
 * 
 * Usage:
 * ```typescript
 * const getMovie = createCachedFetcher(
 *   'movie',
 *   async (id: number) => fetchMovieFromAPI(id),
 *   { revalidate: 3600, tags: ['movies'] }
 * );
 * 
 * const movie = await getMovie(550);
 * ```
 */
export function createCachedFetcher<Args extends any[], Result>(
  name: string,
  fetcher: (...args: Args) => Promise<Result>,
  options: {
    revalidate?: number | false;
    tags?: string[];
  } = {}
): (...args: Args) => Promise<Result> {
  return unstable_cache(
    fetcher,
    [name],
    {
      revalidate: options.revalidate,
      tags: options.tags,
    }
  );
}

/**
 * Helper function for tag-based revalidation
 * 
 * Usage:
 * ```typescript
 * await revalidateCacheTags(['movies', 'movie:550']);
 * ```
 */
export async function revalidateCacheTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}

/**
 * Create a cached repository method
 * 
 * Usage in repository:
 * ```typescript
 * class MovieRepository {
 *   getMovie = cachedMethod(
 *     'getMovie',
 *     async (id: number) => {
 *       return await this.provider.getMovie(id);
 *     },
 *     (id) => ({ revalidate: 3600, tags: [`movie:${id}`] })
 *   );
 * }
 * ```
 */
export function cachedMethod<Args extends any[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
  options: (
    ...args: Args
  ) => {
    revalidate?: number | false;
    tags?: string[];
  }
): (...args: Args) => Promise<Result> {
  return (...args: Args) => {
    const opts = options(...args);
    const cachedFn = unstable_cache(fn, [name, ...args.map(String)], opts);
    return cachedFn();
  };
}

/**
 * Server Action for cache invalidation
 * 
 * Usage in Server Component or API Route:
 * ```typescript
 * 'use server'
 * 
 * import { invalidateMovieCache } from '@/lib/data/cache/NextCacheAdapter';
 * 
 * export async function updateMovie(id: number, data: MovieData) {
 *   await saveMovie(id, data);
 *   await invalidateMovieCache(id);
 * }
 * ```
 */
export async function invalidateMovieCache(id: number | string): Promise<void> {
  revalidateTag(`movie:${id}`);
}

/**
 * Invalidate list caches (popular, top-rated, etc.)
 */
export async function invalidateMovieListCaches(): Promise<void> {
  const listTags = ['popular', 'top-rated', 'now-playing', 'upcoming'];
  await revalidateCacheTags(listTags);
}

/**
 * Preload data into cache (for prefetching)
 * 
 * Usage:
 * ```typescript
 * // In Server Component
 * await preloadMovie(550);
 * 
 * // Later in Client Component
 * const movie = await getMovie(550); // Instant, from cache
 * ```
 */
export async function preloadCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    revalidate?: number | false;
    tags?: string[];
  } = {}
): Promise<void> {
  const cachedFn = unstable_cache(fetcher, [key], options);
  await cachedFn();
}
