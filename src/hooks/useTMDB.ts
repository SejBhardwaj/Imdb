'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tmdbApi } from '@/lib/tmdb/api';

// Query Keys
export const QUERY_KEYS = {
  MOVIE_POPULAR: 'movie-popular',
  MOVIE_TOP_RATED: 'movie-top-rated',
  MOVIE_UPCOMING: 'movie-upcoming',
  MOVIE_NOW_PLAYING: 'movie-now-playing',
  MOVIE_DETAILS: 'movie-details',
  MOVIE_CREDITS: 'movie-credits',
  MOVIE_VIDEOS: 'movie-videos',
  MOVIE_SIMILAR: 'movie-similar',
  MOVIE_RECOMMENDATIONS: 'movie-recommendations',
  
  TV_POPULAR: 'tv-popular',
  TV_TOP_RATED: 'tv-top-rated',
  TV_ON_THE_AIR: 'tv-on-the-air',
  TV_AIRING_TODAY: 'tv-airing-today',
  TV_DETAILS: 'tv-details',
  
  PERSON_POPULAR: 'person-popular',
  PERSON_DETAILS: 'person-details',
  PERSON_MOVIE_CREDITS: 'person-movie-credits',
  PERSON_TV_CREDITS: 'person-tv-credits',
  PERSON_COMBINED_CREDITS: 'person-combined-credits',
  PERSON_IMAGES: 'person-images',
  PERSON_EXTERNAL_IDS: 'person-external-ids',
  
  GENRES_MOVIE: 'genres-movie',
  GENRES_TV: 'genres-tv',
  
  SEARCH_MULTI: 'search-multi',
  SEARCH_MOVIE: 'search-movie',
  SEARCH_TV: 'search-tv',
  SEARCH_PERSON: 'search-person',
  
  TRENDING: 'trending',
  DISCOVER_MOVIE: 'discover-movie',
  DISCOVER_TV: 'discover-tv',
} as const;

// Movies Hooks
export const usePopularMovies = (page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_POPULAR, page],
    queryFn: () => tmdbApi.movies.getPopular(page),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTopRatedMovies = (page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_TOP_RATED, page],
    queryFn: () => tmdbApi.movies.getTopRated(page),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpcomingMovies = (page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_UPCOMING, page],
    queryFn: () => tmdbApi.movies.getUpcoming(page),
    staleTime: 5 * 60 * 1000,
  });
};

export const useNowPlayingMovies = (page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_NOW_PLAYING, page],
    queryFn: () => tmdbApi.movies.getNowPlaying(page),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMovieDetails = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_DETAILS, id],
    queryFn: () => tmdbApi.movies.getDetails(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!id,
  });
};

export const useMovieCredits = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_CREDITS, id],
    queryFn: () => tmdbApi.movies.getCredits(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

export const useMovieVideos = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_VIDEOS, id],
    queryFn: () => tmdbApi.movies.getVideos(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

export const useSimilarMovies = (id: number, page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_SIMILAR, id, page],
    queryFn: () => tmdbApi.movies.getSimilar(id, page),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

export const useMovieRecommendations = (id: number, page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.MOVIE_RECOMMENDATIONS, id, page],
    queryFn: () => tmdbApi.movies.getRecommendations(id, page),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

// TV Shows Hooks
export const usePopularTVShows = (page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TV_POPULAR, page],
    queryFn: () => tmdbApi.tv.getPopular(page),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopRatedTVShows = (page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TV_TOP_RATED, page],
    queryFn: () => tmdbApi.tv.getTopRated(page),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTVDetails = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TV_DETAILS, id],
    queryFn: () => tmdbApi.tv.getDetails(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

// People (Actors) Hooks
export const usePopularPeople = (page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERSON_POPULAR, page],
    queryFn: () => tmdbApi.people.getPopular(page),
    staleTime: 5 * 60 * 1000,
  });
};

export const usePersonDetails = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERSON_DETAILS, id],
    queryFn: () => tmdbApi.people.getDetails(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

export const usePersonMovieCredits = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERSON_MOVIE_CREDITS, id],
    queryFn: () => tmdbApi.people.getMovieCredits(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

export const usePersonTVCredits = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERSON_TV_CREDITS, id],
    queryFn: () => tmdbApi.people.getTVCredits(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

export const usePersonCombinedCredits = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERSON_COMBINED_CREDITS, id],
    queryFn: () => tmdbApi.people.getCombinedCredits(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

export const usePersonImages = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERSON_IMAGES, id],
    queryFn: () => tmdbApi.people.getImages(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

export const usePersonExternalIds = (id: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERSON_EXTERNAL_IDS, id],
    queryFn: () => tmdbApi.people.getExternalIds(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
};

// Genres Hooks
export const useMovieGenres = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.GENRES_MOVIE],
    queryFn: () => tmdbApi.genres.getMovieGenres(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useTVGenres = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.GENRES_TV],
    queryFn: () => tmdbApi.genres.getTVGenres(),
    staleTime: 60 * 60 * 1000,
  });
};

// Search Hooks
export const useSearchMulti = (query: string, page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH_MULTI, query, page],
    queryFn: () => tmdbApi.search.multi(query, page),
    enabled: query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSearchMovies = (query: string, page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH_MOVIE, query, page],
    queryFn: () => tmdbApi.search.movies(query, page),
    enabled: query.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSearchTVShows = (query: string, page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH_TV, query, page],
    queryFn: () => tmdbApi.search.tv(query, page),
    enabled: query.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSearchPeople = (query: string, page: number = 1) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH_PERSON, query, page],
    queryFn: () => tmdbApi.search.people(query, page),
    enabled: query.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};

// Trending Hooks
export const useTrending = (
  mediaType: 'all' | 'movie' | 'tv' | 'person' = 'all',
  timeWindow: 'day' | 'week' = 'day',
  page: number = 1
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TRENDING, mediaType, timeWindow, page],
    queryFn: () => tmdbApi.trending.get(mediaType, timeWindow, page),
    staleTime: 5 * 60 * 1000,
  });
};

// Discover Hooks
export const useDiscoverMovies = (params?: any) => {
  return useQuery({
    queryKey: [QUERY_KEYS.DISCOVER_MOVIE, params],
    queryFn: () => tmdbApi.discover.movies(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useDiscoverTV = (params?: any) => {
  return useQuery({
    queryKey: [QUERY_KEYS.DISCOVER_TV, params],
    queryFn: () => tmdbApi.discover.tv(params),
    staleTime: 5 * 60 * 1000,
  });
};
