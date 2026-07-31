/**
 * L2 Next.js Cache Wrapper
 * 
 * Wrapper around Next.js cache with tag-based revalidation
 */

import { unstable_cache, revalidateTag } from 'next/cache';

export interface NextCacheOptions {
  revalidate?: number | false;
  tags?: string[];
}

/**
 * Cache function result with Next.js cache
 */
export function cacheWithNext<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  options: NextCacheOptions = {}
): T {
  return unstable_cache(
    fn,
    keyParts,
    {
      revalidate: options.revalidate,
      tags: options.tags,
    }
  ) as T;
}

/**
 * Revalidate by tags
 */
export function invalidateNextCache(tags: string[]): void {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}

/**
 * Generate cache tags for movie
 */
export function generateMovieTags(movieId: number): string[] {
  return [
    `movie:${movieId}`,
    'movies',
  ];
}

/**
 * Generate cache tags for movie list
 */
export function generateMovieListTags(listType: string, page?: number): string[] {
  const tags = [`movies:${listType}`, 'movies'];
  
  if (page) {
    tags.push(`movies:${listType}:page:${page}`);
  }

  return tags;
}

/**
 * Generate cache tags for search
 */
export function generateSearchTags(query: string, page?: number): string[] {
  const tags = [`search:${query}`, 'search'];
  
  if (page) {
    tags.push(`search:${query}:page:${page}`);
  }

  return tags;
}

/**
 * Generate cache tags for recommendations
 */
export function generateRecommendationTags(movieId: number): string[] {
  return [
    `recommendations:${movieId}`,
    'recommendations',
  ];
}

/**
 * Generate cache tags for similar movies
 */
export function generateSimilarTags(movieId: number): string[] {
  return [
    `similar:${movieId}`,
    'similar',
  ];
}
