/**
 * Incremental Cache Updates
 * 
 * Entity-level cache updates instead of invalidating entire queries.
 * Like Netflix - when movie 550 changes, only update that movie
 * in all queries that contain it, don't refetch everything.
 * 
 * Implements:
 * - Entity normalization
 * - Selective cache updates
 * - Optimistic updates with rollback
 * - Partial query updates
 */

import { QueryClient } from '@tanstack/react-query';
import type { Movie, MovieDetails } from '../types/movie';

/**
 * Normalized entity store
 */
interface NormalizedStore {
  movies: Map<number, MovieDetails>;
  lists: Map<string, number[]>;
  metadata: Map<string, any>;
}

/**
 * Entity Cache Manager
 * Manages normalized entity cache for efficient updates
 */
export class EntityCacheManager {
  private store: NormalizedStore = {
    movies: new Map(),
    lists: new Map(),
    metadata: new Map(),
  };

  /**
   * Normalize movie into store
   */
  normalizeMovie(movie: MovieDetails): void {
    this.store.movies.set(movie.id, movie);
  }

  /**
   * Normalize movie list
   */
  normalizeList(listKey: string, movies: Movie[]): void {
    // Store just IDs
    const ids = movies.map((m) => m.id);
    this.store.lists.set(listKey, ids);

    // Store movie entities
    movies.forEach((movie) => {
      // Only store if not already present (don't overwrite detailed data)
      if (!this.store.movies.has(movie.id)) {
        this.store.movies.set(movie.id, movie as MovieDetails);
      }
    });
  }

  /**
   * Get movie by ID
   */
  getMovie(id: number): MovieDetails | undefined {
    return this.store.movies.get(id);
  }

  /**
   * Update movie (partial)
   */
  updateMovie(id: number, updates: Partial<MovieDetails>): MovieDetails | null {
    const movie = this.store.movies.get(id);
    if (!movie) return null;

    const updated = { ...movie, ...updates };
    this.store.movies.set(id, updated);
    return updated;
  }

  /**
   * Get list by key
   */
  getList(listKey: string): MovieDetails[] {
    const ids = this.store.lists.get(listKey) || [];
    return ids.map((id) => this.store.movies.get(id)!).filter(Boolean);
  }

  /**
   * Remove movie from store
   */
  removeMovie(id: number): void {
    this.store.movies.delete(id);

    // Remove from lists
    for (const [key, ids] of this.store.lists) {
      const index = ids.indexOf(id);
      if (index !== -1) {
        ids.splice(index, 1);
        this.store.lists.set(key, ids);
      }
    }
  }

  /**
   * Clear all
   */
  clear(): void {
    this.store.movies.clear();
    this.store.lists.clear();
    this.store.metadata.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      movieCount: this.store.movies.size,
      listCount: this.store.lists.size,
      metadataCount: this.store.metadata.size,
    };
  }
}

/**
 * Global entity cache
 */
export const entityCache = new EntityCacheManager();

/**
 * Incremental update utilities
 */
export class IncrementalUpdateManager {
  constructor(private queryClient: QueryClient) {}

  /**
   * Update single movie across all queries
   */
  updateMovie(movieId: number, updates: Partial<MovieDetails>): void {
    // Update in entity cache
    const updated = entityCache.updateMovie(movieId, updates);
    if (!updated) return;

    // Update in single movie query
    this.queryClient.setQueryData(['movie', movieId], updated);

    // Update in all list queries that contain this movie
    this.updateMovieInLists(movieId, updates);

    // Update in search queries
    this.updateMovieInSearches(movieId, updates);
  }

