/**
 * Movie Card Component
 */

'use client';

import type { Movie } from '@/types/movie';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MovieCardProps {
  movie: Movie;
  onHover?: () => void;
}

export function MovieCard({ movie, onHover }: MovieCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/movies/${movie.id}`);
  };

  return (
    <div
      className="group cursor-pointer"
      onMouseEnter={onHover}
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[rgb(var(--color-surface))]">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Rating Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-sm flex items-center gap-1">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          <span className="text-white text-xs font-semibold">{movie.rating.toFixed(1)}</span>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">
              {movie.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span>{movie.year}</span>
              {movie.genres.length > 0 && (
                <>
                  <span>•</span>
                  <span className="line-clamp-1">{movie.genres.slice(0, 2).join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
