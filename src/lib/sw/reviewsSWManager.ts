/**
 * Service Worker Manager for Reviews
 * 
 * Handles:
 * - SW registration
 * - Background sync triggers
 * - Connection status monitoring
 */

export class ReviewsSWManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline: boolean = true;

  /**
   * Register service worker
   */
  async register(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[Reviews SW] Service Worker not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw-reviews.js', {
        scope: '/',
      });

      console.log('[Reviews SW] Registered successfully');

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        console.log('[Reviews SW] Update found');
      });

      // Setup sync on network reconnect
      this.setupNetworkListener();

      // Setup message listener
      this.setupMessageListener();
    } catch (error) {
      console.error('[Reviews SW] Registration failed:', error);
    }
  }

  /**
   * Setup network status listener
   */
  private setupNetworkListener(): void {
    window.addEventListener('online', () => {
      console.log('[Reviews SW] Network reconnected');
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('[Reviews SW] Network disconnected');
      this.isOnline = false;
    });

    this.isOnline = navigator.onLine;
  }

  /**
   * Setup message listener for SW messages
   */
  private setupMessageListener(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[Reviews SW] Message from SW:', event.data);

      if (event.data.type === 'SYNC_COMPLETE') {
        // Notify app that sync completed
        window.dispatchEvent(new CustomEvent('reviews-synced', {
          detail: { count: event.data.count },
        }));
      }
    });
  }

  /**
   * Trigger background sync
   */
  async triggerSync(): Promise<boolean> {
    if (!this.registration) {
      console.warn('[Reviews SW] Cannot sync: not registered');
      return false;
    }

    // Check if Background Sync is supported
    if (!('sync' in this.registration)) {
      console.warn('[Reviews SW] Background Sync not supported');
      // Fallback to manual sync
      return this.manualSync();
    }

    try {
      const syncManager = (this.registration as any).sync;
      await syncManager.register('sync-reviews');
      console.log('[Reviews SW] Background sync registered');
      return true;
    } catch (error) {
      console.error('[Reviews SW] Background sync registration failed:', error);
      return this.manualSync();
    }
  }

  /**
   * Manual sync fallback (send message to SW)
   */
  private async manualSync(): Promise<boolean> {
    if (!navigator.serviceWorker.controller) {
      console.warn('[Reviews SW] Cannot manual sync: no controller');
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'SYNC_NOW' },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Check if online
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<void> {
    if (this.registration) {
      await this.registration.unregister();
      console.log('[Reviews SW] Unregistered');
    }
  }
}

// Singleton instance
export const reviewsSWManager = new ReviewsSWManager();

/**
 * Initialize service worker (call in app root)
 */
export async function initializeReviewsSW(): Promise<void> {
  if (typeof window !== 'undefined') {
    await reviewsSWManager.register();
  }
}
