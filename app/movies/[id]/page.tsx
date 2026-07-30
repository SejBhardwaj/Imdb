/**
 * Movie Details Page - React Server Component
 * 
 * Features:
 * - Server-side rendering for SEO
 * - Parallel data fetching
 * - ISR with revalidation
 * - Dynamic metadata
 * - JSON-LD structured data
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { resilientTMDBClient } from '@/lib/tmdb/resilient-client';
import { tmdbApi } from '@/lib/tmdb/api';
import MovieHero from '@/components/movies/MovieHero';
import MovieCredits from '@/components/movies/MovieCredits';
import TrailerCarousel from '@/components/movies/TrailerCarousel';
import ImageGallery from '@/components/movies/ImageGallery';
import ReviewsSection from '@/components/movies/ReviewsSection';
import RecommendedMovies from '@/components/movies/RecommendedMovies';
import MovieHeroSkeleton from '@/components/movies/skeletons/MovieHeroSkeleton';
import ReviewsSkeleton from '@/components/movies/skeletons/ReviewsSkeleton';
import { smartPrefetcher } from '@/lib/tmdb/prefetch';

interface MoviePageProps {
  params: {
    id: string;
  };
}

/**
 * Generate static params for popular movies (ISR)
 */
export async function generateStaticParams() {
  try {
    const popular = await tmdbApi.movies.getPopular(1);
    return popular.results.slice(0, 20).map((movie) => ({
      id: movie.id.toString(),
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

/**
 * Generate dynamic metadata
 */
export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const movieId = parseInt(params.id);

  try {
    const movie = await tmdbApi.movies.getDetails(movieId);

    return {
      title: `${movie.title} (${new Date(movie.release_date).getFullYear()}) - IMDB`,
      description: movie.overview || `Watch ${movie.title} on IMDB`,
      openGraph: {
        title: movie.title,
        description: movie.overview || '',
        images: movie.poster_path
          ? [`https://image.tmdb.org/t/p/w780${movie.poster_path}`]
          : [],
        type: 'video.movie',
      },
      twitter: {
        card: 'summary_large_image',
        title: movie.title,
        description: movie.overview || '',
        images: movie.poster_path
          ? [`https://image.tmdb.org/t/p/w780${movie.poster_path}`]
          : [],
      },
    };
  } catch (error) {
    return {
      title: 'Movie Not Found - IMDB',
      description: 'The requested movie could not be found.',
    };
  }
}

/**
 * Parallel server-side data fetching
 */
async function fetchMovieData(movieId: number) {
  try {
    // Fetch in parallel (Promise.all for speed)
    const [movie, credits, videos, images] = await Promise.all([
      tmdbApi.movies.getDetails(movieId),
      tmdbApi.movies.getCredits(movieId),
      tmdbApi.movies.getVideos(movieId),
      tmdbApi.movies.getImages(movieId),
    ]);

    return { movie, credits, videos, images };
  } catch (error) {
    console.error('Error fetching movie data:', error);
    return null;
  }
}

/**
 * Generate JSON-LD structured data
 */
function generateMovieJsonLd(movie: any, credits: any) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    description: movie.overview,
    image: movie.poster_path
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : undefined,
    datePublished: movie.release_date,
    genre: movie.genres?.map((g: any) => g.name),
    director: credits.crew
      ?.filter((c: any) => c.job === 'Director')
      .map((c: any) => ({
        '@type': 'Person',
        name: c.name,
      })),
    actor: credits.cast?.slice(0, 10).map((c: any) => ({
      '@type': 'Person',
      name: c.name,
    })),
    aggregateRating: movie.vote_average
      ? {
          '@type': 'AggregateRating',
          ratingValue: movie.vote_average,
          ratingCount: movie.vote_count,
          bestRating: 10,
        }
      : undefined,
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
  };

  return JSON.stringify(jsonLd);
}

/**
 * Movie Details Page Component (Server Component)
 */
export default async function MoviePage({ params }: MoviePageProps) {
  const movieId = parseInt(params.id);

  if (isNaN(movieId)) {
    notFound();
  }

  // Fetch movie data on server
  const data = await fetchMovieData(movieId);

  if (!data) {
    notFound();
  }

  const { movie, credits, videos, images } = data;

  // Track visit for smart prefetching (client-side will continue)
  if (typeof window !== 'undefined') {
    smartPrefetcher.visit(movieId);
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: generateMovieJsonLd(movie, credits),
        }}
      />

      <div className="min-h-screen bg-[#080808]">
        {/* Hero Section - Server Rendered */}
        <MovieHero movie={movie} movieId={movieId} />

        {/* Trailer Carousel - Client Island */}
        {videos.results.length > 0 && (
          <section className="container mx-auto px-6 py-12">
            <h2 className="text-2xl font-bold mb-6">Trailers & Videos</h2>
            <TrailerCarousel videos={videos.results} movieId={movieId} />
          </section>
        )}

        {/* Image Gallery - Client Island */}
        {images.backdrops.length > 0 && (
          <section className="container mx-auto px-6 py-12">
            <h2 className="text-2xl font-bold mb-6">Photos</h2>
            <ImageGallery images={images.backdrops} movieTitle={movie.title} />
          </section>
        )}

        {/* Credits - Server Rendered */}
        <section className="container mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-6">Cast & Crew</h2>
          <MovieCredits credits={credits} />
        </section>

        {/* Reviews - Suspense Streaming */}
        <section className="container mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-6">Reviews</h2>
          <Suspense fallback={<ReviewsSkeleton />}>
            <ReviewsSection movieId={movieId} />
          </Suspense>
        </section>

        {/* Recommendations - Lazy Loaded */}
        <section className="container mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-6">More Like This</h2>
          <Suspense fallback={<div className="text-gray-400">Loading recommendations...</div>}>
            <RecommendedMovies movieId={movieId} />
          </Suspense>
        </section>
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
