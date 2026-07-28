/**
 * useMovie Hook
 * 
 * React Query hook for fetching a single movie by ID.
 * 
 * Features:
 * - Automatic caching
 * - Background revalidation
 * - Request deduplication
 * - Loading/error states
 * - Prefetching support
 */

'use client';

import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query/queryClient';
import type { MovieDetails, APIError } from '@/lib/data/types/movie';

/**
 * Hook options
 */
export interface UseMovieOptions extends Omit<UseQueryOptions<MovieDetails, APIError>, 'queryKey' | 'queryFn'> {
  /** Enable prefetch on hover */
  prefetchOnHover?: boolean;
}

/**
 * Hook to fetch movie by ID
 * 
 * Usage:
 * ```typescript
 * const { data: movie, isLoading, error } = useMovie(550);
 * ```
 */
export function useMovie(
  id: number | string | null | undefined,
  fetcher: (id: number | string) => Promise<MovieDetails>,
  options?: UseMovieOptions
) {
  const queryClient = useQueryClient();

  return useQuery<MovieDetails, APIError>({
    queryKey: queryKeys.movie.detail(id!),
    queryFn: () => fetcher(id!),
    enabled: id != null,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  });
}

/**
 * Prefetch movie data
 * 
 * Usage:
 * ```typescript
 * const prefetchMovie = usePrefetchMovie();
 * 
 * <div onMouseEnter={() => prefetchMovie(550)}>
 *   Movie Card
 * </div>
 * ```
 */
export function usePrefetchMovie(fetcher: (id: number | string) => Promise<MovieDetails>) {
  const queryClient = useQueryClient();

  return (id: number | string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.movie.detail(id),
      queryFn: () => fetcher(id),
      staleTime: 1000 * 60 * 5,
    });
  };
}

/**
 * Get movie from cache (synchronous)
 * 
 * Usage:
 * ```typescript
 * const movie = useMovieCache(550);
 * // Returns movie if cached, undefined otherwise
 * ```
 */
export function useMovieCache(id: number | string | null | undefined) {
  const queryClient = useQueryClient();

  if (id == null) return undefined;

  return queryClient.getQueryData<MovieDetails>(queryKeys.movie.detail(id));
}

/**
 * Invalidate movie cache
 * 
 * Usage:
 * ```typescript
 * const invalidateMovie = useInvalidateMovie();
 * await invalidateMovie(550);
 * ```
 */
export function useInvalidateMovie() {
  const queryClient = useQueryClient();

  return async (id: number | string) => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.movie.detail(id),
    });
  };
}

/**
 * Set movie data in cache
 * 
 * Usage:
 * ```typescript
 * const setMovie = useSetMovieCache();
 * setMovie(550, movieData);
 * ```
 */
export function useSetMovieCache() {
  const queryClient = useQueryClient();

  return (id: number | string, data: MovieDetails) => {
    queryClient.setQueryData(queryKeys.movie.detail(id), data);
  };
}
