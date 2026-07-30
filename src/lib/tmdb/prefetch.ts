/**
 * Adjacent Movie Prefetching
 * 
 * Preloads next/previous movies after current movie loads
 * Makes navigation feel instant
 */

import { requestCache, createCacheKey } from './cache';

interface PrefetchOptions {
  priority?: 'high' | 'low';
  delay?: number; // ms to wait before prefetch
}

/**
 * Prefetch adjacent movies (next and previous)
 */
export async function prefetchAdjacentMovies(
  currentMovieId: number,
  options: PrefetchOptions = {}
): Promise<void> {
  const { priority = 'low', delay = 0 } = options;

  // Wait if delay specified
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const adjacentIds = [
    currentMovieId - 1, // Previous
    currentMovieId + 1, // Next
  ];

  console.log(`[Prefetch] Adjacent movies for ${currentMovieId}:`, adjacentIds);

  // Prefetch in parallel
  const prefetchPromises = adjacentIds.map(id => 
    prefetchMovie(id, { priority })
  );

  await Promise.allSettled(prefetchPromises);
}

/**
 * Prefetch single movie
 */
export async function prefetchMovie(
  movieId: number,
  options: PrefetchOptions = {}
): Promise<void> {
  const { priority = 'low' } = options;

  try {
    // Use link prefetch if supported
    if (typeof document !== 'undefined' && 'createElement' in document) {
      const link = document.createElement('link');
      link.rel = priority === 'high' ? 'preload' : 'prefetch';
      link.as = 'fetch';
      link.href = `/api/movies/${movieId}`;
      link.crossOrigin = 'anonymous';
      
      document.head.appendChild(link);
      
      console.log(`[Prefetch] Link prefetch: movie ${movieId} (${priority})`);
    }

    // Also warm the cache
    const cacheKey = createCacheKey('movie', movieId);
    await requestCache.prefetch(
      cacheKey,
      async () => {
        const response = await fetch(`/api/tmdb/movie/${movieId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      },
      10 * 60 * 1000 // 10 minute cache
    );
  } catch (error) {
    console.warn(`[Prefetch] Failed to prefetch movie ${movieId}:`, error);
  }
}

/**
 * Prefetch movie images
 */
export async function prefetchMovieImages(
  images: string[],
  options: PrefetchOptions = {}
): Promise<void> {
  const { priority = 'low' } = options;

  if (typeof document === 'undefined') return;

  images.forEach(src => {
    const link = document.createElement('link');
    link.rel = priority === 'high' ? 'preload' : 'prefetch';
    link.as = 'image';
    link.href = src;
    
    document.head.appendChild(link);
  });

  console.log(`[Prefetch] Images: ${images.length} images (${priority})`);
}

/**
 * Prefetch video (trailer)
 */
export async function prefetchVideo(
  videoUrl: string,
  options: PrefetchOptions = {}
): Promise<void> {
  const { priority = 'low' } = options;

  if (typeof document === 'undefined') return;

  try {
    const link = document.createElement('link');
    link.rel = priority === 'high' ? 'preload' : 'prefetch';
    link.as = 'video';
    link.href = videoUrl;
    
    document.head.appendChild(link);
    
    console.log(`[Prefetch] Video: ${videoUrl} (${priority})`);
  } catch (error) {
    console.warn(`[Prefetch] Failed to prefetch video:`, error);
  }
}

/**
 * Prefetch on hover (intersection observer)
 */
export function usePrefetchOnHover(
  movieId: number,
  enabled: boolean = true
): {
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  const handlePrefetch = () => {
    if (!enabled) return;
    
    prefetchMovie(movieId, { priority: 'high' }).catch(console.warn);
  };

  return {
    onMouseEnter: handlePrefetch,
    onFocus: handlePrefetch,
  };
}

/**
 * Prefetch on intersection (viewport)
 */
export function observePrefetch(
  element: HTMLElement,
  movieId: number,
  options: PrefetchOptions = {}
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    return () => {}; // No-op cleanup
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          prefetchMovie(movieId, options);
          observer.disconnect(); // Prefetch once
        }
      });
    },
    {
      rootMargin: '50px', // Start prefetch 50px before visible
    }
  );

  observer.observe(element);

  // Return cleanup function
  return () => observer.disconnect();
}

/**
 * Batch prefetch multiple movies
 */
export async function prefetchMovies(
  movieIds: number[],
  options: PrefetchOptions = {}
): Promise<void> {
  const { delay = 100 } = options; // Stagger requests

  for (let index = 0; index < movieIds.length; index++) {
    const movieId = movieIds[index];
    // Stagger to avoid overwhelming the browser
    if (index > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    prefetchMovie(movieId, options).catch(console.warn);
  }

  console.log(`[Prefetch] Batch: ${movieIds.length} movies`);
}

/**
 * Smart prefetch based on user behavior
 */
export class SmartPrefetcher {
  private visitedMovies = new Set<number>();
  private prefetchedMovies = new Set<number>();

  /**
   * Record movie visit
   */
  public visit(movieId: number): void {
    this.visitedMovies.add(movieId);

    // Prefetch adjacent if not already done
    if (!this.prefetchedMovies.has(movieId)) {
      this.prefetchedMovies.add(movieId);
      
      // Prefetch after short delay to not interfere with current page
      setTimeout(() => {
        prefetchAdjacentMovies(movieId, { delay: 1000 });
      }, 500);
    }
  }

  /**
   * Get visit history
   */
  public getHistory(): number[] {
    return Array.from(this.visitedMovies);
  }

  /**
   * Clear history
   */
  public clear(): void {
    this.visitedMovies.clear();
    this.prefetchedMovies.clear();
  }
}

// Singleton instance
export const smartPrefetcher = new SmartPrefetcher();
