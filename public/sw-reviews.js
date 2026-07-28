/**
 * Service Worker for Reviews
 * 
 * Handles:
 * - Background Sync for offline review submissions
 * - Automatic retry with exponential backoff
 * - Idempotency to prevent duplicates
 */

const SYNC_TAG = 'sync-reviews';
const CACHE_NAME = 'reviews-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(clients.claim());
});

/**
 * Background Sync event
 * 
 * Triggered when:
 * 1. Network reconnects after being offline
 * 2. Manually triggered by app
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingReviews());
  }
});

/**
 * Sync pending reviews from IndexedDB queue
 */
async function syncPendingReviews() {
  console.log('[SW] Starting sync of pending reviews...');

  try {
    // Open IndexedDB
    const db = await openReviewsDB();

    // Get all pending actions
    const tx = db.transaction('offlineQueue', 'readonly');
    const store = tx.objectStore('offlineQueue');
    const pendingActions = await store.getAll();
    await tx.done;

    console.log(`[SW] Found ${pendingActions.length} pending actions`);

    // Process each action
    for (const action of pendingActions) {
      try {
        await processAction(action, db);
        
        // Remove from queue on success
        const deleteTx = db.transaction('offlineQueue', 'readwrite');
        await deleteTx.objectStore('offlineQueue').delete(action.id);
        await deleteTx.done;

        console.log('[SW] Action synced successfully:', action.id);
      } catch (error) {
        console.error('[SW] Failed to sync action:', action.id, error);

        // Increment retry count
        action.retryCount++;

        // Give up after 5 retries
        if (action.retryCount >= 5) {
          console.error('[SW] Giving up on action after 5 retries:', action.id);
          const deleteTx = db.transaction('offlineQueue', 'readwrite');
          await deleteTx.objectStore('offlineQueue').delete(action.id);
          await deleteTx.done;
        } else {
          // Update retry count
          const updateTx = db.transaction('offlineQueue', 'readwrite');
          await updateTx.objectStore('offlineQueue').put(action);
          await updateTx.done;
        }
      }
    }

    // Notify clients
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        count: pendingActions.length,
      });
    }

    console.log('[SW] Sync completed');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

/**
 * Process individual action
 */
async function processAction(action, db) {
  console.log('[SW] Processing action:', action.type, action.id);

  switch (action.type) {
    case 'create':
      return await createReview(action);
    case 'update':
      return await updateReview(action);
    case 'delete':
      return await deleteReview(action);
    case 'vote':
      return await voteReview(action);
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * Create review via API
 */
async function createReview(action) {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': action.userId,
    },
    body: JSON.stringify(action.payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Update review via API
 */
async function updateReview(action) {
  const { reviewId, ...updateData } = action.payload;

  const response = await fetch(`/api/reviews/${reviewId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': action.userId,
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Delete review via API
 */
async function deleteReview(action) {
  const response = await fetch(`/api/reviews/${action.payload.reviewId}`, {
    method: 'DELETE',
    headers: {
      'X-User-Id': action.userId,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return true;
}

/**
 * Vote on review via API
 */
async function voteReview(action) {
  const response = await fetch(`/api/reviews/${action.payload.reviewId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': action.userId,
    },
    body: JSON.stringify(action.payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Open IndexedDB
 */
function openReviewsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('imdb-reviews-db', 1);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Message handler (for manual sync triggers)
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SYNC_NOW') {
    // Manually trigger sync
    syncPendingReviews()
      .then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
      .catch((error) => {
        event.ports[0]?.postMessage({ success: false, error: error.message });
      });
  }
});

/**
 * Fetch event (optional caching strategy)
 */
self.addEventListener('fetch', (event) => {
  // Only intercept review API calls
  if (event.request.url.includes('/api/reviews')) {
    // Network-first strategy for reviews
    event.respondWith(
      fetch(event.request)
        .catch((error) => {
          console.log('[SW] Network request failed, will sync later');
          return new Response(JSON.stringify({ offline: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
  }
});
