'use client';

import { useState, useEffect } from 'react';
import { Play, Star, Clock, Calendar, Plus, Share2, ChevronDown, Flame } from 'lucide-react';
import { useTrendingMovies } from '@/lib/query/hooks';
import { MovieBackdrop } from '@/components/images/MovieBackdrop';
import { MoviePoster } from '@/components/images/MoviePoster';

export default function HeroSection() {
  const [scrollY, setScrollY] = useState(0);
  const { data, isLoading } = useTrendingMovies('week', 1);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Use first trending movie as hero
  const movie = data?.results?.[0];

  if (isLoading || !movie) {
    return (
      <section className="relative w-full h-screen min-h-[700px] overflow-hidden mt-[100px]">
        <div className="absolute inset-0 bg-[rgb(var(--color-surface))] animate-pulse" />
      </section>
    );
  }

  return (
    <section className="relative w-full h-screen min-h-[700px] overflow-hidden mt-[100px]">
      {/* Backdrop with Parallax */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${scrollY * 0.35}px) scale(1.05)`,
          transition: 'transform 0.1s linear',
        }}
      >
        <MovieBackdrop
          path={movie.backdrop}
          alt={movie.title}
          size="original"
          priority
          quality={90}
          className="w-full h-full"
        />
        {/* Layered gradients */}
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 hero-bottom-gradient" />
        <div className="absolute inset-0 hero-vignette opacity-40" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 flex flex-col justify-end pb-24 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-end">
          {/* Left: Info */}
          <div className="max-w-2xl">
            {/* Trending Badge */}
            <div className="flex items-center gap-2 mb-6 fade-up stagger-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-[#E50914]/30">
                <Flame size={14} className="text-[#E50914]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Trending #1 Today</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full glass border-white/8">
                <span className="text-xs text-[#CFCFCF]">{Math.round((movie.popularity || 0) / 10)}% Popularity</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.95] mb-4 fade-up stagger-2">
              {movie.title}
            </h1>

            {/* Tagline */}
            {movie.tagline && (
              <p className="text-lg text-[#E50914] font-medium italic mb-6 fade-up stagger-2">
                "{movie.tagline}"
              </p>
            )}

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-3 mb-6 fade-up stagger-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg rating-badge">
                <Star size={14} className="text-[#FFB703] fill-[#FFB703]" />
                <span className="text-sm font-bold text-white">{movie.rating}</span>
              </div>
              <span className="text-sm text-[#CFCFCF]">{movie.year}</span>
              <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
              {movie.runtime && (
                <>
                  <span className="text-sm text-[#CFCFCF]">{movie.runtime}</span>
                  <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
                </>
              )}
              {movie.certification && (
                <>
                  <span className="text-sm text-[#CFCFCF]">{movie.certification}</span>
                  <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
                </>
              )}
              {movie.language && (
                <span className="text-sm text-[#CFCFCF] hidden sm:block">{movie.language}</span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-6 fade-up stagger-3">
              {movie.genres.map((genre) => (
                <span key={genre} className="px-3 py-1 rounded-full glass text-xs text-white/80 border-white/8">
                  {genre}
                </span>
              ))}
            </div>

            {/* Overview */}
            <p className="text-base md:text-lg text-[#CFCFCF] leading-relaxed mb-8 line-clamp-3 fade-up stagger-4 max-w-xl">
              {movie.overview}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 fade-up stagger-5">
              <button className="btn-primary group">
                <Play size={16} className="fill-white" />
                Watch Trailer
              </button>
              <button className="btn-secondary">
                <Plus size={16} />
                Add to Watchlist
              </button>
              <button className="btn-secondary">
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>

          {/* Right: Floating Poster (Desktop only) */}
          <div className="hidden lg:block w-64 xl:w-72 fade-up stagger-3">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-br from-[#E50914]/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative poster-shadow rounded-2xl overflow-hidden card-hover">
                <MoviePoster
                  path={movie.poster}
                  alt={movie.title}
                  size="large"
                  priority
                  className="w-full aspect-[2/3]"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
                {movie.director && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="text-xs text-white/60 mb-1">Director</p>
                    <p className="text-sm text-white font-medium">{movie.director}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 animate-float">
          <span className="text-[10px] text-[#8B8B8B] uppercase tracking-[0.2em]">Scroll</span>
          <ChevronDown size={16} className="text-[#8B8B8B]" />
        </div>
      </div>
    </section>
  );
}
