'use client';

import { useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import type { Movie } from '@/lib/mockData';

interface MovieCarouselProps {
  title: string;
  icon?: React.ReactNode;
  movies: Movie[];
  accent?: boolean;
  id?: string;
  onSeeAll?: () => void;
}

export default function MovieCarousel({ title, icon, movies, accent, id, onSeeAll }: MovieCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  return (
    <section id={id} className="relative py-12 md:py-16">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-[#E50914]/15 text-[#E50914]' : 'glass text-white'}`}>
                {icon}
              </div>
            )}
            <h2 className="section-title">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            {onSeeAll && (
              <button onClick={onSeeAll} className="text-sm text-[#8B8B8B] hover:text-[#E50914] transition-colors hidden sm:block">
                See all
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scroll('left')}
                className="w-9 h-9 rounded-xl glass border-white/8 flex items-center justify-center text-white/70 hover:text-white hover:border-white/20 transition-all"
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-9 h-9 rounded-xl glass border-white/8 flex items-center justify-center text-white/70 hover:text-white hover:border-white/20 transition-all"
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Track */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
        >
          {movies.map((movie, i) => (
            <div
              key={movie.id}
              className="snap-start shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]"
            >
              <MovieCard movie={movie} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
