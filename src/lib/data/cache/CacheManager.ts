/**
 * Cache Manager
 * 
 * Unified caching interface supporting multiple backends.
 * 
 * Backends:
 * - Memory (in-process)
 * - Next.js Cache (`unstable_cache`)
 * - Redis (Upstash)
 * 
 * Features:
 * - TTL support
 * - Tag-based invalidation
 * - LRU eviction (memory)
 * - Cache statistics
 * - Namespace isolation
 */

/**
 * Cache adapter interface
 * All cache implementations must implement this
 */
export interface CacheAdapter {
  /**
   * Get value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttl: number, tags?: string[]): Promise<void>;

  /**
   * Delete value from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Check if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Invalidate by tags (optional)
   */
  invalidateByTags?(tags: string[]): Promise<void>;

  /**
   * Clear all cache (optional)
   */
  clear?(): Promise<void>;

  /**
   * Get cache statistics (optional)
   */
  getStats?(): Promise<CacheStats>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
  createdAt: number;
}

/**
 * In-Memory Cache Implementation (LRU)
 */
export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>(); // tag -> keys
  private accessOrder: string[] = []; // LRU tracking
  private maxSize: number;
  private namespace: string;

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(maxSize: number = 1000, namespace: string = 'default') {
    this.maxSize = maxSize;
    this.namespace = namespace;

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get namespaced key
   */
  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Update LRU order
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder.shift()!;
    this.cache.delete(keyToEvict);

    // Clean up tag index
    for (const [tag, keys] of this.tagIndex.entries()) {
      keys.delete(keyToEvict);
      if (keys.size === 0) {
        this.tagIndex.delete(tag);
      }
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const nsKey = this.getKey(key);
    const entry = this.cache.get(nsKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(nsKey);
      this.stats.misses++;
      return null;
    }

    this.updateAccessOrder(nsKey);
    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl: number, tags: string[] = []): Promise<void> {
    const nsKey = this.getKey(key);

    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(nsKey)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      tags,
      createdAt: Date.now(),
    };

    this.cache.set(nsKey, entry);
    this.updateAccessOrder(nsKey);

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(nsKey);
    }

    this.stats.sets++;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const nsKey = this.getKey(key);
    const entry = this.cache.get(nsKey);

    if (entry) {
      this.cache.delete(nsKey);

      // Clean up tag index
      for (const tag of entry.tags) {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.delete(nsKey);
          if (keys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }

      // Remove from access order
      const index = this.accessOrder.indexOf(nsKey);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }

      this.stats.deletes++;
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const nsKey = this.getKey(key);
    const entry = this.cache.get(nsKey);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>();

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.forEach((key) => keysToDelete.add(key));
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key.replace(`${this.namespace}:`, ''));
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.tagIndex.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate,
    };
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);

          // Clean up tag index
          for (const tag of entry.tags) {
            const keys = this.tagIndex.get(tag);
            if (keys) {
              keys.delete(key);
              if (keys.size === 0) {
                this.tagIndex.delete(tag);
              }
            }
          }
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * Tiered Cache Adapter
 * 
 * Uses multiple cache layers (L1 = memory, L2 = Redis/Next)
 * Optimizes for speed while maintaining consistency
 */
export class TieredCacheAdapter implements CacheAdapter {
  private l1Cache: MemoryCacheAdapter;
  private l2Cache: CacheAdapter;

  constructor(l1MaxSize: number = 500, l2Cache: CacheAdapter) {
    this.l1Cache = new MemoryCacheAdapter(l1MaxSize);
    this.l2Cache = l2Cache;
  }

  /**
   * Get from L1, fallback to L2
   */
  async get<T>(key: string): Promise<T | null> {
    // Try L1 first (fastest)
    const l1Value = await this.l1Cache.get<T>(key);
    if (l1Value !== null) {
      return l1Value;
    }

    // Try L2
    const l2Value = await this.l2Cache.get<T>(key);
    if (l2Value !== null) {
      // Backfill L1 with short TTL
      await this.l1Cache.set(key, l2Value, 300); // 5 minutes
      return l2Value;
    }

    return null;
  }

  /**
   * Set to both L1 and L2
   */
  async set<T>(key: string, value: T, ttl: number, tags: string[] = []): Promise<void> {
    // Write to both caches
    await Promise.all([
      this.l1Cache.set(key, value, Math.min(ttl, 3600), tags), // L1 max 1 hour
      this.l2Cache.set(key, value, ttl, tags),
    ]);
  }

  /**
   * Delete from both caches
   */
  async delete(key: string): Promise<void> {
    await Promise.all([this.l1Cache.delete(key), this.l2Cache.delete(key)]);
  }

  /**
   * Check if exists in either cache
   */
  async has(key: string): Promise<boolean> {
    const l1Has = await this.l1Cache.has(key);
    if (l1Has) return true;

    return this.l2Cache.has(key);
  }

  /**
   * Invalidate by tags in both caches
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await Promise.all([
      this.l1Cache.invalidateByTags?.(tags),
      this.l2Cache.invalidateByTags?.(tags),
    ]);
  }

  /**
   * Clear both caches
   */
  async clear(): Promise<void> {
    await Promise.all([this.l1Cache.clear?.(), this.l2Cache.clear?.()]);
  }

  /**
   * Get combined statistics
   */
  async getStats(): Promise<CacheStats> {
    const [l1Stats, l2Stats] = await Promise.all([
      this.l1Cache.getStats?.(),
      this.l2Cache.getStats?.(),
    ]);

    if (!l1Stats || !l2Stats) {
      return l1Stats || l2Stats || {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        hitRate: 0,
      };
    }

    const totalHits = l1Stats.hits + l2Stats.hits;
    const totalMisses = l1Stats.misses + l2Stats.misses;
    const total = totalHits + totalMisses;

    return {
      hits: totalHits,
      misses: totalMisses,
      sets: l1Stats.sets + l2Stats.sets,
      deletes: l1Stats.deletes + l2Stats.deletes,
      size: l1Stats.size + l2Stats.size,
      hitRate: total > 0 ? totalHits / total : 0,
    };
  }
}

/**
 * Cache Manager
 * 
 * Factory for creating cache adapters
 */
export class CacheManager {
  /**
   * Create memory cache
   */
  static createMemoryCache(maxSize?: number, namespace?: string): MemoryCacheAdapter {
    return new MemoryCacheAdapter(maxSize, namespace);
  }

  /**
   * Create tiered cache
   */
  static createTieredCache(l1MaxSize: number, l2Cache: CacheAdapter): TieredCacheAdapter {
    return new TieredCacheAdapter(l1MaxSize, l2Cache);
  }
}
