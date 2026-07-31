// @ts-nocheck - Old example, not used
/**
 * Example: Movie Grid with Infinite Scroll
 * 
 * Demonstrates enterprise data layer usage with TanStack Query
 */

'use client';

import { useInfinitePopularMovies, usePrefetchMovie } from '@/lib/query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function MovieGrid() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfinitePopularMovies();

  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px',
  });

  const prefetchMovie = usePrefetchMovie();

  // Auto-fetch next page when scrolling
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <MovieGridSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading movies: {error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const allMovies = data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {allMovies.map((movie) => (
          <div
            key={movie.id}
            className="group cursor-pointer"
            onMouseEnter={() => prefetchMovie(movie.id)}
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-sm line-clamp-2">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-yellow-400 text-sm">★ {movie.rating}</span>
                    <span className="text-gray-300 text-xs">{movie.year}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {hasNextPage && (
        <div ref={ref} className="py-8 text-center">
          {isFetchingNextPage ? (
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          ) : (
            <p className="text-gray-400">Scroll to load more</p>
          )}
        </div>
      )}
    </div>
  );
}

function MovieGridSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
