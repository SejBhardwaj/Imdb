// @ts-nocheck
/**
 * useWatchlist Hook - React Query Integration
 * 
 * Provides type-safe API for watchlist operations with:
 * - Optimistic updates
 * - Automatic refetching
 * - Cross-tab sync integration
 * - Error handling with rollback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { WatchlistRepository } from '@/repositories/WatchlistRepository';
import { subscribeToWatchlistChanges } from '@/lib/sync/broadcastChannel';
import type { WatchlistItem } from '@/lib/validation/schemas';

/**
 * Query Keys
 */
export const watchlistKeys = {
  all: ['watchlist'] as const,
  list: () => [...watchlistKeys.all, 'list'] as const,
  ids: () => [...watchlistKeys.all, 'ids'] as const,
  item: (movieId: number) => [...watchlistKeys.all, 'item', movieId] as const,
};

/**
 * Hook to get full watchlist
 */
export function useWatchlistQuery() {
  const queryClient = useQueryClient();

  // Subscribe to cross-tab changes
  useEffect(() => {
    const unsubscribe = subscribeToWatchlistChanges((message) => {
      // Invalidate queries when other tabs make changes
      if (message.type === 'WATCHLIST_ADDED' || 
          message.type === 'WATCHLIST_REMOVED' ||
          message.type === 'WATCHLIST_SYNCED') {
        queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return useQuery({
    queryKey: watchlistKeys.list(),
    queryFn: async () => {
      return await WatchlistRepository.getWatchlist();
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
  });
}

/**
 * Hook to get watchlist IDs only (fast check)
 */
export function useWatchlistIds() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToWatchlistChanges((message) => {
      if (message.type === 'WATCHLIST_ADDED' || 
          message.type === 'WATCHLIST_REMOVED' ||
          message.type === 'WATCHLIST_SYNCED') {
        queryClient.invalidateQueries({ queryKey: watchlistKeys.ids() });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return useQuery({
    queryKey: watchlistKeys.ids(),
    queryFn: async () => {
      return await WatchlistRepository.getWatchlistIds();
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to check if specific movie is in watchlist
 */
export function useIsInWatchlist(movieId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToWatchlistChanges((message) => {
      // Only invalidate this specific movie
      if (message.type === 'WATCHLIST_ADDED' && message.movieId === movieId) {
        queryClient.invalidateQueries({ queryKey: watchlistKeys.item(movieId) });
      }
      if (message.type === 'WATCHLIST_REMOVED' && message.movieId === movieId) {
        queryClient.invalidateQueries({ queryKey: watchlistKeys.item(movieId) });
      }
      if (message.type === 'WATCHLIST_SYNCED') {
        queryClient.invalidateQueries({ queryKey: watchlistKeys.item(movieId) });
      }
    });

    return unsubscribe;
  }, [movieId, queryClient]);

  return useQuery({
    queryKey: watchlistKeys.item(movieId),
    queryFn: async () => {
      return await WatchlistRepository.isInWatchlist(movieId);
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to add movie to watchlist (optimistic)
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movieId: number) => {
      const result = await WatchlistRepository.addMovie(movieId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return movieId;
    },
    
    // Optimistic update
    onMutate: async (movieId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: watchlistKeys.all });

      // Snapshot previous values
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(watchlistKeys.list());
      const previousIds = queryClient.getQueryData<Set<number>>(watchlistKeys.ids());
      const previousItem = queryClient.getQueryData<boolean>(watchlistKeys.item(movieId));

      // Optimistically update list
      queryClient.setQueryData<WatchlistItem[]>(watchlistKeys.list(), (old: WatchlistItem[] | undefined) => {
        if (!old) return old;
        
        // Check if already exists
        if (old.some(item => item.movieId === movieId)) {
          return old;
        }
        
        // Add to start of list
        return [{
          movieId,
          addedAt: Date.now(),
          lastModified: Date.now(),
          deviceId: 'optimistic',
        }, ...old];
      });

      // Optimistically update IDs
      queryClient.setQueryData<Set<number>>(watchlistKeys.ids(), (old: Set<number> | undefined) => {
        if (!old) return new Set([movieId]);
        const newSet = new Set(old);
        newSet.add(movieId);
        return newSet;
      });

      // Optimistically update item
      queryClient.setQueryData<boolean>(watchlistKeys.item(movieId), true);

      // Return context for rollback
      return { previousWatchlist, previousIds, previousItem };
    },
    
    // Rollback on error
    onError: async (error, movieId, context) => {
      console.error('Failed to add to watchlist:', error);
      
      // Rollback optimistic updates
      if (context?.previousWatchlist) {
        queryClient.setQueryData(watchlistKeys.list(), context.previousWatchlist);
      }
      if (context?.previousIds) {
        queryClient.setQueryData(watchlistKeys.ids(), context.previousIds);
      }
      if (context?.previousItem !== undefined) {
        queryClient.setQueryData(watchlistKeys.item(movieId), context.previousItem);
      }
      
      // Call repository rollback
      await WatchlistRepository.rollbackAction(movieId, 'add');
    },
    
    // Refetch on success
    onSuccess: (movieId) => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}

/**
 * Hook to remove movie from watchlist (optimistic)
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movieId: number) => {
      const result = await WatchlistRepository.removeMovie(movieId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return movieId;
    },
    
    // Optimistic update
    onMutate: async (movieId) => {
      await queryClient.cancelQueries({ queryKey: watchlistKeys.all });

      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(watchlistKeys.list());
      const previousIds = queryClient.getQueryData<Set<number>>(watchlistKeys.ids());
      const previousItem = queryClient.getQueryData<boolean>(watchlistKeys.item(movieId));

      // Optimistically remove from list
      queryClient.setQueryData<WatchlistItem[]>(watchlistKeys.list(), (old: WatchlistItem[] | undefined) => {
        if (!old) return old;
        return old.filter(item => item.movieId !== movieId);
      });

      // Optimistically remove from IDs
      queryClient.setQueryData<Set<number>>(watchlistKeys.ids(), (old: Set<number> | undefined) => {
        if (!old) return old;
        const newSet = new Set(old);
        newSet.delete(movieId);
        return newSet;
      });

      // Optimistically update item
      queryClient.setQueryData<boolean>(watchlistKeys.item(movieId), false);

      return { previousWatchlist, previousIds, previousItem };
    },
    
    // Rollback on error
    onError: async (error, movieId, context) => {
      console.error('Failed to remove from watchlist:', error);
      
      if (context?.previousWatchlist) {
        queryClient.setQueryData(watchlistKeys.list(), context.previousWatchlist);
      }
      if (context?.previousIds) {
        queryClient.setQueryData(watchlistKeys.ids(), context.previousIds);
      }
      if (context?.previousItem !== undefined) {
        queryClient.setQueryData(watchlistKeys.item(movieId), context.previousItem);
      }
      
      await WatchlistRepository.rollbackAction(movieId, 'remove');
    },
    
    onSuccess: (movieId) => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}

/**
 * Hook to toggle movie in watchlist
 */
export function useToggleWatchlist() {
  const queryClient = useQueryClient();
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  return useMutation({
    mutationFn: async (movieId: number) => {
      const result = await WatchlistRepository.toggleMovie(movieId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return { movieId, action: result.data };
    },
    
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}

/**
 * Hook to sync pending actions
 */
export function useSyncWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await WatchlistRepository.syncPendingActions();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data; // number of operations synced
    },
    
    onSuccess: (count) => {
      console.log(`Synced ${count} operations`);
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}

/**
 * Convenience hook that combines all watchlist operations
 */
export function useWatchlist(movieId?: number) {
  const watchlist = useWatchlistQuery();
  const watchlistIds = useWatchlistIds();
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const toggleMutation = useToggleWatchlist();
  const syncMutation = useSyncWatchlist();
  
  // If movieId is provided, check if in watchlist
  const isInWatchlist = movieId ? useIsInWatchlist(movieId) : null;

  const add = useCallback((id: number) => {
    return addMutation.mutateAsync(id);
  }, [addMutation]);

  const remove = useCallback((id: number) => {
    return removeMutation.mutateAsync(id);
  }, [removeMutation]);

  const toggle = useCallback((id: number) => {
    return toggleMutation.mutateAsync(id);
  }, [toggleMutation]);

  const sync = useCallback(() => {
    return syncMutation.mutateAsync();
  }, [syncMutation]);

  return {
    // Data
    watchlist: watchlist.data || [],
    watchlistIds: watchlistIds.data || new Set(),
    isInWatchlist: isInWatchlist?.data || false,
    
    // Loading states
    isLoading: watchlist.isLoading || watchlistIds.isLoading,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    isToggling: toggleMutation.isPending,
    isSyncing: syncMutation.isPending,
    
    // Error states
    error: watchlist.error || watchlistIds.error,
    addError: addMutation.error,
    removeError: removeMutation.error,
    toggleError: toggleMutation.error,
    syncError: syncMutation.error,
    
    // Actions
    add,
    remove,
    toggle,
    sync,
    
    // Refetch
    refetch: watchlist.refetch,
  };
}

