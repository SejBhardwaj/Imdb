/**
 * MovieCard Component (Client Island)
 * 
 * Interactive movie card with hover effects and prefetching.
 * Used in movie lists and grids.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Calendar, TrendingUp } from 'lucide-react';
import type { Movie } from '@/lib/data/types/movie';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MovieCardProps {
  movie: Movie;
  imageBaseUrl?: string;
  onPrefetch?: (id: number) => void;
  priority?: boolean;
  className?: string;
}

export function MovieCard({
  movie,
  imageBaseUrl = 'https://image.tmdb.org/t/p/',
  onPrefetch,
  priority = false,
  className,
}: MovieCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const posterUrl = movie.posterPath
    ? `${imageBaseUrl}w500${movie.posterPath}`
    : '/placeholder-movie.jpg';

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';

  const handleMouseEnter = () => {
    if (onPrefetch && typeof movie.id === 'number') {
      onPrefetch(movie.id);
    }
  };

  return (
    <Link
      href={`/movies/${movie.id}`}
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}
      className={cn('group block', className)}
    >
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105">
        {/* Poster Image */}
        <div className="relative aspect-[2/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
          {!imageError ? (
            <>
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={priority}
                className={cn(
                  'object-cover transition-all duration-300',
                  imageLoaded ? 'opacity-100' : 'opacity-0',
                  'group-hover:scale-110'
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />

              {/* Loading skeleton */}
              {!imageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-200 dark:bg-gray-700">
              <span className="text-sm text-gray-500">No Image</span>
            </div>
          )}

          {/* Overlay with rating */}
          {movie.voteAverage > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {movie.voteAverage.toFixed(1)}
            </div>
          )}

          {/* Adult badge */}
          {movie.adult && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive" className="text-xs">
                18+
              </Badge>
            </div>
          )}
        </div>

        {/* Card Content */}
        <CardContent className="p-4">
          {/* Title */}
          <h3 className="line-clamp-2 font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
            {movie.title}
          </h3>

          {/* Metadata */}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {/* Year */}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{year}</span>
            </div>

            {/* Popularity */}
            {movie.popularity > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{Math.round(movie.popularity)}</span>
              </div>
            )}
          </div>

          {/* Original title (if different) */}
          {movie.originalTitle !== movie.title && (
            <p className="mt-1 text-xs text-muted-foreground italic line-clamp-1">
              {movie.originalTitle}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * MovieCard Skeleton
 */
export function MovieCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[2/3] animate-pulse bg-gray-200 dark:bg-gray-700" />
      <CardContent className="p-4">
        <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </CardContent>
    </Card>
  );
}
