/**
 * Service Worker Registration
 * 
 * Registers the service worker and sets up:
 * - Background Sync API
 * - Periodic Sync (if supported)
 * - Message handling
 * - Update detection
 */

type ServiceWorkerMessage = 
  | { type: 'SYNC_COMPLETED'; success: boolean; processed: number; failed: number }
  | { type: 'SYNC_FAILED'; error: string }
  | { type: 'UPDATE_AVAILABLE' };

type MessageHandler = (message: ServiceWorkerMessage) => void;

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private isSupported: boolean = false;

  constructor() {
    this.checkSupport();
  }

  /**
   * Check if Service Worker is supported
   */
  private checkSupport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isSupported = 'serviceWorker' in navigator;

    if (!this.isSupported) {
      console.warn('Service Worker not supported in this browser');
    }
  }

  /**
   * Register service worker
   */
  public async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Cannot register Service Worker: not supported');
      return false;
    }

    try {
      console.log('[SW Manager] Registering service worker...');

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW Manager] Service worker registered:', this.registration.scope);

      // Set up listeners
      this.setupListeners();

      // Check for updates
      this.checkForUpdates();

      // Register background sync
      await this.registerBackgroundSync();

      // Register periodic sync (if supported)
      await this.registerPeriodicSync();

      return true;
    } catch (error) {
      console.error('[SW Manager] Service worker registration failed:', error);
      return false;
    }
  }

  /**
   * Set up event listeners
   */
  private setupListeners(): void {
    if (!this.registration) return;

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW Manager] Message from service worker:', event.data);

      // Notify all handlers
      this.handlers.forEach((handler) => {
        try {
          handler(event.data);
        } catch (error) {
          console.error('[SW Manager] Error in message handler:', error);
        }
      });
    });

    // Listen for service worker updates
    this.registration.addEventListener('updatefound', () => {
      console.log('[SW Manager] Service worker update found');

      const newWorker = this.registration!.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW Manager] New service worker available');
            
            // Notify about update
            this.handlers.forEach(handler => {
              try {
                handler({ type: 'UPDATE_AVAILABLE' });
              } catch (error) {
                console.error('[SW Manager] Error notifying update:', error);
              }
            });
          }
        });
      }
    });

    // Listen for controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Manager] Service worker controller changed');
      
      // Reload page to use new service worker
      if (this.shouldReloadOnUpdate()) {
        window.location.reload();
      }
    });
  }

  /**
   * Register background sync
   */
  private async registerBackgroundSync(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    // Check if Background Sync is supported
    if (!('sync' in this.registration)) {
      console.warn('[SW Manager] Background Sync API not supported');
      return false;
    }

    try {
      await this.registration.sync.register('sync-watchlist');
      console.log('[SW Manager] Background sync registered');
      return true;
    } catch (error) {
      console.error('[SW Manager] Background sync registration failed:', error);
      return false;
    }
  }

  /**
   * Register periodic sync (if supported)
   */
  private async registerPeriodicSync(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    // Check if Periodic Sync is supported
    if (!('periodicSync' in this.registration)) {
      console.warn('[SW Manager] Periodic Sync API not supported');
      return false;
    }

    try {
      const status = await navigator.permissions.query({
        // @ts-ignore - periodicSync not in types yet
        name: 'periodic-background-sync',
      });

      if (status.state === 'granted') {
        // @ts-ignore
        await this.registration.periodicSync.register('periodic-watchlist-sync', {
          minInterval: 12 * 60 * 60 * 1000, // 12 hours
        });
        console.log('[SW Manager] Periodic sync registered (every 12 hours)');
        return true;
      } else {
        console.warn('[SW Manager] Periodic sync permission not granted');
        return false;
      }
    } catch (error) {
      console.warn('[SW Manager] Periodic sync not supported:', error);
      return false;
    }
  }

  /**
   * Manually trigger sync
   */
  public async syncNow(): Promise<void> {
    if (!this.registration) {
      console.warn('[SW Manager] Cannot sync: service worker not registered');
      return;
    }

    // Try Background Sync API first
    if ('sync' in this.registration) {
      try {
        await this.registration.sync.register('sync-watchlist');
        console.log('[SW Manager] Manual sync triggered via Background Sync API');
        return;
      } catch (error) {
        console.warn('[SW Manager] Background Sync failed, falling back to postMessage');
      }
    }

    // Fallback: send message to service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_NOW',
      });
      console.log('[SW Manager] Manual sync triggered via postMessage');
    }
  }

  /**
   * Subscribe to service worker messages
   */
  public subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Check for service worker updates
   */
  public async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      await this.registration.update();
      console.log('[SW Manager] Update check completed');
    } catch (error) {
      console.error('[SW Manager] Update check failed:', error);
    }
  }

  /**
   * Unregister service worker
   */
  public async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const success = await this.registration.unregister();
      console.log('[SW Manager] Service worker unregistered:', success);
      this.registration = null;
      this.handlers.clear();
      return success;
    } catch (error) {
      console.error('[SW Manager] Service worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Skip waiting and activate new service worker immediately
   */
  public skipWaiting(): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SKIP_WAITING',
      });
    }
  }

  /**
   * Check if page should reload when new service worker activates
   */
  private shouldReloadOnUpdate(): boolean {
    // Don't reload if user is typing or has unsaved changes
    // Implement custom logic here if needed
    return false; // Default: don't auto-reload
  }

  /**
   * Get current registration
   */
  public getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if service worker is active
   */
  public isActive(): boolean {
    return !!(this.registration && this.registration.active);
  }

  /**
   * Get support status
   */
  public get supported(): boolean {
    return this.isSupported;
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

/**
 * Initialize service worker (call this in app initialization)
 */
export async function initServiceWorker(): Promise<boolean> {
  // Only register in production or when explicitly enabled
  const shouldRegister = 
    process.env.NODE_ENV === 'production' || 
    process.env.NEXT_PUBLIC_SW_ENABLED === 'true';

  if (!shouldRegister) {
    console.log('[SW Manager] Service worker disabled in development');
    return false;
  }

  return await serviceWorkerManager.register();
}

/**
 * Hook-friendly API
 */
export function useServiceWorker() {
  return {
    register: () => serviceWorkerManager.register(),
    syncNow: () => serviceWorkerManager.syncNow(),
    subscribe: (handler: MessageHandler) => serviceWorkerManager.subscribe(handler),
    checkForUpdates: () => serviceWorkerManager.checkForUpdates(),
    unregister: () => serviceWorkerManager.unregister(),
    skipWaiting: () => serviceWorkerManager.skipWaiting(),
    isActive: () => serviceWorkerManager.isActive(),
    supported: serviceWorkerManager.supported,
  };
}

export default serviceWorkerManager;
