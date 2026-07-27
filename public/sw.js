/**
 * Service Worker for Offline-First Watchlist
 * 
 * Responsibilities:
 * - Background Sync API for automatic sync when online
 * - Auto-sync on reconnect
 * - Retry failed sync operations
 */

const CACHE_NAME = 'imdb-offline-v1';
const DB_NAME = 'imdb-offline-db';
const SYNC_TAG = 'sync-watchlist';

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    // Claim all clients immediately
    clients.claim()
  );
});

/**
 * Background Sync - Triggered when device comes back online
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncWatchlist());
  }
});

/**
 * Sync watchlist with server
 */
async function syncWatchlist() {
  try {
    console.log('[Service Worker] Starting watchlist sync...');
    
    // Open IndexedDB
    const db = await openIndexedDB();
    
    // Get offline queue
    const queue = await getAllFromStore(db, 'offlineQueue');
    
    if (queue.length === 0) {
      console.log('[Service Worker] No pending operations to sync');
      return;
    }
    
    console.log(`[Service Worker] Syncing ${queue.length} operations...`);
    
    // Prepare batch sync payload
    const operations = queue.map(item => ({
      id: item.id,
      action: item.action,
      movieId: item.movieId,
      timestamp: item.timestamp,
      deviceId: item.deviceId || 'unknown',
    }));
    
    // Send to server
    const response = await fetch('/api/watchlist/batch-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operations }),
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    // Remove successfully synced items from queue
    const successfulIds = operations
      .filter(op => !result.failed?.includes(op.id))
      .map(op => op.id);
    
    if (successfulIds.length > 0) {
      await removeFromQueue(db, successfulIds);
      console.log(`[Service Worker] Synced ${successfulIds.length} operations successfully`);
    }
    
    if (result.failed && result.failed.length > 0) {
      console.warn(`[Service Worker] ${result.failed.length} operations failed to sync`);
      
      // Increment retry count for failed items
      await incrementRetryCount(db, result.failed);
    }
    
    // Notify all clients about sync completion
    await notifyClients({
      type: 'SYNC_COMPLETED',
      success: true,
      processed: successfulIds.length,
      failed: result.failed?.length || 0,
    });
    
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    
    // Notify clients about failure
    await notifyClients({
      type: 'SYNC_FAILED',
      error: error.message,
    });
    
    // Re-throw to trigger retry
    throw error;
  }
}

/**
 * Open IndexedDB connection
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Watchlist store
      if (!db.objectStoreNames.contains('watchlist')) {
        const watchlistStore = db.createObjectStore('watchlist', { keyPath: 'movieId' });
        watchlistStore.createIndex('addedAt', 'addedAt');
        watchlistStore.createIndex('lastModified', 'lastModified');
      }
      
      // Offline queue store
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp');
        queueStore.createIndex('userId', 'userId');
      }
      
      // Movie cache store
      if (!db.objectStoreNames.contains('movieCache')) {
        const cacheStore = db.createObjectStore('movieCache', { keyPath: 'movieId' });
        cacheStore.createIndex('cachedAt', 'cachedAt');
      }
      
      // Sync metadata store
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get all items from an object store
 */
function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove items from offline queue
 */
function removeFromQueue(db, ids) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offlineQueue', 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    
    ids.forEach(id => {
      store.delete(id);
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Increment retry count for failed items
 */
function incrementRetryCount(db, ids) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offlineQueue', 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    
    const promises = ids.map(id => {
      return new Promise((res, rej) => {
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const item = getRequest.result;
          if (item) {
            item.retryCount = (item.retryCount || 0) + 1;
            
            // Max 5 retries
            if (item.retryCount < 5) {
              store.put(item);
            } else {
              console.warn(`[Service Worker] Max retries reached for operation ${id}`);
              store.delete(id); // Remove after max retries
            }
          }
          res();
        };
        
        getRequest.onerror = () => rej(getRequest.error);
      });
    });
    
    Promise.all(promises).then(resolve).catch(reject);
  });
}

/**
 * Notify all clients about sync events
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  
  clients.forEach(client => {
    client.postMessage(message);
  });
}

/**
 * Listen for messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    // Manual sync trigger from UI
    event.waitUntil(syncWatchlist());
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Periodic Background Sync (if supported)
 * Syncs watchlist every 12 hours
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-watchlist-sync') {
    console.log('[Service Worker] Periodic sync triggered');
    event.waitUntil(syncWatchlist());
  }
});

/**
 * Listen for online event
 * Automatically trigger sync when device comes back online
 */
self.addEventListener('online', () => {
  console.log('[Service Worker] Device is online, triggering sync...');
  
  // Register sync (will execute when possible)
  if (self.registration.sync) {
    self.registration.sync.register(SYNC_TAG)
      .then(() => console.log('[Service Worker] Sync registered'))
      .catch(err => console.error('[Service Worker] Sync registration failed:', err));
  }
});

console.log('[Service Worker] Loaded');
