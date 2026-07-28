/**
 * Recommended Movies - Server Component with Suspense
 * 
 * Lazy loaded recommendations
 */

import { tmdbApi } from '@/lib/tmdb/api';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';

interface RecommendedMoviesProps {
  movieId: number;
}

export default async function RecommendedMovies({ movieId }: RecommendedMoviesProps) {
  let movies;

  try {
    const response = await tmdbApi.movies.getRecommendations(movieId, 1);
    movies = response.results;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Unable to load recommendations.</p>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No recommendations available for this movie.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {movies.slice(0, 12).map((movie: any) => (
        <Link
          key={movie.id}
          href={`/movies/${movie.id}`}
          className="group"
        >
          <div className="space-y-2">
            {/* Poster */}
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5">
              {movie.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                  alt={movie.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  No Image
                </div>
              )}

              {/* Rating Badge */}
              {movie.vote_average > 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 px-2 py-1 rounded-full text-xs">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  <span>{movie.vote_average.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <p className="font-semibold group-hover:text-red-500 transition-colors line-clamp-2 text-sm">
                {movie.title}
              </p>
              {movie.release_date && (
                <p className="text-xs text-gray-400">
                  {new Date(movie.release_date).getFullYear()}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
