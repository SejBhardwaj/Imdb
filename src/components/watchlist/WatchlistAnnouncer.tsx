'use client';

/**
 * WatchlistAnnouncer Component
 * 
 * Provides ARIA-live region for screen reader announcements
 * Announces watchlist changes for accessibility
 */

import { useEffect, useState } from 'react';
import { subscribeToWatchlistChanges } from '@/lib/sync/broadcastChannel';
import { serviceWorkerManager } from '@/lib/sw/register';

interface AnnouncementMessage {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
}

export function WatchlistAnnouncer() {
  const [announcement, setAnnouncement] = useState<AnnouncementMessage | null>(null);

  useEffect(() => {
    // Subscribe to watchlist changes
    const unsubscribeWatchlist = subscribeToWatchlistChanges((message) => {
      let text = '';
      
      switch (message.type) {
        case 'WATCHLIST_ADDED':
          text = `Movie added to watchlist`;
          break;
        case 'WATCHLIST_REMOVED':
          text = `Movie removed from watchlist`;
          break;
        case 'WATCHLIST_SYNCED':
          text = `Watchlist synchronized with ${message.movieIds.length} items`;
          break;
        case 'SYNC_STARTED':
          text = 'Syncing watchlist...';
          break;
        case 'SYNC_COMPLETED':
          text = message.success 
            ? 'Watchlist sync completed successfully' 
            : 'Watchlist sync failed';
          break;
        case 'OFFLINE_QUEUE_UPDATED':
          text = `${message.queueSize} pending changes will sync when online`;
          break;
      }

      if (text) {
        setAnnouncement({
          id: `${Date.now()}-${Math.random()}`,
          message: text,
          priority: 'polite',
        });
      }
    });

    // Subscribe to service worker messages
    const unsubscribeServiceWorker = serviceWorkerManager.subscribe((message) => {
      let text = '';
      let priority: 'polite' | 'assertive' = 'polite';
      
      switch (message.type) {
        case 'SYNC_COMPLETED':
          text = `Synchronized ${message.processed} watchlist changes`;
          if (message.failed > 0) {
            text += `, ${message.failed} failed`;
            priority = 'assertive';
          }
          break;
        case 'SYNC_FAILED':
          text = `Sync failed: ${message.error}. Will retry when online.`;
          priority = 'assertive';
          break;
        case 'UPDATE_AVAILABLE':
          text = 'App update available. Refresh to update.';
          priority = 'polite';
          break;
      }

      if (text) {
        setAnnouncement({
          id: `${Date.now()}-${Math.random()}`,
          message: text,
          priority,
        });
      }
    });

    // Listen for online/offline events
    const handleOnline = () => {
      setAnnouncement({
        id: `online-${Date.now()}`,
        message: 'Connection restored. Syncing watchlist...',
        priority: 'polite',
      });
    };

    const handleOffline = () => {
      setAnnouncement({
        id: `offline-${Date.now()}`,
        message: 'You are offline. Changes will sync when connection is restored.',
        priority: 'assertive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeWatchlist();
      unsubscribeServiceWorker();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clear announcement after it's been read
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => {
        setAnnouncement(null);
      }, 3000); // Clear after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [announcement]);

  return (
    <>
      {/* Polite announcements (don't interrupt) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement?.priority === 'polite' && announcement.message}
      </div>

      {/* Assertive announcements (interrupt current speech) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement?.priority === 'assertive' && announcement.message}
      </div>
    </>
  );
}

/**
 * Sync Status Indicator - Visual feedback for sync state
 */
export function SyncStatusIndicator({ className = '' }: { className?: string }) {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Subscribe to sync events
    const unsubscribe = subscribeToWatchlistChanges((message) => {
      switch (message.type) {
        case 'SYNC_STARTED':
          setSyncState('syncing');
          break;
        case 'SYNC_COMPLETED':
          setSyncState(message.success ? 'success' : 'error');
          setTimeout(() => setSyncState('idle'), 3000);
          break;
        case 'OFFLINE_QUEUE_UPDATED':
          setPendingCount(message.queueSize);
          break;
      }
    });

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show if idle and online with no pending changes
  if (syncState === 'idle' && isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`
        flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full
        ${syncState === 'syncing' ? 'bg-blue-500/20 text-blue-400' : ''}
        ${syncState === 'success' ? 'bg-green-500/20 text-green-400' : ''}
        ${syncState === 'error' ? 'bg-red-500/20 text-red-400' : ''}
        ${!isOnline ? 'bg-yellow-500/20 text-yellow-400' : ''}
        ${syncState === 'idle' && isOnline ? 'bg-white/10 text-white' : ''}
        ${className}
      `}
      role="status"
      aria-label={
        !isOnline 
          ? `Offline. ${pendingCount} changes pending.`
          : syncState === 'syncing'
          ? 'Syncing watchlist...'
          : syncState === 'success'
          ? 'Sync successful'
          : syncState === 'error'
          ? 'Sync failed'
          : `${pendingCount} changes pending`
      }
    >
      {/* Status indicator dot */}
      <div
        className={`
          w-2 h-2 rounded-full
          ${syncState === 'syncing' ? 'bg-blue-400 animate-pulse' : ''}
          ${syncState === 'success' ? 'bg-green-400' : ''}
          ${syncState === 'error' ? 'bg-red-400' : ''}
          ${!isOnline ? 'bg-yellow-400' : ''}
          ${syncState === 'idle' && isOnline ? 'bg-white' : ''}
        `}
        aria-hidden="true"
      />
      
      {/* Status text */}
      <span>
        {!isOnline 
          ? `Offline (${pendingCount} pending)`
          : syncState === 'syncing'
          ? 'Syncing...'
          : syncState === 'success'
          ? 'Synced'
          : syncState === 'error'
          ? 'Sync failed'
          : `${pendingCount} pending`
        }
      </span>
    </div>
  );
}

/**
 * Offline indicator banner
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => setShow(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShow(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !show) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed top-20 left-1/2 -translate-x-1/2 z-50
        px-6 py-3 rounded-lg shadow-lg
        ${isOnline 
          ? 'bg-green-600 text-white' 
          : 'bg-yellow-600 text-white'
        }
        font-medium text-sm
        animate-in slide-in-from-top duration-300
      `}
    >
      {isOnline 
        ? '✓ Back online. Syncing changes...' 
        : '⚠ You are offline. Changes will sync when reconnected.'
      }
    </div>
  );
}
