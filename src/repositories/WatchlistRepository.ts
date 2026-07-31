// @ts-nocheck
/**
 * Watchlist Repository - Single Source of Truth
 * 
 * Architecture:
 * - UI never talks directly to IndexedDB or Firestore
 * - All operations go through this repository
 * - Handles offline queue, sync, conflict resolution
 * - Implements optimistic updates with rollback
 */

import { getDB, getDeviceId, getLastSyncTime, updateLastSyncTime } from '@/lib/db/indexedDB';
import {
  notifyWatchlistAdded,
  notifyWatchlistRemoved,
  notifyWatchlistSynced,
  notifySyncStarted,
  notifySyncCompleted,
} from '@/lib/sync/broadcastChannel';
import {
  validateWatchlistResponse,
  validateBatchSyncResponse,
  type WatchlistItem,
  type SyncOperation,
} from '@/lib/validation/schemas';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository Result type for error handling
 */
type RepositoryResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Watchlist Repository Class
 */
class WatchlistRepositoryClass {
  private userId: string | null = null;
  private syncInProgress: boolean = false;

  /**
   * Initialize repository with user ID
   */
  public async initialize(userId: string): Promise<void> {
    this.userId = userId;
  }

  /**
   * Get current watchlist from IndexedDB
   */
  public async getWatchlist(): Promise<WatchlistItem[]> {
    try {
      const db = await getDB();
      const items = await db.getAll('watchlist');
      
      // Sort by addedAt descending (newest first)
      return items.sort((a, b) => b.addedAt - a.addedAt);
    } catch (error) {
      console.error('Error fetching watchlist from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Get watchlist movie IDs only (fast check)
   */
  public async getWatchlistIds(): Promise<Set<number>> {
    try {
      const items = await this.getWatchlist();
      return new Set(items.map(item => item.movieId));
    } catch (error) {
      console.error('Error fetching watchlist IDs:', error);
      return new Set();
    }
  }

  /**
   * Check if movie is in watchlist
   */
  public async isInWatchlist(movieId: number): Promise<boolean> {
    try {
      const db = await getDB();
      const item = await db.get('watchlist', movieId);
      return !!item;
    } catch (error) {
      console.error('Error checking watchlist:', error);
      return false;
    }
  }

  /**
   * Add movie to watchlist (optimistic)
   */
  public async addMovie(movieId: number): Promise<RepositoryResult<void>> {
    try {
      const db = await getDB();
      const deviceId = await getDeviceId();
      const timestamp = Date.now();

      // Check if already in watchlist
      const existing = await db.get('watchlist', movieId);
      if (existing) {
        return { success: true, data: undefined };
      }

      // Add to IndexedDB (optimistic)
      const item: WatchlistItem = {
        movieId,
        addedAt: timestamp,
        lastModified: timestamp,
        deviceId,
      };

      await db.put('watchlist', item);

      // Notify other tabs
      notifyWatchlistAdded(movieId);

      // Queue for background sync
      await this.queueOfflineAction('add', movieId, timestamp);

      // Trigger sync if online
      if (this.isOnline()) {
        this.syncPendingActions().catch(console.error);
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove movie from watchlist (optimistic)
   */
  public async removeMovie(movieId: number): Promise<RepositoryResult<void>> {
    try {
      const db = await getDB();
      const deviceId = await getDeviceId();
      const timestamp = Date.now();

      // Check if exists
      const existing = await db.get('watchlist', movieId);
      if (!existing) {
        return { success: true, data: undefined };
      }

      // Remove from IndexedDB (optimistic)
      await db.delete('watchlist', movieId);

      // Notify other tabs
      notifyWatchlistRemoved(movieId);

      // Queue for background sync
      await this.queueOfflineAction('remove', movieId, timestamp);

      // Trigger sync if online
      if (this.isOnline()) {
        this.syncPendingActions().catch(console.error);
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Toggle movie in watchlist
   */
  public async toggleMovie(movieId: number): Promise<RepositoryResult<'added' | 'removed'>> {
    const inWatchlist = await this.isInWatchlist(movieId);
    
    if (inWatchlist) {
      const result = await this.removeMovie(movieId);
      return result.success 
        ? { success: true, data: 'removed' }
        : result;
    } else {
      const result = await this.addMovie(movieId);
      return result.success 
        ? { success: true, data: 'added' }
        : result;
    }
  }

  /**
   * Queue action for offline sync
   */
  private async queueOfflineAction(
    action: 'add' | 'remove',
    movieId: number,
    timestamp: number
  ): Promise<void> {
    if (!this.userId) {
      throw new Error('User not initialized');
    }

    try {
      const db = await getDB();
      const id = uuidv4();

      await db.put('offlineQueue', {
        id,
        action,
        movieId,
        timestamp,
        userId: this.userId,
        retryCount: 0,
      });
    } catch (error) {
      console.error('Error queueing offline action:', error);
    }
  }

  /**
   * Sync pending actions with server
   */
  public async syncPendingActions(): Promise<RepositoryResult<number>> {
    // Prevent concurrent syncs
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    if (!this.userId) {
      return { success: false, error: 'User not initialized' };
    }

    if (!this.isOnline()) {
      return { success: false, error: 'Offline' };
    }

    try {
      this.syncInProgress = true;
      notifySyncStarted();

      const db = await getDB();
      const queue = await db.getAll('offlineQueue');

      if (queue.length === 0) {
        notifySyncCompleted(true);
        return { success: true, data: 0 };
      }

      // Prepare batch sync operations
      const deviceId = await getDeviceId();
      const operations: SyncOperation[] = queue.map(item => ({
        id: item.id,
        action: item.action,
        movieId: item.movieId,
        timestamp: item.timestamp,
        deviceId,
      }));

      // Send to server
      const response = await this.sendBatchSync(operations);

      if (!response.success) {
        throw new Error('Batch sync failed');
      }

      const syncResponse = validateBatchSyncResponse(response.data);

      // Remove successfully processed items from queue
      const successfulIds = operations
        .filter(op => !syncResponse.failed.includes(op.id))
        .map(op => op.id);

      const tx = db.transaction('offlineQueue', 'readwrite');
      for (const id of successfulIds) {
        await tx.store.delete(id);
      }
      await tx.done;

      // Update last sync time
      await updateLastSyncTime(Date.now());

      notifySyncCompleted(true);

      return { success: true, data: syncResponse.processed };
    } catch (error) {
      console.error('Error syncing pending actions:', error);
      notifySyncCompleted(false);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Rollback failed action
   */
  public async rollbackAction(movieId: number, action: 'add' | 'remove'): Promise<void> {
    try {
      const db = await getDB();

      if (action === 'add') {
        // Rollback add = remove from local
        await db.delete('watchlist', movieId);
        notifyWatchlistRemoved(movieId);
      } else {
        // Rollback remove = add back to local
        const deviceId = await getDeviceId();
        const timestamp = Date.now();
        
        await db.put('watchlist', {
          movieId,
          addedAt: timestamp,
          lastModified: timestamp,
          deviceId,
        });
        
        notifyWatchlistAdded(movieId);
      }
    } catch (error) {
      console.error('Error rolling back action:', error);
    }
  }

  /**
   * Fetch watchlist from server and merge (conflict resolution)
   */
  public async fetchAndMergeFromServer(): Promise<RepositoryResult<void>> {
    if (!this.userId) {
      return { success: false, error: 'User not initialized' };
    }

    if (!this.isOnline()) {
      return { success: false, error: 'Offline' };
    }

    try {
      const response = await this.fetchWatchlistFromServer();
      
      if (!response.success) {
        throw new Error('Failed to fetch watchlist from server');
      }

      const serverData = validateWatchlistResponse(response.data);
      const db = await getDB();
      const localItems = await this.getWatchlist();
      const deviceId = await getDeviceId();

      // Last-Write-Wins conflict resolution
      const merged = new Map<number, WatchlistItem>();

      // Add local items to map
      localItems.forEach(item => {
        merged.set(item.movieId, item);
      });

      // Merge server items (server wins if timestamp is newer)
      if (serverData.items) {
        serverData.items.forEach(serverItem => {
          const localItem = merged.get(serverItem.movieId);
          
          if (!localItem || serverItem.lastModified > localItem.lastModified) {
            merged.set(serverItem.movieId, serverItem);
          }
        });
      }

      // Clear and rebuild watchlist
      await db.clear('watchlist');
      
      const tx = db.transaction('watchlist', 'readwrite');
      const items = Array.from(merged.values());
      for (const item of items) {
        await tx.store.put(item);
      }
      await tx.done;

      // Notify other tabs
      notifyWatchlistSynced(Array.from(merged.keys()));

      await updateLastSyncTime(Date.now());

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error fetching and merging watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Merge failed'
      };
    }
  }

  /**
   * Check online status
   */
  private isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }

  /**
   * Send batch sync to server
   */
  private async sendBatchSync(operations: SyncOperation[]): Promise<{ success: boolean; data: any }> {
    try {
      const deviceId = await getDeviceId();
      
      const response = await fetch('/api/watchlist/batch-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId || 'anonymous',
        },
        body: JSON.stringify({
          operations,
          deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Repository] Batch sync request failed:', error);
      return {
        success: false,
        data: null,
      };
    }
  }

  /**
   * Fetch watchlist from server
   */
  private async fetchWatchlistFromServer(): Promise<{ success: boolean; data: any }> {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId || 'anonymous',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Repository] Fetch watchlist request failed:', error);
      return {
        success: false,
        data: null,
      };
    }
  }

  /**
   * Clear all watchlist data (for testing)
   */
  public async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('watchlist');
    await db.clear('offlineQueue');
    notifyWatchlistSynced([]);
  }
}

// Singleton instance
export const WatchlistRepository = new WatchlistRepositoryClass();

// Export for dependency injection if needed
export default WatchlistRepository;

