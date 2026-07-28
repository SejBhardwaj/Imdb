/**
 * IndexedDB Schema for Reviews System
 * 
 * Stores:
 * - Drafts (autosave)
 * - Offline queue (pending submissions)
 * - Revision history
 * - User votes
 * - Review cache
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ReviewDraft, OfflineReviewAction, ReviewRevision, ReviewVote, Review } from '@/types/review';

// Database schema
interface ReviewsDB extends DBSchema {
  // Drafts storage
  drafts: {
    key: string; // `${userId}-${movieId}`
    value: ReviewDraft;
    indexes: { 
      'movieId': number; 
      'userId': string;
      'savedAt': number;
    };
  };
  
  // Offline queue
  offlineQueue: {
    key: string; // UUID
    value: OfflineReviewAction;
    indexes: { 
      'timestamp': number;
      'userId': string;
      'idempotencyKey': string;
    };
  };
  
  // Revision history
  revisions: {
    key: string; // UUID
    value: ReviewRevision;
    indexes: { 
      'reviewId': string;
      'version': number;
      'createdAt': number;
    };
  };
  
  // User votes cache
  votes: {
    key: string; // `${userId}-${reviewId}`
    value: ReviewVote;
    indexes: { 
      'reviewId': string;
      'userId': string;
    };
  };
  
  // Review cache
  reviewCache: {
    key: string; // reviewId
    value: Review & { cachedAt: number };
    indexes: { 
      'movieId': number;
      'cachedAt': number;
    };
  };
  
  // Metadata
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'imdb-reviews-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ReviewsDB> | null = null;

/**
 * Initialize and open IndexedDB
 */
export async function getReviewsDB(): Promise<IDBPDatabase<ReviewsDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<ReviewsDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Drafts store
      if (!db.objectStoreNames.contains('drafts')) {
        const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
        draftsStore.createIndex('movieId', 'movieId');
        draftsStore.createIndex('userId', 'userId');
        draftsStore.createIndex('savedAt', 'savedAt');
      }

      // Offline queue store
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp');
        queueStore.createIndex('userId', 'userId');
        queueStore.createIndex('idempotencyKey', 'idempotencyKey');
      }

      // Revisions store
      if (!db.objectStoreNames.contains('revisions')) {
        const revisionsStore = db.createObjectStore('revisions', { keyPath: 'id' });
        revisionsStore.createIndex('reviewId', 'reviewId');
        revisionsStore.createIndex('version', 'version');
        revisionsStore.createIndex('createdAt', 'createdAt');
      }

      // Votes store
      if (!db.objectStoreNames.contains('votes')) {
        const votesStore = db.createObjectStore('votes', { keyPath: 'id' });
        votesStore.createIndex('reviewId', 'reviewId');
        votesStore.createIndex('userId', 'userId');
      }

      // Review cache store
      if (!db.objectStoreNames.contains('reviewCache')) {
        const cacheStore = db.createObjectStore('reviewCache', { keyPath: 'id' });
        cacheStore.createIndex('movieId', 'movieId');
        cacheStore.createIndex('cachedAt', 'cachedAt');
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
    
    blocked() {
      console.warn('[Reviews DB] Upgrade blocked. Close other tabs.');
    },
    
    blocking() {
      console.warn('[Reviews DB] Blocking newer version.');
    },
    
    terminated() {
      console.error('[Reviews DB] Connection terminated.');
      dbInstance = null;
    },
  });

  return dbInstance;
}

/**
 * Close database connection
 */
export function closeReviewsDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Clear all stores (for testing/reset)
 */
export async function clearReviewsDB(): Promise<void> {
  const db = await getReviewsDB();
  
  const tx = db.transaction(
    ['drafts', 'offlineQueue', 'revisions', 'votes', 'reviewCache', 'metadata'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('drafts').clear(),
    tx.objectStore('offlineQueue').clear(),
    tx.objectStore('revisions').clear(),
    tx.objectStore('votes').clear(),
    tx.objectStore('reviewCache').clear(),
    tx.objectStore('metadata').clear(),
  ]);

  await tx.done;
}

/**
 * Get database statistics
 */
export async function getDBStats(): Promise<{
  drafts: number;
  offlineQueue: number;
  revisions: number;
  votes: number;
  reviewCache: number;
}> {
  const db = await getReviewsDB();

  const [drafts, offlineQueue, revisions, votes, reviewCache] = await Promise.all([
    db.count('drafts'),
    db.count('offlineQueue'),
    db.count('revisions'),
    db.count('votes'),
    db.count('reviewCache'),
  ]);

  return { drafts, offlineQueue, revisions, votes, reviewCache };
}
