/**
 * L1 Memory Cache
 * 
 * Fast in-memory LRU cache with tag-based invalidation
 */

import type { CacheEntry, CacheMetadata, CacheStats } from '@/types/movie';

interface CacheNode<T> {
  key: string;
  value: T;
  metadata: CacheMetadata;
  prev: CacheNode<T> | null;
  next: CacheNode<T> | null;
}

export class MemoryCache {
  private cache: Map<string, CacheNode<any>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private head: CacheNode<any> | null = null;
  private tail: CacheNode<any> | null = null;
  private maxSize: number;
  private defaultStaleTime: number;

  // Stats
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(maxSize: number = 1000, defaultStaleTime: number = 300000) {
    this.maxSize = maxSize;
    this.defaultStaleTime = defaultStaleTime;
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | undefined {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      return undefined;
    }

    // Check if stale
    const now = Date.now();
    if (now - node.metadata.timestamp > node.metadata.staleTime) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);

    // Update metadata
    node.metadata.hitCount++;
    node.metadata.lastAccessed = now;

    this.hits++;
    return node.value;
  }

  /**
   * Set value in cache
   */
  set<T = any>(
    key: string,
    value: T,
    provider: string,
    staleTime: number = this.defaultStaleTime,
    tags: string[] = []
  ): void {
    const now = Date.now();

    // If key exists, update it
    if (this.cache.has(key)) {
      const node = this.cache.get(key)!;
      node.value = value;
      node.metadata.timestamp = now;
      node.metadata.lastAccessed = now;
      node.metadata.staleTime = staleTime;
      node.metadata.provider = provider;
      node.metadata.tags = tags;
      this.moveToFront(node);
      this.updateTagIndex(key, tags);
      return;
    }

    // Create new node
    const metadata: CacheMetadata = {
      key,
      timestamp: now,
      lastAccessed: now,
      staleTime,
      provider,
      hitCount: 0,
      tags,
    };

    const node: CacheNode<any> = {
      key,
      value,
      metadata,
      prev: null,
      next: null,
    };

    // Add to cache
    this.cache.set(key, node);
    this.addToFront(node);
    this.updateTagIndex(key, tags);

    // Evict if over capacity
    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    this.removeFromTagIndex(key, node.metadata.tags || []);
    return true;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    // Check staleness
    const now = Date.now();
    if (now - node.metadata.timestamp > node.metadata.staleTime) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate by tags
   */
  invalidateByTags(tags: string[]): number {
    let count = 0;

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (!keys) continue;

      for (const key of keys) {
        if (this.delete(key)) {
          count++;
        }
      }

      this.tagIndex.delete(tag);
    }

    return count;
  }

  /**
   * Invalidate by pattern
   */
  invalidateByPattern(pattern: RegExp): number {
    let count = 0;

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        if (this.delete(key)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache stats
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate,
      evictions: this.evictions,
    };
  }

  /**
   * Get all entries (for debugging)
   */
  entries(): CacheEntry<any>[] {
    const entries: CacheEntry<any>[] = [];

    for (const node of this.cache.values()) {
      entries.push({
        data: node.value,
        metadata: node.metadata,
      });
    }

    return entries;
  }

  /**
   * Prune stale entries
   */
  prune(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, node] of this.cache) {
      if (now - node.metadata.timestamp > node.metadata.staleTime) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  // ===== LRU Implementation =====

  private moveToFront(node: CacheNode<any>): void {
    if (this.head === node) {
      return;
    }

    this.removeNode(node);
    this.addToFront(node);
  }

  private addToFront(node: CacheNode<any>): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<any>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private evictLRU(): void {
    if (!this.tail) {
      return;
    }

    const key = this.tail.key;
    const tags = this.tail.metadata.tags || [];

    this.removeNode(this.tail);
    this.cache.delete(key);
    this.removeFromTagIndex(key, tags);
    this.evictions++;
  }

  // ===== Tag Index Management =====

  private updateTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
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

/**
 * Global memory cache instance
 */
export const memoryCache = new MemoryCache(1000, 300000); // 1000 items, 5 min stale time
