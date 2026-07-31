/**
 * Trending Movies Section - Real TMDb Data
 */

'use client';

import { useTrendingMovies, usePrefetchMovie } from '@/lib/query';
import { Flame } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { MovieCarouselSkeleton } from './MovieCarouselSkeleton';
import { ErrorState } from './ErrorState';

export default function TrendingMoviesSection() {
  const { data, isLoading, isError, error, refetch } = useTrendingMovies('week', 1);
  const prefetchMovie = usePrefetchMovie();

  if (isLoading) {
    return <MovieCarouselSkeleton title="Trending Today" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Trending Today"
        message={error?.message || 'Failed to load trending movies'}
        onRetry={refetch}
      />
    );
  }

  const movies = data?.results || [];

  return (
    <section id="trending" className="py-12 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--color-primary))] flex items-center justify-center">
            <Flame size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[rgb(var(--color-foreground))]">
              Trending Today
            </h2>
            <p className="text-sm text-[rgb(var(--color-foreground-muted))]">
              Most popular movies this week
            </p>
          </div>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {movies.slice(0, 12).map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onHover={() => prefetchMovie(movie.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