  /**
   * Update movie in all list queries
   */
  private updateMovieInLists(movieId: number, updates: Partial<MovieDetails>): void {
    const queryCache = this.queryClient.getQueryCache();
    const queries = queryCache.getAll();

    for (const query of queries) {
      const queryKey = query.queryKey;
      
      // Check if this is a list query (popular, topRated, etc.)
      if (this.isListQuery(queryKey)) {
        const data = query.state.data as any;
        
        if (!data) continue;

        // Handle paginated response
        if (data.results) {
          const updated = this.updateMovieInArray(data.results, movieId, updates);
          if (updated) {
            this.queryClient.setQueryData(queryKey, { ...data, results: updated });
          }
        }

        // Handle infinite query
        if (data.pages) {
          const updatedPages = data.pages.map((page: any) => {
            if (!page.results) return page;
            const updated = this.updateMovieInArray(page.results, movieId, updates);
            return updated ? { ...page, results: updated } : page;
          });

          this.queryClient.setQueryData(queryKey, { ...data, pages: updatedPages });
        }
      }
    }
  }

  /**
   * Update movie in search queries
   */
  private updateMovieInSearches(movieId: number, updates: Partial<MovieDetails>): void {
    const queryCache = this.queryClient.getQueryCache();
    const queries = queryCache.getAll();

    for (const query of queries) {
      const queryKey = query.queryKey;
      
      if (this.isSearchQuery(queryKey)) {
        const data = query.state.data as any;
        if (!data?.results) continue;

        const updated = this.updateMovieInArray(data.results, movieId, updates);
        if (updated) {
          this.queryClient.setQueryData(queryKey, { ...data, results: updated });
        }
      }
    }
  }

  /**
   * Update movie in array
   */
  private updateMovieInArray(
    movies: Movie[],
    movieId: number,
    updates: Partial<MovieDetails>
  ): Movie[] | null {
    const index = movies.findIndex((m) => m.id === movieId);
    if (index === -1) return null;

    const updatedMovies = [...movies];
    updatedMovies[index] = { ...updatedMovies[index], ...updates };
    return updatedMovies;
  }

  /**
   * Check if query is a list query
   */
  private isListQuery(queryKey: unknown[]): boolean {
    const key = queryKey[0] as string;
    return ['popular', 'topRated', 'nowPlaying', 'upcoming'].some((k) => key?.includes(k));
  }

  /**
   * Check if query is a search query
   */
  private isSearchQuery(queryKey: unknown[]): boolean {
    const key = queryKey[0] as string;
    return key?.includes('search');
  }

  /**
   * Optimistic update with rollback
   */
  async optimisticUpdate<T>(
    queryKey: unknown[],
    updater: (old: T) => T,
    mutationFn: () => Promise<T>
  ): Promise<T> {
    // Cancel outgoing refetches
    await this.queryClient.cancelQueries({ queryKey });

    // Snapshot previous value
    const previousValue = this.queryClient.getQueryData<T>(queryKey);

    // Optimistically update
    this.queryClient.setQueryData(queryKey, updater);

    try {
      // Perform mutation
      const result = await mutationFn();
      
      // Update with server response
      this.queryClient.setQueryData(queryKey, result);
      
      return result;
    } catch (error) {
      // Rollback on error
      this.queryClient.setQueryData(queryKey, previousValue);
      throw error;
    }
  }

  /**
   * Batch update multiple movies
   */
  batchUpdateMovies(updates: Array<{ id: number; updates: Partial<MovieDetails> }>): void {
    updates.forEach(({ id, updates: movieUpdates }) => {
      this.updateMovie(id, movieUpdates);
    });
  }

  /**
   * Update movie rating (common case)
   */
  updateMovieRating(movieId: number, newRating: number): void {
    this.updateMovie(movieId, { vote_average: newRating });
  }

  /**
   * Update movie release date (common case)
   */
  updateMovieReleaseDate(movieId: number, releaseDate: string): void {
    this.updateMovie(movieId, { release_date: releaseDate });
  }

