/**
 * TanStack Query Client Configuration
 * 
 * Centralized configuration for React Query (TanStack Query).
 * 
 * Features:
 * - Request deduplication
 * - Background revalidation
 * - Cache garbage collection
 * - Retry logic
 * - Error handling
 * - Optimistic updates support
 * - Prefetching
 * - Persistence (optional)
 * 
 * Architecture:
 * Client (React Query) ← Repository ← Cache ← Provider ← API
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Default query options for all queries
 */
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Cache time: How long inactive queries stay in cache
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)

    // Stale time: How long data is considered fresh
    staleTime: 1000 * 60 * 5, // 5 minutes

    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        return false;
      }

      // Don't retry on 404
      if (error?.statusCode === 404) {
        return false;
      }

      // Retry up to 3 times for other errors
      return failureCount < 3;
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch on window focus (useful for keeping data fresh)
    refetchOnWindowFocus: true,

    // Refetch on reconnect
    refetchOnReconnect: true,

    // Don't refetch on mount if data is fresh
    refetchOnMount: true,

    // Network mode
    networkMode: 'online',
  },

  mutations: {
    // Retry mutations once
    retry: 1,

    // Retry delay
    retryDelay: 1000,

    // Network mode
    networkMode: 'online',
  },
};

/**
 * Create Query Client
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Global query client instance (singleton)
 * Use in Client Components
 */
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  // Server: always create new client
  if (typeof window === 'undefined') {
    return createQueryClient();
  }

  // Browser: reuse existing client
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
}

/**
 * Query Keys Factory
 * 
 * Centralized query key management for consistency and type safety.
 */
export const queryKeys = {
  // Movie queries
  movie: {
    all: ['movies'] as const,
    lists: () => [...queryKeys.movie.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.movie.lists(), { filters }] as const,
    details: () => [...queryKeys.movie.all, 'detail'] as const,
    detail: (id: number | string) => [...queryKeys.movie.details(), id] as const,
  },

  // Popular movies
  popular: {
    all: ['movies', 'popular'] as const,
    list: (page?: number) => [...queryKeys.popular.all, page] as const,
    cursor: (cursor?: string) => [...queryKeys.popular.all, 'cursor', cursor] as const,
  },

  // Top-rated movies
  topRated: {
    all: ['movies', 'top-rated'] as const,
    list: (page?: number) => [...queryKeys.topRated.all, page] as const,
  },

  // Now playing movies
  nowPlaying: {
    all: ['movies', 'now-playing'] as const,
    list: (page?: number) => [...queryKeys.nowPlaying.all, page] as const,
  },

  // Upcoming movies
  upcoming: {
    all: ['movies', 'upcoming'] as const,
    list: (page?: number) => [...queryKeys.upcoming.all, page] as const,
  },

  // Search
  search: {
    all: ['movies', 'search'] as const,
    query: (query: string, page?: number) => [...queryKeys.search.all, query, page] as const,
    withFilters: (query: string, filters: any, page?: number) =>
      [...queryKeys.search.all, query, filters, page] as const,
  },

  // Recommendations
  recommendations: {
    all: ['movies', 'recommendations'] as const,
    byMovie: (movieId: number, page?: number) =>
      [...queryKeys.recommendations.all, movieId, page] as const,
  },

  // Similar movies
  similar: {
    all: ['movies', 'similar'] as const,
    byMovie: (movieId: number, page?: number) => [...queryKeys.similar.all, movieId, page] as const,
  },

  // Credits
  credits: {
    all: ['movies', 'credits'] as const,
    byMovie: (movieId: number) => [...queryKeys.credits.all, movieId] as const,
  },

  // Videos
  videos: {
    all: ['movies', 'videos'] as const,
    byMovie: (movieId: number) => [...queryKeys.videos.all, movieId] as const,
  },

  // Images
  images: {
    all: ['movies', 'images'] as const,
    byMovie: (movieId: number) => [...queryKeys.images.all, movieId] as const,
  },

  // Genre discovery
  discover: {
    all: ['movies', 'discover'] as const,
    byGenre: (genreId: number, page?: number) => [...queryKeys.discover.all, genreId, page] as const,
  },
} as const;

/**
 * Query client utilities
 */
