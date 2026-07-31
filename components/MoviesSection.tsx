'use client';

import { useState, useMemo } from 'react';
import { Clapperboard, Star } from 'lucide-react';
import { MovieCard } from '@/components/data/MovieCard';
import GenreFilter from './GenreFilter';
import { useDiscoverMovies, useGenres, usePrefetchMovie } from '@/lib/query/hooks';

export default function MoviesSection() {
  const [activeGenre, setActiveGenre] = useState('All');
  const prefetchMovie = usePrefetchMovie();

  // Get genres for filter
  const { data: genresData } = useGenres();

  // Build discover options based on selected genre
  const discoverOptions = useMemo(() => {
    if (activeGenre === 'All') {
      return { page: 1, sort_by: 'popularity.desc' };
    }
    
    // Find genre ID from name
    const genre = genresData?.find(g => g.name === activeGenre);
    if (!genre) return { page: 1, sort_by: 'popularity.desc' };
    
    return {
      page: 1,
      sort_by: 'popularity.desc',
      with_genres: genre.id.toString(),
    };
  }, [activeGenre, genresData]);

  const { data, isLoading, isError } = useDiscoverMovies(discoverOptions);

  const movies = data?.results || [];

  return (
    <section id="movies" className="relative py-16 md:py-24">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E50914]/15 text-[#E50914]">
              <Clapperboard size={20} />
            </div>
            <div>
              <h2 className="section-title">Discover Movies</h2>
              <p className="text-sm text-[#8B8B8B] mt-0.5">Browse by genre and find your next favourite</p>
            </div>
          </div>
        </div>

        {/* Genre Filter */}
        <div className="mb-10 -mx-6 px-6">
          <GenreFilter active={activeGenre} onChange={setActiveGenre} />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-[rgb(var(--color-surface))] animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-4">
              <Star size={24} className="text-[#8B8B8B]" />
            </div>
            <p className="text-white font-medium mb-1">Failed to load movies</p>
            <p className="text-sm text-[#8B8B8B]">Please try again later</p>
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie, i) => (
              <MovieCard 
                key={`${movie.id}-${i}`} 
                movie={movie} 
                onHover={() => prefetchMovie(movie.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-4">
              <Star size={24} className="text-[#8B8B8B]" />
            </div>
            <p className="text-white font-medium mb-1">No movies found</p>
            <p className="text-sm text-[#8B8B8B]">Try a different genre filter</p>
          </div>
        )}
      </div>
    </section>
  );
}
