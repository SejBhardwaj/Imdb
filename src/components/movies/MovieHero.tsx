/**
 * Movie Hero Section - Server Component
 * 
 * Displays:
 * - Backdrop image
 * - Poster
 * - Title, tagline, overview
 * - Rating, runtime, genres
 * - Release date
 * - Action buttons (client islands)
 */

import Image from 'next/image';
import { Star, Clock, Calendar } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import ShareButton from './ShareButton';

interface MovieHeroProps {
  movie: any;
  movieId: number;
}

export default function MovieHero({ movie, movieId }: MovieHeroProps) {
  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : 'N/A';

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  return (
    <div className="relative">
      {/* Backdrop Image */}
      {backdropUrl && (
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={backdropUrl}
            alt={movie.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-transparent to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="relative container mx-auto px-6 py-24 md:py-32">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster */}
          {posterUrl && (
            <div className="flex-shrink-0 w-64 hidden md:block">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 256px"
                  priority
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-2">
                {movie.title}
                {releaseYear && (
                  <span className="text-gray-400 font-normal ml-3">
                    ({releaseYear})
                  </span>
                )}
              </h1>
              
              {movie.tagline && (
                <p className="text-xl text-gray-400 italic">
                  "{movie.tagline}"
                </p>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              {/* Rating */}
              {movie.vote_average > 0 && (
                <div className="flex items-center gap-2 bg-yellow-600/20 text-yellow-500 px-3 py-1.5 rounded-full">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold">
                    {movie.vote_average.toFixed(1)}
                  </span>
                  <span className="text-gray-400">
                    ({movie.vote_count.toLocaleString()} votes)
                  </span>
                </div>
              )}

              {/* Runtime */}
              {runtime && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>{runtime}</span>
                </div>
              )}

              {/* Release Date */}
              {movie.release_date && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(movie.release_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre: any) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Overview</h2>
                <p className="text-gray-300 leading-relaxed max-w-3xl">
                  {movie.overview}
                </p>
              </div>
            )}

            {/* Action Buttons - Client Islands */}
            <div className="flex gap-4">
              <FavoriteButton movieId={movieId} movieTitle={movie.title} />
              <ShareButton movieId={movieId} movieTitle={movie.title} />
            </div>

            {/* Production Info */}
            {movie.production_companies && movie.production_companies.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  <span className="font-semibold">Production: </span>
                  {movie.production_companies
                    .slice(0, 3)
                    .map((c: any) => c.name)
                    .join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
