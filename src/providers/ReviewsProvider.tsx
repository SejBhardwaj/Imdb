/**
 * ReviewsProvider - Context and initialization
 * 
 * Provides:
 * - Service Worker initialization
 * - React Query setup for reviews
 * - Sync status monitoring
 */

'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { initializeReviewsSW, reviewsSWManager } from '@/lib/sw/reviewsSWManager';
import { toast } from 'sonner';

interface ReviewsContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  syncCount: number;
}

const ReviewsContext = createContext<ReviewsContextValue>({
  isOnline: true,
  isSyncing: false,
  syncCount: 0,
});

export function useReviewsContext() {
  return useContext(ReviewsContext);
}

interface ReviewsProviderProps {
  children: ReactNode;
}

export function ReviewsProvider({ children }: ReviewsProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    // Initialize service worker
    initializeReviewsSW().catch((error) => {
      console.error('Failed to initialize reviews SW:', error);
    });

    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing reviews...');
      reviewsSWManager.triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('You are offline. Changes will sync when online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync completion
    const handleSyncComplete = (event: CustomEvent) => {
      setIsSyncing(false);
      setSyncCount((prev) => prev + event.detail.count);
      
      if (event.detail.count > 0) {
        toast.success(`${event.detail.count} review(s) synced successfully!`);
      }
    };

    window.addEventListener('reviews-synced', handleSyncComplete as EventListener);

    // Set initial online status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('reviews-synced', handleSyncComplete as EventListener);
    };
  }, []);

  const value: ReviewsContextValue = {
    isOnline,
    isSyncing,
    syncCount,
  };

  return (
    <ReviewsContext.Provider value={value}>
      {children}
    </ReviewsContext.Provider>
  );
}
