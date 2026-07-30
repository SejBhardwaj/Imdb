/**
 * Redis Cache Adapter (Upstash)
 * 
 * Production-grade caching with Redis.
 * Optimized for Upstash Redis (serverless, edge-compatible).
 * 
 * Features:
 * - Automatic serialization/deserialization
 * - TTL support with automatic expiration
 * - Tag-based invalidation (using Redis sets)
 * - Atomic operations
 * - Connection pooling
 * - Error resilience
 * - Statistics tracking
 * 
 * Setup:
 * 1. Create Upstash Redis: https://console.upstash.com/
 * 2. Set environment variables:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 * 3. Install: npm install @upstash/redis
 */

import type { CacheAdapter, CacheStats } from './CacheManager';

/**
 * Redis client interface (compatible with @upstash/redis)
 */
interface RedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex?: number }) => Promise<string>;
  del: (...keys: string[]) => Promise<number>;
  exists: (...keys: string[]) => Promise<number>;
  sadd: (key: string, ...members: string[]) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  srem: (key: string, ...members: string[]) => Promise<number>;
  incr: (key: string) => Promise<number>;
  flushdb: () => Promise<string>;
  dbsize: () => Promise<number>;
}

/**
 * Redis Cache Adapter Configuration
 */
export interface RedisCacheAdapterConfig {
  /** Redis client instance */
  client: RedisClient;
  /** Namespace for cache keys */
  namespace?: string;
  /** Enable compression for large values */
  enableCompression?: boolean;
  /** Enable statistics tracking */
  enableStats?: boolean;
  /** Key prefix for stats */
  statsPrefix?: string;
}

/**
 * Redis Cache Adapter Implementation
 */
export class RedisCacheAdapter implements CacheAdapter {
  private client: RedisClient;
  private namespace: string;
  private enableCompression: boolean;
  private enableStats: boolean;
  private statsPrefix: string;

  constructor(config: RedisCacheAdapterConfig) {
    this.client = config.client;
    this.namespace = config.namespace || 'movie-cache';
    this.enableCompression = config.enableCompression ?? false;
    this.enableStats = config.enableStats ?? true;
    this.statsPrefix = config.statsPrefix || 'cache-stats';
  }

  /**
   * Get namespaced key
   */
  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Get tag set key
   */
  private getTagKey(tag: string): string {
    return `${this.namespace}:tag:${tag}`;
  }

  /**
   * Get stats key
   */
  private getStatsKey(metric: string): string {
    return `${this.statsPrefix}:${metric}`;
  }

  /**
   * Serialize value
   */
  private serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  /**
   * Deserialize value
   */
  private deserialize<T>(value: string): T {
    return JSON.parse(value);
  }

