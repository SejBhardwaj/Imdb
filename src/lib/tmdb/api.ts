import { tmdbClient } from './client';
import { TMDB_ENDPOINTS } from '@/config/tmdb';
import type {
  TMDBMovie,
  TMDBMovieDetails,
  TMDBTVShow,
  TMDBPerson,
  TMDBPersonDetails,
  TMDBCredits,
  TMDBPersonCredits,
  TMDBPersonCombinedCredits,
  TMDBPaginatedResponse,
  TMDBVideo,
  TMDBImages,
  TMDBGenre,
  TMDBExternalIds,
} from '@/types/tmdb';

// Movies
export const tmdbApi = {
  // Movies
  movies: {
    getPopular: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie>>(TMDB_ENDPOINTS.MOVIE_POPULAR, {
        params: { page },
      }),

    getTopRated: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie>>(TMDB_ENDPOINTS.MOVIE_TOP_RATED, {
        params: { page },
      }),

    getUpcoming: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie>>(TMDB_ENDPOINTS.MOVIE_UPCOMING, {
        params: { page },
      }),

    getNowPlaying: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie>>(TMDB_ENDPOINTS.MOVIE_NOW_PLAYING, {
        params: { page },
      }),

    getDetails: (id: number) =>
      tmdbClient.get<TMDBMovieDetails>(TMDB_ENDPOINTS.MOVIE_DETAILS(id), {
        params: { append_to_response: 'videos,credits,similar,recommendations,images' },
      }),

    getCredits: (id: number) => tmdbClient.get<TMDBCredits>(TMDB_ENDPOINTS.MOVIE_CREDITS(id)),

    getVideos: (id: number) =>
      tmdbClient.get<{ id: number; results: TMDBVideo[] }>(TMDB_ENDPOINTS.MOVIE_VIDEOS(id)),

    getSimilar: (id: number, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie>>(TMDB_ENDPOINTS.MOVIE_SIMILAR(id), {
        params: { page },
      }),

    getRecommendations: (id: number, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie>>(
        TMDB_ENDPOINTS.MOVIE_RECOMMENDATIONS(id),
        {
          params: { page },
        }
      ),

    getImages: (id: number) => tmdbClient.get<TMDBImages>(TMDB_ENDPOINTS.MOVIE_IMAGES(id)),

    getReviews: (id: number, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<any>>(TMDB_ENDPOINTS.MOVIE_REVIEWS(id), {
        params: { page },
      }),
  },

  // TV Shows
  tv: {
    getPopular: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBTVShow>>(TMDB_ENDPOINTS.TV_POPULAR, {
        params: { page },
      }),

    getTopRated: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBTVShow>>(TMDB_ENDPOINTS.TV_TOP_RATED, {
        params: { page },
      }),

    getOnTheAir: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBTVShow>>(TMDB_ENDPOINTS.TV_ON_THE_AIR, {
        params: { page },
      }),

    getAiringToday: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBTVShow>>(TMDB_ENDPOINTS.TV_AIRING_TODAY, {
        params: { page },
      }),

    getDetails: (id: number) =>
      tmdbClient.get<any>(TMDB_ENDPOINTS.TV_DETAILS(id), {
        params: { append_to_response: 'videos,credits,similar,recommendations' },
      }),

    getCredits: (id: number) => tmdbClient.get<TMDBCredits>(TMDB_ENDPOINTS.TV_CREDITS(id)),

    getVideos: (id: number) =>
      tmdbClient.get<{ id: number; results: TMDBVideo[] }>(TMDB_ENDPOINTS.TV_VIDEOS(id)),

    getSimilar: (id: number, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBTVShow>>(TMDB_ENDPOINTS.TV_SIMILAR(id), {
        params: { page },
      }),

    getRecommendations: (id: number, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBTVShow>>(TMDB_ENDPOINTS.TV_RECOMMENDATIONS(id), {
        params: { page },
      }),
  },

  // People (Actors)
  people: {
    getPopular: (page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBPerson>>(TMDB_ENDPOINTS.PERSON_POPULAR, {
        params: { page },
      }),

    getDetails: (id: number) =>
      tmdbClient.get<TMDBPersonDetails>(TMDB_ENDPOINTS.PERSON_DETAILS(id)),

    getMovieCredits: (id: number) =>
      tmdbClient.get<TMDBPersonCredits>(TMDB_ENDPOINTS.PERSON_MOVIE_CREDITS(id)),

    getTVCredits: (id: number) =>
      tmdbClient.get<TMDBPersonCredits>(TMDB_ENDPOINTS.PERSON_TV_CREDITS(id)),

    getCombinedCredits: (id: number) =>
      tmdbClient.get<TMDBPersonCombinedCredits>(TMDB_ENDPOINTS.PERSON_COMBINED_CREDITS(id)),

    getImages: (id: number) => tmdbClient.get<TMDBImages>(TMDB_ENDPOINTS.PERSON_IMAGES(id)),

    getExternalIds: (id: number) =>
      tmdbClient.get<TMDBExternalIds>(TMDB_ENDPOINTS.PERSON_EXTERNAL_IDS(id)),
  },

  // Genres
  genres: {
    getMovieGenres: () =>
      tmdbClient.get<{ genres: TMDBGenre[] }>(TMDB_ENDPOINTS.MOVIE_GENRES),

    getTVGenres: () => tmdbClient.get<{ genres: TMDBGenre[] }>(TMDB_ENDPOINTS.TV_GENRES),
  },

  // Search
  search: {
    multi: (query: string, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie | TMDBTVShow | TMDBPerson>>(
        TMDB_ENDPOINTS.SEARCH_MULTI,
        {
          params: { query, page },
        }
      ),

    movies: (query: string, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie>>(TMDB_ENDPOINTS.SEARCH_MOVIE, {
        params: { query, page },
      }),

    tv: (query: string, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBTVShow>>(TMDB_ENDPOINTS.SEARCH_TV, {
        params: { query, page },
      }),

    people: (query: string, page: number = 1) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBPerson>>(TMDB_ENDPOINTS.SEARCH_PERSON, {
        params: { query, page },
      }),
  },

  // Trending
  trending: {
    get: (
      mediaType: 'all' | 'movie' | 'tv' | 'person' = 'all',
      timeWindow: 'day' | 'week' = 'day',
      page: number = 1
    ) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie | TMDBTVShow | TMDBPerson>>(
        TMDB_ENDPOINTS.TRENDING(mediaType, timeWindow),
        {
          params: { page },
        }
      ),
  },

  // Discover
  discover: {
    movies: (params?: any) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBMovie>>(TMDB_ENDPOINTS.DISCOVER_MOVIE, {
        params,
      }),

    tv: (params?: any) =>
      tmdbClient.get<TMDBPaginatedResponse<TMDBTVShow>>(TMDB_ENDPOINTS.DISCOVER_TV, {
        params,
      }),
  },
};
