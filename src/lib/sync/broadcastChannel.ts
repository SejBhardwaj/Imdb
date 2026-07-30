/**
 * Cross-tab synchronization using BroadcastChannel API
 * Ensures watchlist changes in one tab immediately reflect in all open tabs
 */

type WatchlistMessage = 
  | { type: 'WATCHLIST_ADDED'; movieId: number; timestamp: number }
  | { type: 'WATCHLIST_REMOVED'; movieId: number; timestamp: number }
  | { type: 'WATCHLIST_SYNCED'; movieIds: number[]; timestamp: number }
  | { type: 'OFFLINE_QUEUE_UPDATED'; queueSize: number }
  | { type: 'SYNC_STARTED' }
  | { type: 'SYNC_COMPLETED'; success: boolean; timestamp: number };

type MessageHandler = (message: WatchlistMessage) => void;

const CHANNEL_NAME = 'imdb_watchlist_sync';

class WatchlistBroadcast {
  private channel: BroadcastChannel | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private isSupported: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Check BroadcastChannel support
    if ('BroadcastChannel' in window) {
      this.isSupported = true;
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.setupListener();
    } else {
      console.warn('BroadcastChannel API not supported. Cross-tab sync disabled.');
    }
  }

  private setupListener(): void {
    if (!this.channel) return;

    this.channel.onmessage = (event: MessageEvent<WatchlistMessage>) => {
      // Notify all registered handlers
      this.handlers.forEach((handler) => {
        try {
          handler(event.data);
        } catch (error) {
          console.error('Error in broadcast message handler:', error);
        }
      });
    };

    this.channel.onmessageerror = (event) => {
      console.error('BroadcastChannel message error:', event);
    };
  }

  /**
   * Subscribe to watchlist change messages
   */
  public subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Broadcast a message to all other tabs
   */
  public postMessage(message: WatchlistMessage): void {
    if (!this.isSupported || !this.channel) {
      return;
    }

    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('Error posting message to BroadcastChannel:', error);
    }
  }

  /**
   * Close the channel
   */
  public close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.handlers.clear();
  }

  /**
   * Check if BroadcastChannel is supported
   */
  public get supported(): boolean {
    return this.isSupported;
  }
}

// Singleton instance
export const watchlistBroadcast = new WatchlistBroadcast();

// Convenience methods
export function notifyWatchlistAdded(movieId: number): void {
  watchlistBroadcast.postMessage({
    type: 'WATCHLIST_ADDED',
    movieId,
    timestamp: Date.now(),
  });
}

export function notifyWatchlistRemoved(movieId: number): void {
  watchlistBroadcast.postMessage({
    type: 'WATCHLIST_REMOVED',
    movieId,
    timestamp: Date.now(),
  });
}

export function notifyWatchlistSynced(movieIds: number[]): void {
  watchlistBroadcast.postMessage({
    type: 'WATCHLIST_SYNCED',
    movieIds,
    timestamp: Date.now(),
  });
}

export function notifySyncStarted(): void {
  watchlistBroadcast.postMessage({
    type: 'SYNC_STARTED',
  });
}

export function notifySyncCompleted(success: boolean): void {
  watchlistBroadcast.postMessage({
    type: 'SYNC_COMPLETED',
    success,
    timestamp: Date.now(),
  });
}

export function subscribeToWatchlistChanges(handler: MessageHandler): () => void {
  return watchlistBroadcast.subscribe(handler);
}
