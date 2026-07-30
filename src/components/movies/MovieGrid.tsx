/**
 * MovieGrid Component (Client Island)
 * 
 * Responsive grid layout for movie cards with infinite scroll.
 */

'use client';

import { useEffect, useRef } from 'react';
import { MovieCard, MovieCardSkeleton } from './MovieCard';
import type { Movie } from '@/lib/data/types/movie';
import { cn } from '@/lib/utils';

interface MovieGridProps {
  movies: Movie[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onPrefetch?: (id: number) => void;
  className?: string;
}

export function MovieGrid({
  movies,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onPrefetch,
  className,
}: MovieGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  return (
    <div className={className}>
      {/* Movie Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie, index) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onPrefetch={onPrefetch}
            priority={index < 6} // Prioritize first 6 images
          />
        ))}

        {/* Loading Skeletons */}
        {isLoading &&
          Array.from({ length: 12 }).map((_, i) => <MovieCardSkeleton key={`skeleton-${i}`} />)}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && !isLoading && (
        <div ref={observerTarget} className="mt-8 flex justify-center">
          <div className="h-10 w-10" />
        </div>
      )}

      {/* End Message */}
      {!hasMore && movies.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          You've reached the end
        </div>
      )}

      {/* No Results */}
      {!isLoading && movies.length === 0 && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-muted-foreground">No movies found</p>
            <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        </div>
      )}
    </div>
  );
}