export const queryUtils = {
  /**
   * Invalidate all movie queries
   */
  invalidateMovies: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.movie.all });
  },

  /**
   * Invalidate specific movie
   */
  invalidateMovie: (queryClient: QueryClient, id: number | string) => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.movie.detail(id) });
  },

  /**
   * Invalidate movie lists
   */
  invalidateMovieLists: (queryClient: QueryClient) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.popular.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.topRated.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.nowPlaying.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.upcoming.all }),
    ]);
  },

  /**
   * Prefetch movie
   */
  prefetchMovie: async (queryClient: QueryClient, id: number, fetcher: () => Promise<any>) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.movie.detail(id),
      queryFn: fetcher,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  },

  /**
   * Set movie data in cache
   */
  setMovieData: (queryClient: QueryClient, id: number | string, data: any) => {
    queryClient.setQueryData(queryKeys.movie.detail(id), data);
  },

  /**
   * Get movie data from cache
   */
  getMovieData: (queryClient: QueryClient, id: number | string) => {
    return queryClient.getQueryData(queryKeys.movie.detail(id));
  },

  /**
   * Remove movie from cache
   */
  removeMovie: (queryClient: QueryClient, id: number | string) => {
    queryClient.removeQueries({ queryKey: queryKeys.movie.detail(id) });
  },

  /**
   * Clear all caches
   */
  clearAll: (queryClient: QueryClient) => {
    queryClient.clear();
  },

  /**
   * Get cache statistics
   */
  getCacheStats: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    return {
      totalQueries: queries.length,
      activeQueries: queries.filter((q) => q.state.fetchStatus !== 'idle').length,
      staleQueries: queries.filter((q) => q.isStale()).length,
      inactiveQueries: queries.filter((q) => !q.getObserversCount()).length,
    };
  },
};

/**
 * Optimistic update helpers
 */
export const optimisticUpdateHelpers = {
  /**
   * Create optimistic update for movie
   */
  updateMovie: (queryClient: QueryClient, id: number | string, updater: (old: any) => any) => {
    const queryKey = queryKeys.movie.detail(id);

    // Cancel outgoing queries
    queryClient.cancelQueries({ queryKey });

    // Snapshot current value
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistically update
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return updater(old);
    });

    // Return rollback function
    return () => {
      queryClient.setQueryData(queryKey, previousData);
    };
  },

  /**
   * Create optimistic update for movie list
   */
  updateMovieList: (
    queryClient: QueryClient,
    listQueryKey: readonly unknown[],
    updater: (old: any) => any
  ) => {
    // Cancel outgoing queries
    queryClient.cancelQueries({ queryKey: listQueryKey });

    // Snapshot current value
    const previousData = queryClient.getQueryData(listQueryKey);

    // Optimistically update
    queryClient.setQueryData(listQueryKey, (old: any) => {
      if (!old) return old;
      return updater(old);
    });

    // Return rollback function
    return () => {
      queryClient.setQueryData(listQueryKey, previousData);
    };
  },
};

/**
 * Mutation helpers
 */
export const mutationHelpers = {
  /**
   * Create mutation options with automatic cache invalidation
   */
  createMovieMutation: (queryClient: QueryClient) => ({
    onSuccess: (data: any, variables: any) => {
      // Invalidate affected queries
      if (variables.movieId) {
        queryUtils.invalidateMovie(queryClient, variables.movieId);
      }
      queryUtils.invalidateMovieLists(queryClient);
    },
    onError: (error: any, variables: any, context: any) => {
      // Rollback optimistic updates
      if (context?.rollback) {
        context.rollback();
      }
    },
  }),
};

/**
 * Prefetch strategies
 */
export const prefetchStrategies = {
  /**
   * Prefetch on hover (for movie cards)
   */
  onHover: (queryClient: QueryClient, movieId: number, fetcher: () => Promise<any>) => {
    return () => {
      queryUtils.prefetchMovie(queryClient, movieId, fetcher);
    };
  },

  /**
   * Prefetch on link focus (for accessibility)
   */
  onFocus: (queryClient: QueryClient, movieId: number, fetcher: () => Promise<any>) => {
    return () => {
      queryUtils.prefetchMovie(queryClient, movieId, fetcher);
    };
  },

  /**
   * Prefetch visible items (for lists)
   */
  onVisible: (queryClient: QueryClient, movieIds: number[], fetcher: (id: number) => Promise<any>) => {
    return () => {
      movieIds.forEach((id) => {
        queryUtils.prefetchMovie(queryClient, id, () => fetcher(id));
      });
    };
  },
};

/**
 * Export type helpers
 */
export type QueryKeys = typeof queryKeys;
export type MovieQueryKey = ReturnType<typeof queryKeys.movie.detail>;
export type MovieListQueryKey = ReturnType<typeof queryKeys.popular.list>;
