/**
 * Movie Details Page - Enterprise Data Platform
 * 
 * Features:
 * - Server-side rendering with Suspense streaming
 * - Real TMDb data via MovieRepository
 * - Parallel data fetching
 * - ISR with revalidation
 * - Dynamic metadata
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { movieRepository } from '@/repositories/MovieRepository';
import MovieDetailsContent from '@/components/movies/MovieDetailsContent';
import MovieDetailsSkeleton from '@/components/movies/MovieDetailsSkeleton';

interface MoviePageProps {
  params: {
    id: string;
  };
}

/**
 * Generate dynamic metadata
 */
export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const movieId = parseInt(params.id);

  try {
    const movie = await movieRepository.getMovie(movieId);

    return {
      title: `${movie.title} (${movie.year}) - IMDb Clone`,
      description: movie.overview || `Watch ${movie.title}`,
      openGraph: {
        title: movie.title,
        description: movie.overview || '',
        images: movie.poster ? [movie.poster] : [],
        type: 'video.movie',
      },
      twitter: {
        card: 'summary_large_image',
        title: movie.title,
        description: movie.overview || '',
        images: movie.poster ? [movie.poster] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Movie Not Found - IMDb Clone',
      description: 'The requested movie could not be found.',
    };
  }
}

/**
 * Movie Details Page Component (Server Component)
 */
export default async function MoviePage({ params }: MoviePageProps) {
  const movieId = parseInt(params.id);

  if (isNaN(movieId)) {
    notFound();
  }

  // Server-side data fetching with parallel requests
  let movieData;
  try {
    const [details, credits, videos, similar] = await Promise.all([
      movieRepository.getMovieDetails(movieId),
      movieRepository.getMovieCredits(movieId),
      movieRepository.getMovieVideos(movieId),
      movieRepository.getSimilarMovies(movieId, 1),
    ]);

    movieData = { details, credits, videos, similar };
  } catch (error) {
    console.error('Error fetching movie data:', error);
    notFound();
  }

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movieData.details.title,
    description: movieData.details.overview,
    image: movieData.details.poster,
    datePublished: movieData.details.year,
    genre: movieData.details.genres,
    director: movieData.details.director ? {
      '@type': 'Person',
      name: movieData.details.director,
    } : undefined,
    actor: movieData.details.cast?.slice(0, 10).map((name) => ({
      '@type': 'Person',
      name,
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: movieData.details.rating,
      bestRating: 10,
    },
    duration: movieData.details.runtime ? `PT${movieData.details.runtime}` : undefined,
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="min-h-screen bg-[rgb(var(--color-background))]">
        {/* Movie Details with Suspense Streaming */}
        <Suspense fallback={<MovieDetailsSkeleton />}>
          <MovieDetailsContent movieData={movieData} />
        </Suspense>
      </div>
    </>
  );
}

/**
 * ISR Configuration
 * Revalidate every hour
 */
export const revalidate = 3600; // 1 hour

/**
 * Enable dynamic rendering for paths not in generateStaticParams
 */
export const dynamicParams = true;
