'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  watchlistService,
  favoritesService,
  reviewsService,
  recentlyViewedService,
  searchHistoryService,
  notificationsService,
} from '@/lib/firebase/firestore';

// Query Keys
const FIRESTORE_KEYS = {
  WATCHLIST: 'watchlist',
  FAVORITES: 'favorites',
  REVIEWS: 'reviews',
  RECENTLY_VIEWED: 'recently-viewed',
  SEARCH_HISTORY: 'search-history',
  NOTIFICATIONS: 'notifications',
} as const;

// Watchlist Hooks
export const useWatchlist = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.WATCHLIST, user?.uid],
    queryFn: () => watchlistService.get(user!.uid),
    enabled: !!user,
  });
};

export const useAddToWatchlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ type, id }: { type: 'movie' | 'tv'; id: number }) => {
      if (!user) throw new Error('User not authenticated');
      return type === 'movie'
        ? watchlistService.addMovie(user.uid, id)
        : watchlistService.addTVShow(user.uid, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.WATCHLIST] });
    },
  });
};

export const useRemoveFromWatchlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ type, id }: { type: 'movie' | 'tv'; id: number }) => {
      if (!user) throw new Error('User not authenticated');
      return type === 'movie'
        ? watchlistService.removeMovie(user.uid, id)
        : watchlistService.removeTVShow(user.uid, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.WATCHLIST] });
    },
  });
};

export const useIsInWatchlist = (itemId: number, type: 'movie' | 'tv') => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.WATCHLIST, 'check', user?.uid, itemId, type],
    queryFn: () => watchlistService.isInWatchlist(user!.uid, itemId, type),
    enabled: !!user && !!itemId,
  });
};

// Favorites Hooks
export const useFavorites = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.FAVORITES, user?.uid],
    queryFn: () => favoritesService.get(user!.uid),
    enabled: !!user,
  });
};

export const useAddToFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ type, id }: { type: 'movie' | 'tv' | 'actor'; id: number }) => {
      if (!user) throw new Error('User not authenticated');
      
      switch (type) {
        case 'movie':
          return favoritesService.addMovie(user.uid, id);
        case 'tv':
          return favoritesService.addTVShow(user.uid, id);
        case 'actor':
          return favoritesService.addActor(user.uid, id);
        default:
          throw new Error('Invalid type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.FAVORITES] });
    },
  });
};

export const useRemoveFromFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ type, id }: { type: 'movie' | 'tv' | 'actor'; id: number }) => {
      if (!user) throw new Error('User not authenticated');
      
      switch (type) {
        case 'movie':
          return favoritesService.removeMovie(user.uid, id);
        case 'tv':
          return favoritesService.removeTVShow(user.uid, id);
        case 'actor':
          return favoritesService.removeActor(user.uid, id);
        default:
          throw new Error('Invalid type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.FAVORITES] });
    },
  });
};

export const useIsFavorite = (itemId: number, type: 'movie' | 'tv' | 'actor') => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.FAVORITES, 'check', user?.uid, itemId, type],
    queryFn: () => favoritesService.isFavorite(user!.uid, itemId, type),
    enabled: !!user && !!itemId,
  });
};

// Reviews Hooks
export const useUserReviews = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.REVIEWS, user?.uid],
    queryFn: () => reviewsService.getByUser(user!.uid),
    enabled: !!user,
  });
};

export const useMovieReviews = (movieId: number) => {
  return useQuery({
    queryKey: [FIRESTORE_KEYS.REVIEWS, 'movie', movieId],
    queryFn: () => reviewsService.getByMovie(movieId),
    enabled: !!movieId,
  });
};

export const useUserMovieReview = (movieId: number) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.REVIEWS, 'user-movie', user?.uid, movieId],
    queryFn: () => reviewsService.getUserReviewForMovie(user!.uid, movieId),
    enabled: !!user && !!movieId,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reviewsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.REVIEWS] });
    },
  });
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: any }) =>
      reviewsService.update(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.REVIEWS] });
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reviewsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.REVIEWS] });
    },
  });
};

// Recently Viewed Hooks
export const useRecentlyViewed = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.RECENTLY_VIEWED, user?.uid],
    queryFn: () => recentlyViewedService.get(user!.uid),
    enabled: !!user,
  });
};

export const useAddToRecentlyViewed = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (item: { id: number; type: 'movie' | 'tv' | 'person' }) => {
      if (!user) throw new Error('User not authenticated');
      return recentlyViewedService.add(user.uid, item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.RECENTLY_VIEWED] });
    },
  });
};

// Search History Hooks
export const useSearchHistory = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.SEARCH_HISTORY, user?.uid],
    queryFn: () => searchHistoryService.get(user!.uid),
    enabled: !!user,
  });
};

export const useAddToSearchHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (query: string) => {
      if (!user) throw new Error('User not authenticated');
      return searchHistoryService.add(user.uid, query);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.SEARCH_HISTORY] });
    },
  });
};

// Notifications Hooks
export const useNotifications = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.NOTIFICATIONS, user?.uid],
    queryFn: () => notificationsService.getByUser(user!.uid),
    enabled: !!user,
  });
};

export const useUnreadNotificationsCount = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [FIRESTORE_KEYS.NOTIFICATIONS, 'unread', user?.uid],
    queryFn: () => notificationsService.getUnreadCount(user!.uid),
    enabled: !!user,
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FIRESTORE_KEYS.NOTIFICATIONS] });
    },
  });
};