  /**
   * Add movie to list (optimistic)
   */
  addMovieToList(listKey: unknown[], movie: Movie): void {
    const data = this.queryClient.getQueryData<any>(listKey);
    if (!data) return;

    // Handle paginated response
    if (data.results) {
      this.queryClient.setQueryData(listKey, {
        ...data,
        results: [movie, ...data.results],
        total_results: (data.total_results || 0) + 1,
      });
    }

    // Handle infinite query
    if (data.pages) {
      const updatedPages = [...data.pages];
      if (updatedPages[0]) {
        updatedPages[0] = {
          ...updatedPages[0],
          results: [movie, ...updatedPages[0].results],
        };
      }
      this.queryClient.setQueryData(listKey, { ...data, pages: updatedPages });
    }
  }

  /**
   * Remove movie from list (optimistic)
   */
  removeMovieFromList(listKey: unknown[], movieId: number): void {
    const data = this.queryClient.getQueryData<any>(listKey);
    if (!data) return;

    // Handle paginated response
    if (data.results) {
      this.queryClient.setQueryData(listKey, {
        ...data,
        results: data.results.filter((m: Movie) => m.id !== movieId),
        total_results: Math.max((data.total_results || 0) - 1, 0),
      });
    }

    // Handle infinite query
    if (data.pages) {
      const updatedPages = data.pages.map((page: any) => ({
        ...page,
        results: page.results.filter((m: Movie) => m.id !== movieId),
      }));
      this.queryClient.setQueryData(listKey, { ...data, pages: updatedPages });
    }
  }

  /**
   * Patch query data (partial update)
   */
  patchQueryData<T extends Record<string, any>>(
    queryKey: unknown[],
    patches: Partial<T>
  ): void {
    this.queryClient.setQueryData<T>(queryKey, (old) => {
      if (!old) return old;
      return { ...old, ...patches };
    });
  }

  /**
   * Update nested field in query data
   */
  updateNestedField(
    queryKey: unknown[],
    path: string[],
    value: any
  ): void {
    this.queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;

      const updated = { ...old };
      let current = updated;

      // Navigate to parent
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }

      // Update final field
      current[path[path.length - 1]] = value;

      return updated;
    });
  }
}

/**
 * React hook for incremental updates
 */
export function useIncrementalUpdates(queryClient: QueryClient) {
  const manager = new IncrementalUpdateManager(queryClient);

  return {
    updateMovie: (id: number, updates: Partial<MovieDetails>) =>
      manager.updateMovie(id, updates),
    
    batchUpdate: (updates: Array<{ id: number; updates: Partial<MovieDetails> }>) =>
      manager.batchUpdateMovies(updates),
    
    addToList: (listKey: unknown[], movie: Movie) =>
      manager.addMovieToList(listKey, movie),
    
    removeFromList: (listKey: unknown[], movieId: number) =>
      manager.removeMovieFromList(listKey, movieId),
    
    optimisticUpdate: <T,>(
      queryKey: unknown[],
      updater: (old: T) => T,
      mutationFn: () => Promise<T>
    ) => manager.optimisticUpdate(queryKey, updater, mutationFn),
  };
}

/**
 * Mutation helpers with automatic cache updates
 */
export function createOptimisticMutation<TData, TVariables>(
  queryClient: QueryClient,
  config: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onMutate: (variables: TVariables) => { previousData: any; rollback: () => void };
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: any, variables: TVariables, context: any) => void;
  }
) {
  return {
    mutationFn: config.mutationFn,
    
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries();
      
      // Execute custom onMutate
      const context = config.onMutate(variables);
      
      return context;
    },
    
    onError: (error: any, variables: TVariables, context: any) => {
      // Rollback
      if (context?.rollback) {
        context.rollback();
      }
      
      // Custom error handler
      if (config.onError) {
        config.onError(error, variables, context);
      }
    },
    
    onSuccess: (data: TData, variables: TVariables) => {
      // Custom success handler
      if (config.onSuccess) {
        config.onSuccess(data, variables);
      }
    },
    
    onSettled: () => {
      // Always refetch related queries
      queryClient.invalidateQueries();
    },
  };
}
