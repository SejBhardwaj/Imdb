'use client';

import { useState, useMemo } from 'react';
import { Clapperboard, Star } from 'lucide-react';
import MovieCard from './MovieCard';
import GenreFilter from './GenreFilter';
import { TRENDING_MOVIES, TOP_RATED_MOVIES, UPCOMING_MOVIES } from '@/lib/mockData';

export default function MoviesSection() {
  const [activeGenre, setActiveGenre] = useState('All');

  const allMovies = useMemo(() => [...TRENDING_MOVIES, ...TOP_RATED_MOVIES.slice(0, 3), ...UPCOMING_MOVIES], []);

  const filteredMovies = useMemo(() => {
    if (activeGenre === 'All') return allMovies;
    return allMovies.filter((m) => m.genres.includes(activeGenre));
  }, [allMovies, activeGenre]);

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
        {filteredMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMovies.map((movie, i) => (
              <MovieCard key={`${movie.id}-${i}`} movie={movie} index={i} />
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
