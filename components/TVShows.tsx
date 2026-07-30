'use client';

import { Tv, Star } from 'lucide-react';
import { TV_SHOWS } from '@/lib/mockData';

export default function TVShows() {
  return (
    <section id="tvshows" className="relative py-16 md:py-24">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E50914]/15 text-[#E50914]">
              <Tv size={20} />
            </div>
            <div>
              <h2 className="section-title">Popular TV Shows</h2>
              <p className="text-sm text-[#8B8B8B] mt-0.5">Binge-worthy series everyone is talking about</p>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {TV_SHOWS.map((show, i) => (
            <div
              key={show.id}
              className="movie-card group w-full aspect-[2/3] bg-[#181818] fade-up"
              style={{ animationDelay: `${(i % 6) * 0.06}s` }}
            >
              <img src={show.poster} alt={show.title} className="w-full h-full object-cover" loading="lazy" />

              {/* Top-right rating */}
              <div className="rating-top flex items-center gap-1 px-2.5 py-1 rounded-lg glass-dark border border-white/10">
                <Star size={11} className="text-[#FFB703] fill-[#FFB703]" />
                <span className="text-xs font-bold text-white">{show.rating}</span>
              </div>

              <div className="card-overlay" />
              <div className="card-info">
                <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">{show.title}</h3>
                <div className="flex items-center gap-2 text-xs text-[#CFCFCF] mb-2">
                  <span>{show.network}</span>
                  <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
                  <span>{show.seasons} Seasons</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {show.genres.slice(0, 2).map((g) => (
                    <span key={g} className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/70">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300 group-hover:opacity-0">
                <h3 className="text-sm font-semibold text-white line-clamp-1">{show.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-[#CFCFCF] mt-0.5">
                  <Tv size={10} />
                  <span>{show.network}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