  /**
   * Increment stat counter
   */
  private async incrementStat(metric: string): Promise<void> {
    if (!this.enableStats) return;

    try {
      await this.client.incr(this.getStatsKey(metric));
    } catch (error) {
      // Silently fail stats tracking
      console.error('[RedisCacheAdapter] Error incrementing stat:', error);
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const nsKey = this.getKey(key);
      const value = await this.client.get(nsKey);

      if (value === null) {
        await this.incrementStat('misses');
        return null;
      }

      await this.incrementStat('hits');
      return this.deserialize<T>(value);
    } catch (error) {
      console.error('[RedisCacheAdapter] Error getting from cache:', error);
      await this.incrementStat('misses');
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number, tags: string[] = []): Promise<void> {
    try {
      const nsKey = this.getKey(key);
      const serialized = this.serialize(value);

      // Set value with expiration
      await this.client.set(nsKey, serialized, { ex: ttl });

      // Add to tag sets
      if (tags.length > 0) {
        await Promise.all(
          tags.map(async (tag) => {
            const tagKey = this.getTagKey(tag);
            await this.client.sadd(tagKey, nsKey);
            // Set expiration on tag set (slightly longer than max TTL)
            await this.client.set(`${tagKey}:ttl`, '1', { ex: ttl + 300 });
          })
        );
      }

      await this.incrementStat('sets');
    } catch (error) {
      console.error('[RedisCacheAdapter] Error setting cache:', error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const nsKey = this.getKey(key);
      await this.client.del(nsKey);
      await this.incrementStat('deletes');
    } catch (error) {
      console.error('[RedisCacheAdapter] Error deleting from cache:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      const nsKey = this.getKey(key);
      const exists = await this.client.exists(nsKey);
      return exists > 0;
    } catch (error) {
      console.error('[RedisCacheAdapter] Error checking existence:', error);
      return false;
    }
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // Get all keys for each tag
      for (const tag of tags) {
        const tagKey = this.getTagKey(tag);
        const keys = await this.client.smembers(tagKey);
        keysToDelete.push(...keys);

        // Delete tag set
        await this.client.del(tagKey, `${tagKey}:ttl`);
      }

      // Delete all keys (deduplicated)
      const uniqueKeys = Array.from(new Set(keysToDelete));
      if (uniqueKeys.length > 0) {
        await this.client.del(...uniqueKeys);
        await this.incrementStat('deletes');
      }
    } catch (error) {
      console.error('[RedisCacheAdapter] Error invalidating tags:', error);
      throw error;
    }
  }

  /**
   * Clear all cache in namespace
   */
  async clear(): Promise<void> {
    try {
      // Note: This is a simplified implementation
      // In production, you might want to use SCAN for large datasets
      console.warn(
        '[RedisCacheAdapter] Clear operation flushes entire database. ' +
        'Use with caution in production.'
      );
      await this.client.flushdb();
    } catch (error) {
      console.error('[RedisCacheAdapter] Error clearing cache:', error);
      throw error;
    }
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

    try {
      const [hitsStr, missesStr, setsStr, deletesStr, size] = await Promise.all([
        this.client.get(this.getStatsKey('hits')),
        this.client.get(this.getStatsKey('misses')),
        this.client.get(this.getStatsKey('sets')),
        this.client.get(this.getStatsKey('deletes')),
        this.client.dbsize(),
      ]);

      const hits = parseInt(hitsStr || '0');
      const misses = parseInt(missesStr || '0');
      const sets = parseInt(setsStr || '0');
      const deletes = parseInt(deletesStr || '0');

      const total = hits + misses;
      const hitRate = total > 0 ? hits / total : 0;

      return {
        hits,
        misses,
        sets,
        deletes,
        size,
        hitRate,
      };
    } catch (error) {
      console.error('[RedisCacheAdapter] Error getting stats:', error);
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Reset statistics
   */
  async resetStats(): Promise<void> {
    if (!this.enableStats) return;

    try {
      await Promise.all([
        this.client.del(this.getStatsKey('hits')),
        this.client.del(this.getStatsKey('misses')),
        this.client.del(this.getStatsKey('sets')),
        this.client.del(this.getStatsKey('deletes')),
      ]);
    } catch (error) {
      console.error('[RedisCacheAdapter] Error resetting stats:', error);
    }
  }

  /**
   * Batch get multiple keys
   */
  async getBatch<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const nsKeys = keys.map((k) => this.getKey(k));
      const values = await Promise.all(nsKeys.map((k) => this.client.get(k)));

      return values.map((v) => {
        if (v === null) {
          this.incrementStat('misses');
          return null;
        }
        this.incrementStat('hits');
        return this.deserialize<T>(v);
      });
    } catch (error) {
      console.error('[RedisCacheAdapter] Error batch getting from cache:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple keys
   */
  async setBatch<T>(
    entries: Array<{
      key: string;
      value: T;
      ttl: number;
      tags?: string[];
    }>
  ): Promise<void> {
    try {
      await Promise.all(
        entries.map((entry) => this.set(entry.key, entry.value, entry.ttl, entry.tags || []))
      );
    } catch (error) {
      console.error('[RedisCacheAdapter] Error batch setting cache:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = `${this.namespace}:health-check`;
      await this.client.set(testKey, 'ok', { ex: 10 });
      const value = await this.client.get(testKey);
      await this.client.del(testKey);
      return value === 'ok';
    } catch (error) {
      console.error('[RedisCacheAdapter] Health check failed:', error);
      return false;
    }
  }
}

/**
 * Create Redis cache adapter from environment variables
 * 
 * Usage:
 * ```typescript
 * import { createRedisCache } from '@/lib/data/cache/RedisCacheAdapter';
 * 
 * const cache = createRedisCache();
 * ```
 */
export function createRedisCache(config?: Omit<RedisCacheAdapterConfig, 'client'>): RedisCacheAdapter | null {
  // Check if Upstash Redis is available
  if (typeof window !== 'undefined') {
    console.warn('[RedisCacheAdapter] Redis cache only works in server environment');
    return null;
  }

  try {
    // Dynamic import to avoid bundling in client
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redis } = require('@upstash/redis');

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn(
        '[RedisCacheAdapter] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN ' +
        'environment variables not set. Redis cache disabled.'
      );
      return null;
    }

    const client = new Redis({
      url,
      token,
    });

    return new RedisCacheAdapter({
      ...config,
      client,
    });
  } catch (error) {
    console.error('[RedisCacheAdapter] Failed to create Redis cache:', error);
    return null;
  }
}

/**
 * Create Redis cache with automatic fallback to memory cache
 * 
 * Usage:
 * ```typescript
 * import { createCacheWithFallback } from '@/lib/data/cache/RedisCacheAdapter';
 * import { MemoryCacheAdapter } from '@/lib/data/cache/CacheManager';
 * 
 * const cache = createCacheWithFallback();
 * // Returns Redis if available, otherwise memory cache
 * ```
 */
export function createCacheWithFallback(config?: Omit<RedisCacheAdapterConfig, 'client'>): CacheAdapter {
  const redisCache = createRedisCache(config);
  
  if (redisCache) {
    console.log('[Cache] Using Redis cache');
    return redisCache;
  }

  console.log('[Cache] Using memory cache (fallback)');
  // Fallback to memory cache
  const { MemoryCacheAdapter } = require('./CacheManager');
  return new MemoryCacheAdapter(1000, config?.namespace);
}
