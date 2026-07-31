/**
 * TanStack Query Client Configuration
 * 
 * Enterprise-grade QueryClient with optimized defaults
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Default query options
 */
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Stale-while-revalidate behavior
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

    // Retry configuration
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch configuration
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,

    // Network mode
    networkMode: 'online',

    // Error handling
    throwOnError: false,

    // Structural sharing for performance
    structuralSharing: true,
  },
  mutations: {
    // Retry configuration for mutations
    retry: 1,
    retryDelay: 1000,

    // Network mode
    networkMode: 'online',

    // Error handling
    throwOnError: false,
  },
};

/**
 * Create query client with enterprise configuration
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Global query client instance for client components
 */
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create a new client
    return createQueryClient();
  } else {
    // Browser: reuse existing client
    if (!browserQueryClient) {
      browserQueryClient = createQueryClient();
    }
    return browserQueryClient;
  }
}

/**
 * Prefetch configuration
 */
export const PREFETCH_CONFIG = {
  // Hover prefetch delay
  HOVER_DELAY: 300, // ms

  // Viewport prefetch options
  VIEWPORT_OPTIONS: {
    rootMargin: '200px',
    threshold: 0.1,
  },

  // Idle prefetch delay
  IDLE_DELAY: 2000, // ms

  // Max concurrent prefetches
  MAX_CONCURRENT: 3,
} as const;

/**
 * Cache time configurations by data type
 */
export const CACHE_TIMES = {
  // Short-lived data
  TRENDING: 3 * 60 * 1000, // 3 minutes
  NOW_PLAYING: 5 * 60 * 1000, // 5 minutes

  // Medium-lived data
  POPULAR: 10 * 60 * 1000, // 10 minutes
  UPCOMING: 10 * 60 * 1000, // 10 minutes
  SEARCH: 10 * 60 * 1000, // 10 minutes

  // Long-lived data
  TOP_RATED: 60 * 60 * 1000, // 1 hour
  MOVIE_DETAILS: 60 * 60 * 1000, // 1 hour
  CREDITS: 24 * 60 * 60 * 1000, // 24 hours
  GENRES: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/**
 * Stale time configurations
 */
export const STALE_TIMES = {
  // Aggressive refetch
  TRENDING: 2 * 60 * 1000, // 2 minutes
  NOW_PLAYING: 3 * 60 * 1000, // 3 minutes

  // Moderate refetch
  POPULAR: 5 * 60 * 1000, // 5 minutes
  UPCOMING: 5 * 60 * 1000, // 5 minutes
  SEARCH: 5 * 60 * 1000, // 5 minutes

  // Conservative refetch
  TOP_RATED: 30 * 60 * 1000, // 30 minutes
  MOVIE_DETAILS: 30 * 60 * 1000, // 30 minutes
  CREDITS: 12 * 60 * 60 * 1000, // 12 hours
  GENRES: 24 * 60 * 60 * 1000, // 24 hours
} as const;
