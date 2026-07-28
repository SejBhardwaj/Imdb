/**
 * Server Actions for Data Layer
 * 
 * Server-side functions for data fetching and cache management.
 * Used in React Server Components.
 */

'use server';

import { MovieRepository } from './repositories/MovieRepository';
import { providerRegistry } from './providers/MovieProvider';
import { TMDbProvider } from './providers/TMDbProvider';
import { MemoryCacheAdapter } from './cache/CacheManager';
import { createCacheWithFallback } from './cache/RedisCacheAdapter';
import type { MovieDetails, PaginatedResponse, Movie, MovieFilters } from './types/movie';

/**
 * Initialize repository (singleton pattern for server)
 */
let repositoryInstance: MovieRepository | null = null;

function getRepository(): MovieRepository {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  // Check for TMDb API key
  const tmdbApiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!tmdbApiKey) {
    throw new Error('TMDB_API_KEY environment variable is required');
  }

  // Register TMDb provider
  const tmdbProvider = new TMDbProvider({
    apiKey: tmdbApiKey,
    language: 'en-US',
  });

  if (!providerRegistry.has('tmdb')) {
    providerRegistry.register('tmdb', tmdbProvider);
  }

  // Create cache (Redis with fallback to memory)
  const cache = createCacheWithFallback({
    namespace: 'movies',
    enableStats: true,
  });

  // Create repository
  repositoryInstance = new MovieRepository({
    primaryProvider: 'tmdb',
    cache,
    enableDeduplication: true,
  });

  return repositoryInstance;
}

/**
 * Server Action: Get movie by ID
 */
export async function getMovieAction(id: number | string): Promise<MovieDetails> {
  const repo = getRepository();
  return repo.getMovie(id);
}

/**
 * Server Action: Get popular movies
 */
export async function getPopularMoviesAction(page: number = 1): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.getPopularMovies(page);
}

/**
 * Server Action: Get top-rated movies
 */
export async function getTopRatedMoviesAction(page: number = 1): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.getTopRatedMovies(page);
}

/**
 * Server Action: Get now playing movies
 */
export async function getNowPlayingMoviesAction(page: number = 1): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.getNowPlayingMovies(page);
}

/**
 * Server Action: Get upcoming movies
 */
export async function getUpcomingMoviesAction(page: number = 1): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.getUpcomingMovies(page);
}

/**
 * Server Action: Search movies
 */
export async function searchMoviesAction(
  query: string,
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.searchMovies(query, page);
}

/**
 * Server Action: Search movies with filters
 */
export async function searchMoviesWithFiltersAction(
  query: string,
  filters: MovieFilters,
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.searchMoviesWithFilters(query, filters, page);
}

/**
 * Server Action: Get movie recommendations
 */
export async function getRecommendationsAction(
  movieId: number,
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.getRecommendations(movieId, page);
}

/**
 * Server Action: Get similar movies
 */
export async function getSimilarMoviesAction(
  movieId: number,
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.getSimilarMovies(movieId, page);
}

/**
 * Server Action: Get movie credits
 */
export async function getMovieCreditsAction(movieId: number) {
  const repo = getRepository();
  return repo.getMovieCredits(movieId);
}

/**
 * Server Action: Get movie videos
 */
export async function getMovieVideosAction(movieId: number) {
  const repo = getRepository();
  return repo.getMovieVideos(movieId);
}

/**
 * Server Action: Get movie images
 */
export async function getMovieImagesAction(movieId: number) {
  const repo = getRepository();
  return repo.getMovieImages(movieId);
}

/**
 * Server Action: Discover by genre
 */
export async function discoverByGenreAction(
  genreId: number,
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  const repo = getRepository();
  return repo.discoverByGenre(genreId, page);
}

/**
 * Server Action: Get image URL
 */
export function getImageUrlAction(path: string, size?: 'small' | 'medium' | 'large' | 'original'): string {
  const repo = getRepository();
  return repo.getImageUrl(path, size);
}

/**
 * Server Action: Prefetch movie (for hover prefetching)
 */
export async function prefetchMovieAction(id: number): Promise<void> {
  const repo = getRepository();
  await repo.prefetchMovie(id);
}

/**
 * Server Action: Batch get movies
 */
export async function getMoviesBatchAction(ids: number[]): Promise<MovieDetails[]> {
  const repo = getRepository();
  return repo.getMoviesBatch(ids);
}

/**
 * Server Action: Invalidate movie cache
 */
export async function invalidateMovieCacheAction(id: number | string): Promise<void> {
  const repo = getRepository();
  await repo.invalidateMovie(id);
}

/**
 * Server Action: Invalidate cache by tags
 */
export async function invalidateCacheByTagsAction(tags: string[]): Promise<void> {
  const repo = getRepository();
  await repo.invalidateCache(tags);
}

/**
 * Get repository statistics (for debugging)
 */
export async function getRepositoryStatsAction() {
  const repo = getRepository();
  return repo.getStats();
}
