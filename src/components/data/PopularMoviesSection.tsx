/**
 * Popular Movies Section - Real TMDb Data
 */

'use client';

import { usePopularMovies, usePrefetchMovie } from '@/lib/query';
import { TrendingUp } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { MovieCarouselSkeleton } from './MovieCarouselSkeleton';
import { ErrorState } from './ErrorState';

export default function PopularMoviesSection() {
  const { data, isLoading, isError, error, refetch } = usePopularMovies(1);
  const prefetchMovie = usePrefetchMovie();

  if (isLoading) {
    return <MovieCarouselSkeleton title="Popular Movies" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Popular Movies"
        message={error?.message || 'Failed to load popular movies'}
        onRetry={refetch}
      />
    );
  }

  const movies = data?.results || [];

  return (
    <section id="popular" className="py-12 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--color-primary))] flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[rgb(var(--color-foreground))]">
              Popular Movies
            </h2>
            <p className="text-sm text-[rgb(var(--color-foreground-muted))]">
              Most watched movies right now
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
