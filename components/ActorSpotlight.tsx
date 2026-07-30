'use client';

import { Users, Star, TrendingUp, ArrowUpRight } from 'lucide-react';
import { POPULAR_ACTORS } from '@/lib/mockData';

export default function ActorSpotlight() {
  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-b from-transparent via-[#0d0d0d] to-transparent">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E50914]/15 text-[#E50914]">
              <Users size={20} />
            </div>
            <div>
              <h2 className="section-title">Actor Spotlight</h2>
              <p className="text-sm text-[#8B8B8B] mt-0.5">Trending performers this week</p>
            </div>
          </div>
          <button className="hidden md:flex items-center gap-1.5 text-sm text-[#8B8B8B] hover:text-[#E50914] transition-colors">
            View all <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {POPULAR_ACTORS.map((actor, i) => (
            <div
              key={actor.id}
              className="group cursor-pointer fade-up"
              style={{ animationDelay: `${(i % 6) * 0.08}s` }}
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 card-hover">
                <img src={actor.photo} alt={actor.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Popularity badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg glass-dark border border-white/10">
                  <TrendingUp size={10} className="text-[#E50914]" />
                  <span className="text-[10px] font-bold text-white">{actor.popularity}%</span>
                </div>
                {/* Hover button */}
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                  <button className="w-full py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white font-medium hover:bg-white/20 transition-colors">
                    View Profile
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-bold text-white mb-0.5 group-hover:text-[#E50914] transition-colors truncate">
                {actor.name}
              </h3>
              <p className="text-xs text-[#8B8B8B] truncate">Known for: {actor.knownFor}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
