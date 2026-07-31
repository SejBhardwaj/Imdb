'use client';

import { Star, Bookmark, Heart, Play, Clock } from 'lucide-react';
import type { Movie } from '@/types/movie';
import { useRouter } from 'next/navigation';

interface MovieCardProps {
  movie: Movie;
  index?: number;
  onHover?: () => void;
}

export default function MovieCard({ movie, index = 0, onHover }: MovieCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/movies/${movie.id}`);
  };

  return (
    <div
      className="movie-card group w-full aspect-[2/3] bg-[#181818] fade-up"
      style={{ animationDelay: `${(index % 6) * 0.06}s` }}
      onMouseEnter={onHover}
      onClick={handleClick}
    >
      <img src={movie.poster} alt={movie.title} loading="lazy" />

      {/* Top-right rating */}
      <div className="rating-top flex items-center gap-1 px-2.5 py-1 rounded-lg glass-dark border border-white/10">
        <Star size={11} className="text-[#FFB703] fill-[#FFB703]" />
        <span className="text-xs font-bold text-white">{movie.rating}</span>
      </div>

      {/* Hover overlay */}
      <div className="card-overlay" />
      <div className="card-info">
        <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">{movie.title}</h3>
        <div className="flex items-center gap-2 text-xs text-[#CFCFCF] mb-2">
          <span>{movie.year}</span>
          {movie.runtime && (
            <>
              <span className="w-1 h-1 rounded-full bg-[#8B8B8B]" />
              <span>{movie.runtime}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {movie.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/70">
              {g}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#E50914] text-white text-xs font-medium hover:bg-[#ff1a1a] transition-colors">
            <Play size={11} className="fill-white" /> Play
          </button>
          <button className="p-1.5 rounded-lg glass border-white/10 text-white/80 hover:text-white hover:border-white/20 transition-all">
            <Bookmark size={11} />
          </button>
          <button className="p-1.5 rounded-lg glass border-white/10 text-white/80 hover:text-[#E50914] hover:border-[#E50914]/30 transition-all">
            <Heart size={11} />
          </button>
        </div>
      </div>

      {/* Always-visible bottom gradient + title for non-hover state */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300 group-hover:opacity-0">
        <h3 className="text-sm font-semibold text-white line-clamp-1">{movie.title}</h3>
        <div className="flex items-center gap-1.5 text-xs text-[#CFCFCF] mt-0.5">
          {movie.runtime && (
            <>
              <Clock size={10} />
              <span>{movie.runtime}</span>
              <span className="w-1 h-1 rounded-full bg-[#8B8B8B] mx-0.5" />
            </>
          )}
          <span>{movie.year}</span>
        </div>
      </div>
    </div>
  );
}
