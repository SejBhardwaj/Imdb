// @ts-nocheck - Old hooks file, not used in new implementation (use src/lib/query/hooks.ts)
/**
 * useMovies Hooks
 * 
 * React Query hooks for fetching movie lists.
 * 
 * Features:
 * - Popular movies
 * - Top-rated movies
 * - Now playing movies
 * - Upcoming movies
 * - Infinite scroll support
 * - Cursor-based pagination
 */

'use client';

import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query/queryClient';
import type {
  Movie,
  PaginatedResponse,
  CursorPaginatedResponse,
  APIError,
} from '@/lib/data/types/movie';

/**
 * Hook for popular movies (page-based)
 */
export function usePopularMovies(
  page: number,
  fetcher: (page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.popular.list(page),
    queryFn: () => fetcher(page),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while loading
    ...options,
  });
}

/**
 * Hook for popular movies with infinite scroll (page-based)
 */
export function useInfinitePopularMovies(
  fetcher: (page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<
    UseInfiniteQueryOptions<PaginatedResponse<Movie>, APIError>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.popular.all,
    queryFn: ({ pageParam }) => fetcher(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for popular movies with cursor-based pagination
 */
export function useInfinitePopularMoviesCursor(
  fetcher: (cursor?: string) => Promise<CursorPaginatedResponse<Movie>>,
  options?: Omit<
    UseInfiniteQueryOptions<CursorPaginatedResponse<Movie>, APIError>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<CursorPaginatedResponse<Movie>, APIError>({
    queryKey: [...queryKeys.popular.all, 'cursor'],
    queryFn: ({ pageParam }) => fetcher(pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.cursor : undefined;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for top-rated movies
 */
export function useTopRatedMovies(
  page: number,
  fetcher: (page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.topRated.list(page),
    queryFn: () => fetcher(page),
    staleTime: 1000 * 60 * 10, // 10 minutes (changes less frequently)
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Hook for top-rated movies with infinite scroll
 */
export function useInfiniteTopRatedMovies(
  fetcher: (page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<
    UseInfiniteQueryOptions<PaginatedResponse<Movie>, APIError>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.topRated.all,
    queryFn: ({ pageParam }) => fetcher(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 10,
    ...options,
  });
}

/**
 * Hook for now playing movies
 */
export function useNowPlayingMovies(
  page: number,
  fetcher: (page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.nowPlaying.list(page),
    queryFn: () => fetcher(page),
    staleTime: 1000 * 60 * 2, // 2 minutes (changes frequently)
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Hook for now playing movies with infinite scroll
 */
export function useInfiniteNowPlayingMovies(
  fetcher: (page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<
    UseInfiniteQueryOptions<PaginatedResponse<Movie>, APIError>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.nowPlaying.all,
    queryFn: ({ pageParam }) => fetcher(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}

/**
 * Hook for upcoming movies
 */
export function useUpcomingMovies(
  page: number,
  fetcher: (page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.upcoming.list(page),
    queryFn: () => fetcher(page),
    staleTime: 1000 * 60 * 15, // 15 minutes (changes infrequently)
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Hook for upcoming movies with infinite scroll
 */
export function useInfiniteUpcomingMovies(
  fetcher: (page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<
    UseInfiniteQueryOptions<PaginatedResponse<Movie>, APIError>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.upcoming.all,
    queryFn: ({ pageParam }) => fetcher(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 15,
    ...options,
  });
}

/**
 * Hook for movie recommendations
 */
export function useMovieRecommendations(
  movieId: number | null | undefined,
  page: number,
  fetcher: (movieId: number, page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.recommendations.byMovie(movieId!, page),
    queryFn: () => fetcher(movieId!, page),
    enabled: movieId != null,
    staleTime: 1000 * 60 * 10,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Hook for similar movies
 */
export function useSimilarMovies(
  movieId: number | null | undefined,
  page: number,
  fetcher: (movieId: number, page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.similar.byMovie(movieId!, page),
    queryFn: () => fetcher(movieId!, page),
    enabled: movieId != null,
    staleTime: 1000 * 60 * 10,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Hook for genre discovery
 */
export function useDiscoverByGenre(
  genreId: number | null | undefined,
  page: number,
  fetcher: (genreId: number, page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.discover.byGenre(genreId!, page),
    queryFn: () => fetcher(genreId!, page),
    enabled: genreId != null,
    staleTime: 1000 * 60 * 10,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Hook for genre discovery with infinite scroll
 */
export function useInfiniteDiscoverByGenre(
  genreId: number | null | undefined,
  fetcher: (genreId: number, page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<
    UseInfiniteQueryOptions<PaginatedResponse<Movie>, APIError>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: [...queryKeys.discover.byGenre(genreId!), 'infinite'],
    queryFn: ({ pageParam }) => fetcher(genreId!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    enabled: genreId != null,
    staleTime: 1000 * 60 * 10,
    ...options,
  });
}
