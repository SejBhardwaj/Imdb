/**
 * Theme Synchronization Layer
 * 
 * Handles:
 * - Cross-device sync via SSE
 * - Cross-tab sync via BroadcastChannel
 * - Database persistence
 * - Conflict resolution
 */

import type { ThemeConfig } from './types';
import { THEME_STORAGE, DEBOUNCE_DELAYS } from './constants';

export interface SyncManager {
  connect(userId: string, deviceId: string): void;
  disconnect(): void;
  syncToDatabase(config: Partial<ThemeConfig>): Promise<void>;
  onRemoteUpdate(callback: (config: Partial<ThemeConfig>) => void): void;
}

class ThemeSyncManager implements SyncManager {
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private updateCallbacks: Set<(config: Partial<ThemeConfig>) => void> = new Set();
  private syncTimeout: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private deviceId: string | null = null;

  /**
   * Connect to sync services
   */
  connect(userId: string, deviceId: string): void {
    this.userId = userId;
    this.deviceId = deviceId;

    // Setup SSE for cross-device sync
    this.setupSSE(userId);

    // Setup BroadcastChannel for cross-tab sync
    this.setupBroadcastChannel();
  }

  /**
   * Disconnect from sync services
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    this.updateCallbacks.clear();
    this.userId = null;
    this.deviceId = null;
  }

  /**
   * Setup Server-Sent Events for cross-device sync
   */
  private setupSSE(userId: string): void {
    if (typeof EventSource === 'undefined') {
      console.warn('EventSource not supported');
      return;
    }

    try {
      this.eventSource = new EventSource(
        `/api/user/preferences/theme/sync?userId=${userId}`,
        { withCredentials: true }
      );

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'theme_update') {
            // Ignore updates from this device
            if (data.sourceDeviceId === this.deviceId) {
              return;
            }

            // Notify listeners
            this.notifyListeners(data.preferences);
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        
        // Attempt reconnection after delay
        setTimeout(() => {
          if (this.userId) {
            this.setupSSE(this.userId);
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to setup SSE:', error);
    }
  }

  /**
   * Setup BroadcastChannel for cross-tab sync
   */
  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel not supported');
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel(THEME_STORAGE.COOKIE_NAME);

      this.broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'theme_update') {
          // Ignore updates from this tab
          if (event.data.deviceId === this.deviceId) {
            return;
          }

          this.notifyListeners(event.data.preferences);
        }
      };
    } catch (error) {
      console.error('Failed to setup BroadcastChannel:', error);
    }
  }

  /**
   * Sync theme to database with debouncing
   */
  async syncToDatabase(config: Partial<ThemeConfig>): Promise<void> {
    if (!this.userId) {
      console.warn('Cannot sync to database: user not authenticated');
      return;
    }

    // Clear pending sync
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    // Debounce database writes
    return new Promise((resolve, reject) => {
      this.syncTimeout = setTimeout(async () => {
        try {
          const response = await fetch('/api/user/preferences/theme', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': this.userId!,
              'X-Device-Id': this.deviceId || 'unknown',
            },
            body: JSON.stringify(config),
          });

          if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`);
          }

          // Broadcast to other tabs
          this.broadcastToTabs(config);

          resolve();
        } catch (error) {
          console.error('Database sync failed:', error);
          reject(error);
        }
      }, DEBOUNCE_DELAYS.DATABASE_SYNC);
    });
  }

  /**
   * Broadcast update to other tabs
   */
  private broadcastToTabs(config: Partial<ThemeConfig>): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'theme_update',
        preferences: config,
        deviceId: this.deviceId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Register callback for remote updates
   */
  onRemoteUpdate(callback: (config: Partial<ThemeConfig>) => void): void {
    this.updateCallbacks.add(callback);
  }

  /**
   * Notify all listeners of update
   */
  private notifyListeners(config: Partial<ThemeConfig>): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(config);
      } catch (error) {
        console.error('Update callback failed:', error);
      }
    }
  }

  /**
   * Get device ID (create if doesn't exist)
   */
  static getDeviceId(): string {
    const key = 'theme-device-id';
    
    try {
      let deviceId = localStorage.getItem(key);
      
      if (!deviceId) {
        deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(key, deviceId);
      }
      
      return deviceId;
    } catch {
      // Fallback if localStorage unavailable
      return `temp-${Date.now()}`;
    }
  }
}

export const themeSyncManager = new ThemeSyncManager();

/**
 * Conflict resolution strategy
 * When local and remote themes differ, decide which wins
 */
export function resolveThemeConflict(
  local: Partial<ThemeConfig> & { updatedAt?: Date },
  remote: Partial<ThemeConfig> & { updatedAt?: Date }
): Partial<ThemeConfig> {
  // Most recent wins (last-write-wins)
  if (local.updatedAt && remote.updatedAt) {
    return local.updatedAt > remote.updatedAt ? local : remote;
  }

  // If only one has timestamp, prefer that one
  if (local.updatedAt) return local;
  if (remote.updatedAt) return remote;

  // Fallback: prefer remote (server is source of truth)
  return remote;
}

/**
 * Generate unique device identifier
 */
export function generateDeviceId(): string {
  return ThemeSyncManager.getDeviceId();
}
