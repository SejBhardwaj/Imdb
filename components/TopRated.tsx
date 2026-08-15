'use client';

import { Star, Trophy } from 'lucide-react';
import { TOP_RATED_MOVIES } from '@/lib/mockData';
import { MoviePoster } from '@/components/images/MoviePoster';

export default function TopRated() {
  return (
    <section id="toprated" className="relative py-16 md:py-24 bg-gradient-to-b from-transparent via-[#0d0d0d] to-transparent">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FFB703]/15 text-[#FFB703]">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="section-title">Top Rated of All Time</h2>
              <p className="text-sm text-[#8B8B8B] mt-0.5">The highest acclaimed films ever made</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {TOP_RATED_MOVIES.map((movie, index) => (
            <div
              key={movie.id}
              className="group relative flex items-center gap-4 p-3 rounded-2xl glass-card hover:border-white/15 transition-all duration-300 hover-lift fade-up"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/* Rank Number */}
              <div className="relative w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center flex-shrink-0">
                <span className="trending-number">{index + 1}</span>
              </div>

              {/* Poster */}
              <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-lg overflow-hidden flex-shrink-0">
                <MoviePoster
                  path={movie.poster}
                  alt={movie.title}
                  size="small"
                  fill
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-[#E50914] transition-colors truncate">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm text-[#CFCFCF]">
                  <span>{movie.year}</span>
                  <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
                  <span>{movie.runtime}</span>
                  <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
                  <span className="hidden sm:block truncate">{movie.director}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {movie.genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/60">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0 pr-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg rating-badge">
                  <Star size={14} className="text-[#FFB703] fill-[#FFB703]" />
                  <span className="text-base font-bold text-white">{movie.rating}</span>
                </div>
                <span className="text-[10px] text-[#8B8B8B]">{movie.votes} votes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
