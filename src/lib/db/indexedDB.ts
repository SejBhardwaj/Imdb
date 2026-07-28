import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema definition
interface WatchlistDB extends DBSchema {
  watchlist: {
    key: number; // movieId
    value: {
      movieId: number;
      addedAt: number; // timestamp
      lastModified: number; // for Last-Write-Wins
      deviceId: string; // for conflict resolution
    };
    indexes: { 'addedAt': number; 'lastModified': number };
  };
  offlineQueue: {
    key: string; // uuid
    value: {
      id: string;
      action: 'add' | 'remove';
      movieId: number;
      timestamp: number;
      userId: string;
      retryCount: number;
    };
    indexes: { 'timestamp': number; 'userId': string };
  };
  movieCache: {
    key: number; // movieId
    value: {
      movieId: number;
      title: string;
      posterPath: string | null;
      releaseDate: string;
      voteAverage: number;
      cachedAt: number;
    };
    indexes: { 'cachedAt': number };
  };
  syncMetadata: {
    key: string; // 'lastSync', 'deviceId', etc.
    value: {
      key: string;
      value: string | number;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'imdb-offline-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<WatchlistDB> | null = null;

/**
 * Initialize and open IndexedDB connection
 */
export async function getDB(): Promise<IDBPDatabase<WatchlistDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<WatchlistDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
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
    },
    blocked() {
      console.warn('IndexedDB upgrade blocked. Please close other tabs.');
    },
    blocking() {
      console.warn('This tab is blocking a newer version of the database.');
    },
    terminated() {
      console.error('IndexedDB connection terminated unexpectedly.');
      dbInstance = null;
    },
  });

  return dbInstance;
}

/**
 * Close database connection
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Clear all data (for testing)
 */
export async function clearDB(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['watchlist', 'offlineQueue', 'movieCache', 'syncMetadata'], 'readwrite');
  
  await Promise.all([
    tx.objectStore('watchlist').clear(),
    tx.objectStore('offlineQueue').clear(),
    tx.objectStore('movieCache').clear(),
    tx.objectStore('syncMetadata').clear(),
    tx.done,
  ]);
}

/**
 * Generate or retrieve device ID for conflict resolution
 */
export async function getDeviceId(): Promise<string> {
  const db = await getDB();
  const existing = await db.get('syncMetadata', 'deviceId');
  
  if (existing) {
    return existing.value as string;
  }
  
  const newDeviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await db.put('syncMetadata', {
    key: 'deviceId',
    value: newDeviceId,
    updatedAt: Date.now(),
  });
  
  return newDeviceId;
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number> {
  const db = await getDB();
  const metadata = await db.get('syncMetadata', 'lastSync');
  return metadata?.value as number || 0;
}

/**
 * Update last sync timestamp
 */
export async function updateLastSyncTime(timestamp: number): Promise<void> {
  const db = await getDB();
  await db.put('syncMetadata', {
    key: 'lastSync',
    value: timestamp,
    updatedAt: Date.now(),
  });
}
