/**
 * useMovieDetails Hooks
 * 
 * React Query hooks for movie metadata (credits, videos, images).
 * 
 * Features:
 * - Movie credits (cast + crew)
 * - Movie videos (trailers, teasers)
 * - Movie images (posters, backdrops, logos)
 * - Automatic caching
 */

'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query/queryClient';
import type { MovieCredits, MovieVideo, MovieImage, APIError } from '@/lib/data/types/movie';

/**
 * Hook for movie credits (cast + crew)
 */
export function useMovieCredits(
  movieId: number | null | undefined,
  fetcher: (movieId: number) => Promise<MovieCredits>,
  options?: Omit<UseQueryOptions<MovieCredits, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MovieCredits, APIError>({
    queryKey: queryKeys.credits.byMovie(movieId!),
    queryFn: () => fetcher(movieId!),
    enabled: movieId != null,
    staleTime: 1000 * 60 * 60, // 1 hour (rarely changes)
    gcTime: 1000 * 60 * 120, // 2 hours
    ...options,
  });
}

/**
 * Hook for movie videos (trailers, teasers, etc.)
 */
export function useMovieVideos(
  movieId: number | null | undefined,
  fetcher: (movieId: number) => Promise<MovieVideo[]>,
  options?: Omit<UseQueryOptions<MovieVideo[], APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MovieVideo[], APIError>({
    queryKey: queryKeys.videos.byMovie(movieId!),
    queryFn: () => fetcher(movieId!),
    enabled: movieId != null,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 120, // 2 hours
    select: (data) => {
      // Sort by official first, then by type
      return data.sort((a, b) => {
        if (a.official !== b.official) {
          return a.official ? -1 : 1;
        }
        const typeOrder = ['Trailer', 'Teaser', 'Clip', 'Behind the Scenes', 'Featurette'];
        const aIndex = typeOrder.indexOf(a.type);
        const bIndex = typeOrder.indexOf(b.type);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    },
    ...options,
  });
}

/**
 * Hook for movie images (posters, backdrops, logos)
 */
export function useMovieImages(
  movieId: number | null | undefined,
  fetcher: (movieId: number) => Promise<{
    backdrops: MovieImage[];
    posters: MovieImage[];
    logos: MovieImage[];
  }>,
  options?: Omit<
    UseQueryOptions<
      {
        backdrops: MovieImage[];
        posters: MovieImage[];
        logos: MovieImage[];
      },
      APIError
    >,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<
    {
      backdrops: MovieImage[];
      posters: MovieImage[];
      logos: MovieImage[];
    },
    APIError
  >({
    queryKey: queryKeys.images.byMovie(movieId!),
    queryFn: () => fetcher(movieId!),
    enabled: movieId != null,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 120, // 2 hours
    select: (data) => {
      // Sort images by vote average
      const sortImages = (images: MovieImage[]) =>
        [...images].sort((a, b) => b.voteAverage - a.voteAverage);

      return {
        backdrops: sortImages(data.backdrops),
        posters: sortImages(data.posters),
        logos: sortImages(data.logos),
      };
    },
    ...options,
  });
}

/**
 * Hook to get primary trailer from videos
 */
export function useMoviePrimaryTrailer(
  movieId: number | null | undefined,
  fetcher: (movieId: number) => Promise<MovieVideo[]>
) {
  const { data: videos, ...rest } = useMovieVideos(movieId, fetcher);

  const primaryTrailer = videos?.find(
    (v: MovieVideo) => v.type === 'Trailer' && v.official && v.site === 'YouTube'
  ) || videos?.find((v: MovieVideo) => v.type === 'Trailer' && v.site === 'YouTube') || videos?.[0];

  return {
    trailer: primaryTrailer,
    allVideos: videos,
    ...rest,
  };
}

/**
 * Hook to get top cast members (limited)
 */
export function useMovieTopCast(
  movieId: number | null | undefined,
  fetcher: (movieId: number) => Promise<MovieCredits>,
  limit: number = 10
) {
  const { data: credits, ...rest } = useMovieCredits(movieId, fetcher);

  const topCast = credits?.cast.slice(0, limit);

  return {
    cast: topCast,
    fullCredits: credits,
    ...rest,
  };
}

/**
 * Hook to get director and key crew
 */
export function useMovieKeyCrewMembers(
  movieId: number | null | undefined,
  fetcher: (movieId: number) => Promise<MovieCredits>
) {
  const { data: credits, ...rest } = useMovieCredits(movieId, fetcher);

  const director = credits?.crew.find((c: any) => c.job === 'Director');
  const producers = credits?.crew.filter((c: any) => c.job === 'Producer').slice(0, 3);
  const writers = credits?.crew.filter((c: any) => c.job === 'Screenplay' || c.job === 'Writer').slice(0, 3);
  const cinematographer = credits?.crew.find((c: any) => c.job === 'Director of Photography');

  return {
    director,
    producers,
    writers,
    cinematographer,
    fullCredits: credits,
    ...rest,
  };
}

/**
 * Hook to prefetch all movie details (credits + videos + images)
 */
export function usePrefetchMovieDetails(queryClient: any) {
  return (
    movieId: number,
    fetchers: {
      credits: (movieId: number) => Promise<MovieCredits>;
      videos: (movieId: number) => Promise<MovieVideo[]>;
      images: (movieId: number) => Promise<{
        backdrops: MovieImage[];
        posters: MovieImage[];
        logos: MovieImage[];
      }>;
    }
  ) => {
    Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.credits.byMovie(movieId),
        queryFn: () => fetchers.credits(movieId),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.videos.byMovie(movieId),
        queryFn: () => fetchers.videos(movieId),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.images.byMovie(movieId),
        queryFn: () => fetchers.images(movieId),
      }),
    ]);
  };
}
