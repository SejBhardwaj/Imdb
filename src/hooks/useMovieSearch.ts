// @ts-nocheck - Old hooks file, not used (use src/lib/query/hooks.ts)
/**
 * useMovieSearch Hook
 * 
 * React Query hooks for movie search functionality.
 * 
 * Features:
 * - Search with debouncing
 * - Search with filters
 * - Infinite scroll search
 * - Search suggestions
 */

'use client';

import { useQuery, useInfiniteQuery, type UseQueryOptions, type UseInfiniteQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query/queryClient';
import type { Movie, PaginatedResponse, MovieFilters, APIError } from '@/lib/data/types/movie';
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for movie search
 */
export function useMovieSearch(
  query: string,
  page: number,
  fetcher: (query: string, page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.search.query(query, page),
    queryFn: () => fetcher(query, page),
    enabled: query.length >= 2, // Minimum 2 characters
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Hook for movie search with infinite scroll
 */
export function useInfiniteMovieSearch(
  query: string,
  fetcher: (query: string, page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<
    UseInfiniteQueryOptions<PaginatedResponse<Movie>, APIError>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: [...queryKeys.search.query(query), 'infinite'],
    queryFn: ({ pageParam }) => fetcher(query, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for movie search with filters
 */
export function useMovieSearchWithFilters(
  query: string,
  filters: MovieFilters,
  page: number,
  fetcher: (query: string, filters: MovieFilters, page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Movie>, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: queryKeys.search.withFilters(query, filters, page),
    queryFn: () => fetcher(query, filters, page),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Hook for movie search with filters and infinite scroll
 */
export function useInfiniteMovieSearchWithFilters(
  query: string,
  filters: MovieFilters,
  fetcher: (query: string, filters: MovieFilters, page: number) => Promise<PaginatedResponse<Movie>>,
  options?: Omit<
    UseInfiniteQueryOptions<PaginatedResponse<Movie>, APIError>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) {
  return useInfiniteQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: [...queryKeys.search.withFilters(query, filters), 'infinite'],
    queryFn: ({ pageParam }) => fetcher(query, filters, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for debounced search
 * 
 * Usage:
 * ```typescript
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebouncedSearch(searchQuery, 500);
 * const { data } = useMovieSearch(debouncedQuery, 1, fetcher);
 * ```
 */
export function useDebouncedSearch(value: string, delay: number = 300): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Combined hook for search with debouncing
 * 
 * Usage:
 * ```typescript
 * const {
 *   query,
 *   setQuery,
 *   debouncedQuery,
 *   results,
 *   isLoading,
 *   isDebouncing
 * } = useSearchMovies(fetcher);
 * 
 * <input value={query} onChange={(e) => setQuery(e.target.value)} />
 * ```
 */
export function useSearchMovies(
  fetcher: (query: string, page: number) => Promise<PaginatedResponse<Movie>>,
  debounceDelay: number = 300
) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedSearch(query, debounceDelay);

  const searchResult = useMovieSearch(debouncedQuery, 1, fetcher);

  return {
    query,
    setQuery,
    debouncedQuery,
    results: searchResult.data?.results || [],
    isLoading: searchResult.isLoading,
    isFetching: searchResult.isFetching,
    isDebouncing: query !== debouncedQuery,
    error: searchResult.error,
    totalResults: searchResult.data?.totalResults || 0,
    totalPages: searchResult.data?.totalPages || 0,
  };
}

/**
 * Hook for search suggestions (minimal data, fast responses)
 * 
 * Usage:
 * ```typescript
 * const { suggestions, isLoading } = useMovieSearchSuggestions(query, fetcher);
 * ```
 */
export function useMovieSearchSuggestions(
  query: string,
  fetcher: (query: string, page: number) => Promise<PaginatedResponse<Movie>>,
  maxResults: number = 5
) {
  const debouncedQuery = useDebouncedSearch(query, 200); // Faster debounce for suggestions

  const searchResult = useQuery<PaginatedResponse<Movie>, APIError>({
    queryKey: [...queryKeys.search.query(debouncedQuery, 1), 'suggestions'],
    queryFn: () => fetcher(debouncedQuery, 1),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
    select: (data) => ({
      ...data,
      results: data.results.slice(0, maxResults), // Limit results
    }),
  });

  return {
    suggestions: searchResult.data?.results || [],
    isLoading: searchResult.isLoading,
    isFetching: searchResult.isFetching,
  };
}

/**
 * Hook for managing search history (client-side)
 * 
 * Usage:
 * ```typescript
 * const {
 *   history,
 *   addToHistory,
 *   clearHistory,
 *   removeFromHistory
 * } = useSearchHistory();
 * ```
 */
export function useSearchHistory(maxHistorySize: number = 10) {
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('movie-search-history');
    return saved ? JSON.parse(saved) : [];
  });

  const addToHistory = useCallback(
    (query: string) => {
      if (!query || query.length < 2) return;

      setHistory((prev) => {
        // Remove duplicates and add to front
        const filtered = prev.filter((item) => item.toLowerCase() !== query.toLowerCase());
        const updated = [query, ...filtered].slice(0, maxHistorySize);

        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('movie-search-history', JSON.stringify(updated));
        }

        return updated;
      });
    },
    [maxHistorySize]
  );

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item !== query);

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('movie-search-history', JSON.stringify(updated));
      }

      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('movie-search-history');
    }
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
