'use client';

import { Play, Star, Clock, Calendar, Plus, Heart, Share2, Award, Film } from 'lucide-react';
import { usePopularMovies } from '@/lib/query/hooks';

export default function FeaturedMovie() {
  const { data, isLoading } = usePopularMovies(1);

  // Use second popular movie as featured (first is in hero)
  const movie = data?.results?.[1];

  if (isLoading || !movie) {
    return (
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative rounded-3xl overflow-hidden bg-[rgb(var(--color-surface))] aspect-[16/10] animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-[rgb(var(--color-surface))] rounded animate-pulse w-3/4" />
              <div className="h-4 bg-[rgb(var(--color-surface))] rounded animate-pulse w-1/2" />
              <div className="h-20 bg-[rgb(var(--color-surface))] rounded animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Backdrop Image */}
          <div className="relative fade-up">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#E50914]/20 via-transparent to-transparent rounded-3xl blur-2xl opacity-60" />
            <div className="relative rounded-3xl overflow-hidden poster-shadow group">
              <img src={movie.backdrop} alt={movie.title} className="w-full aspect-[16/10] object-cover" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl" />
              {/* Play button overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                  <Play size={24} className="text-white fill-white ml-1" />
                </button>
              </div>
              {/* Floating rating badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-dark border border-white/10">
                <Star size={14} className="text-[#FFB703] fill-[#FFB703]" />
                <span className="text-sm font-bold text-white">{movie.rating}</span>
              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div className="fade-up stagger-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFB703]/10 border border-[#FFB703]/20">
                <Award size={13} className="text-[#FFB703]" />
                <span className="text-xs font-bold text-[#FFB703] uppercase tracking-wider">Featured Collection</span>
              </div>
            </div>

            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-3">
              {movie.title}
            </h2>
            {movie.tagline && (
              <p className="text-base text-[#E50914] italic mb-6">"{movie.tagline}"</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="flex items-center gap-1.5 text-sm text-[#CFCFCF]">
                <Calendar size={14} /> {movie.year}
              </span>
              {movie.runtime && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
                  <span className="flex items-center gap-1.5 text-sm text-[#CFCFCF]">
                    <Clock size={14} /> {movie.runtime}
                  </span>
                </>
              )}
              {movie.certification && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
                  <span className="text-sm text-[#CFCFCF]">{movie.certification}</span>
                </>
              )}
            </div>

            <p className="text-base text-[#CFCFCF] leading-relaxed mb-6">{movie.overview}</p>

            {/* Cast */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#8B8B8B] uppercase tracking-widest mb-2">Starring</p>
                <p className="text-sm text-white">{movie.cast.join(', ')}</p>
              </div>
            )}

            {/* Director */}
            {movie.director && (
              <div className="mb-8">
                <p className="text-xs text-[#8B8B8B] uppercase tracking-widest mb-2">Director</p>
                <p className="text-sm text-white">{movie.director}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary">
                <Play size={16} className="fill-white" />
                Watch Trailer
              </button>
              <button className="btn-secondary">
                <Plus size={16} />
                Watchlist
              </button>
              <button className="btn-secondary">
                <Heart size={16} />
                Favourite
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
