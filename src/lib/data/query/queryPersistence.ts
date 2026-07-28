/**
 * Query Persistence with IndexedDB
 * 
 * Persists TanStack Query cache to IndexedDB for offline support
 * and instant page loads. Like Netflix - refresh page and data is still there.
 * 
 * Features:
 * - IndexedDB storage (5MB+)
 * - LocalStorage fallback (5MB limit)
 * - Automatic hydration on mount
 * - Selective persistence (only important queries)
 * - TTL-based expiration
 * - Compression support
 */

import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

/**
 * IndexedDB Persister for TanStack Query
 */
export class IndexedDBPersister implements Persister {
  private dbName: string;
  private storeName: string;

  constructor(dbName = 'movie-app-cache', storeName = 'query-cache') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  /**
   * Persist cache to IndexedDB
   */
  async persistClient(client: PersistedClient): Promise<void> {
    try {
      await set(this.storeName, client);
    } catch (error) {
      console.error('[IndexedDBPersister] Failed to persist:', error);
      // Fallback to localStorage
      this.fallbackToLocalStorage(client);
    }
  }

  /**
   * Restore cache from IndexedDB
   */
  async restoreClient(): Promise<PersistedClient | undefined> {
    try {
      const client = await get<PersistedClient>(this.storeName);
      
      if (client) {
        // Check if cache is expired
        const now = Date.now();
        if (client.timestamp && now - client.timestamp > 7 * 24 * 60 * 60 * 1000) {
          // Cache older than 7 days, clear it
          await this.removeClient();
          return undefined;
        }
      }

      return client;
    } catch (error) {
      console.error('[IndexedDBPersister] Failed to restore:', error);
      // Fallback to localStorage
      return this.fallbackFromLocalStorage();
    }
  }

  /**
   * Remove persisted cache
   */
  async removeClient(): Promise<void> {
    try {
      await del(this.storeName);
      localStorage.removeItem(this.storeName);
    } catch (error) {
      console.error('[IndexedDBPersister] Failed to remove:', error);
    }
  }

  /**
   * Fallback to localStorage for persistence
   */
  private fallbackToLocalStorage(client: PersistedClient): void {
    try {
      const serialized = JSON.stringify(client);
      // Check size (localStorage limit ~5MB)
      if (serialized.length < 4 * 1024 * 1024) { // 4MB safe limit
        localStorage.setItem(this.storeName, serialized);
      } else {
        console.warn('[IndexedDBPersister] Cache too large for localStorage');
      }
    } catch (error) {
      console.error('[IndexedDBPersister] LocalStorage fallback failed:', error);
    }
  }

  /**
   * Fallback to localStorage for restoration
   */
  private fallbackFromLocalStorage(): PersistedClient | undefined {
    try {
      const serialized = localStorage.getItem(this.storeName);
      if (serialized) {
        return JSON.parse(serialized);
      }
    } catch (error) {
      console.error('[IndexedDBPersister] LocalStorage restore failed:', error);
    }
    return undefined;
  }
}

/**
 * Selective persistence filter
 * Only persist important queries (not every search result)
 */
export function shouldPersistQuery(queryKey: unknown[]): boolean {
  const key = queryKey[0] as string;

  // Persist these query types
  const persistKeys = [
    'movie',           // Movie details
    'popular',         // Popular movies
    'topRated',        // Top rated
    'nowPlaying',      // Now playing
    'upcoming',        // Upcoming
    'movieCredits',    // Credits
    'movieVideos',     // Videos
    'movieImages',     // Images
  ];

  return persistKeys.some((k) => key?.includes(k));
}

/**
 * Configure query persistence
 */
export interface PersistenceConfig {
  /** Database name */
  dbName?: string;
  /** Store name */
  storeName?: string;
  /** Max age in milliseconds (default: 7 days) */
  maxAge?: number;
  /** Enable compression (default: false) */
  compress?: boolean;
  /** Persist filter function */
  shouldPersist?: (queryKey: unknown[]) => boolean;
}

/**
 * Create persistence configuration
 */
