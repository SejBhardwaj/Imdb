/**
 * Movie Details Content Component
 * Client component for interactive features
 */

'use client';

import { Play, Star, Clock, Calendar, Plus, Heart, Share2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { MovieDetails, Credits, VideoCollection, PaginatedResponse, Movie } from '@/types/movie';
import { MovieCard } from '@/components/data/MovieCard';

interface MovieDetailsContentProps {
  movieData: {
    details: MovieDetails;
    credits: Credits;
    videos: VideoCollection;
    similar: PaginatedResponse<Movie>;
  };
}

export default function MovieDetailsContent({ movieData }: MovieDetailsContentProps) {
  const router = useRouter();
  const { details, credits, videos, similar } = movieData;

  // Find trailer
  const trailer = videos.results.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  ) || videos.results[0];

  return (
    <>
      {/* Hero Section */}
      <section className="relative w-full h-[90vh] min-h-[600px] overflow-hidden">
        {/* Backdrop */}
        <div className="absolute inset-0">
          <img
            src={details.backdrop}
            alt={details.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--color-background))] via-[rgb(var(--color-background))]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--color-background))] via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 flex flex-col justify-end pb-20">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="absolute top-8 left-6 flex items-center gap-2 px-4 py-2 rounded-lg glass border border-white/10 text-white hover:border-white/20 transition-all"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-end">
            {/* Left: Info */}
            <div className="max-w-3xl">
              {/* Title */}
              <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-4">
                {details.title}
              </h1>

              {/* Tagline */}
              {details.tagline && (
                <p className="text-lg text-[rgb(var(--color-primary))] font-medium italic mb-6">
                  "{details.tagline}"
                </p>
              )}

              {/* Meta Row */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--color-primary))]/20">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-white">{details.rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-gray-300">{details.year}</span>
                {details.runtime && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span className="text-sm text-gray-300">{details.runtime}</span>
                  </>
                )}
                {details.certification && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span className="text-sm text-gray-300">{details.certification}</span>
                  </>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {details.genres.map((genre) => (
                  <span key={genre} className="px-3 py-1 rounded-full glass text-xs text-white/80 border-white/10">
                    {genre}
                  </span>
                ))}
              </div>

              {/* Overview */}
              <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8 max-w-2xl">
                {details.overview}
              </p>

              {/* Director & Cast */}
              {details.director && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Director</p>
                  <p className="text-sm text-white">{details.director}</p>
                </div>
              )}

              {details.cast && details.cast.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Starring</p>
                  <p className="text-sm text-white">{details.cast.slice(0, 5).join(', ')}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {trailer && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailer.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary group"
                  >
                    <Play size={16} className="fill-white" />
                    Watch Trailer
                  </a>
                )}
                <button className="btn-secondary">
                  <Plus size={16} />
                  Add to Watchlist
                </button>
                <button className="btn-secondary">
                  <Heart size={16} />
                  Favorite
                </button>
                <button className="btn-secondary">
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            </div>

            {/* Right: Poster */}
            <div className="hidden lg:block w-80">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-br from-[rgb(var(--color-primary))]/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative poster-shadow rounded-2xl overflow-hidden">
                  <img src={details.poster} alt={details.title} className="w-full aspect-[2/3] object-cover" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cast Section */}
      {credits.cast.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {credits.cast.slice(0, 12).map((member) => (
                <div key={member.id} className="text-center">
                  {member.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                      alt={member.name}
                      className="w-full aspect-[2/3] object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-800 rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-gray-600 text-4xl">{member.name[0]}</span>
                    </div>
                  )}
                  <p className="text-sm font-medium text-white">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.character}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Similar Movies */}
      {similar.results.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">More Like This</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {similar.results.slice(0, 12).map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