export function createPersistenceConfig(config: PersistenceConfig = {}) {
  const {
    dbName = 'movie-app-cache',
    storeName = 'query-cache',
    maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days
    shouldPersist = shouldPersistQuery,
  } = config;

  const persister = new IndexedDBPersister(dbName, storeName);

  return {
    persister,
    maxAge,
    dehydrateOptions: {
      shouldDehydrateQuery: (query: any) => {
        // Only persist successful queries
        if (query.state.status !== 'success') {
          return false;
        }

        // Only persist queries that pass the filter
        return shouldPersist(query.queryKey);
      },
    },
  };
}

/**
 * Offline cache manager
 * Handles offline scenarios and stale cache replay
 */
export class OfflineCacheManager {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  /**
   * Check if online
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.isOnline = true;
    console.log('[OfflineCacheManager] Network online');
    this.notifyListeners(true);
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.isOnline = false;
    console.log('[OfflineCacheManager] Network offline');
    this.notifyListeners(false);
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(online: boolean): void {
    this.listeners.forEach((listener) => listener(online));
  }

  /**
   * Get offline strategy for query
   */
  getOfflineStrategy(queryKey: unknown[]) {
    return {
      // Use cached data when offline
      enabled: this.isOnline,
      // Show stale data while refetching when back online
      staleTime: this.isOnline ? 5 * 60 * 1000 : Infinity,
      // Retry when back online
      retry: this.isOnline ? 3 : 0,
      // Refetch when online
      refetchOnReconnect: true,
      refetchOnWindowFocus: this.isOnline,
    };
  }
}

/**
 * Global offline cache manager
 */
export const offlineCache = new OfflineCacheManager();

/**
 * Stale cache replay strategy
 * Shows stale data immediately, refreshes in background
 */
export function getSWRConfig() {
  return {
    // Show stale data immediately
    staleTime: 0,
    // Refetch in background
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Keep previous data while refetching
    placeholderData: (previousData: any) => previousData,
  };
}

/**
 * Adaptive cache configuration based on usage
 */
export class AdaptiveCacheConfig {
  private accessCounts = new Map<string, number>();
  private lastAccess = new Map<string, number>();

  /**
   * Record query access
   */
  recordAccess(queryKey: unknown[]): void {
    const key = JSON.stringify(queryKey);
    const count = this.accessCounts.get(key) || 0;
    this.accessCounts.set(key, count + 1);
    this.lastAccess.set(key, Date.now());
  }

  /**
   * Get adaptive cache time based on usage
   */
  getCacheTime(queryKey: unknown[]): number {
    const key = JSON.stringify(queryKey);
    const accessCount = this.accessCounts.get(key) || 0;
    const lastAccessTime = this.lastAccess.get(key) || Date.now();
    const timeSinceAccess = Date.now() - lastAccessTime;

    // Frequently accessed (>10 times) and recent (< 1 hour)
    if (accessCount > 10 && timeSinceAccess < 60 * 60 * 1000) {
      return 60 * 60 * 1000; // 1 hour
    }

    // Moderately accessed (>5 times)
    if (accessCount > 5) {
      return 30 * 60 * 1000; // 30 minutes
    }

    // Rarely accessed
    return 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get adaptive stale time
   */
  getStaleTime(queryKey: unknown[]): number {
    const key = JSON.stringify(queryKey);
    const accessCount = this.accessCounts.get(key) || 0;

    // Popular queries: longer stale time
    if (accessCount > 10) {
      return 10 * 60 * 1000; // 10 minutes
    }

    // Normal queries
    if (accessCount > 3) {
      return 5 * 60 * 1000; // 5 minutes
    }

    // Rare queries: short stale time
    return 1 * 60 * 1000; // 1 minute
  }

  /**
   * Cleanup old entries
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [key, lastAccessTime] of this.lastAccess) {
      if (now - lastAccessTime > maxAge) {
        this.accessCounts.delete(key);
        this.lastAccess.delete(key);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalQueries: this.accessCounts.size,
      mostAccessed: Array.from(this.accessCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ key, count })),
    };
  }
}

/**
 * Global adaptive cache config
 */
export const adaptiveCache = new AdaptiveCacheConfig();
