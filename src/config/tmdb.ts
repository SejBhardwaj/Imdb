export const TMDB_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_TMDB_API_KEY!,
  BASE_URL: process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p',
  IMAGE_SIZES: {
    backdrop: {
      w300: 'w300',
      w780: 'w780',
      w1280: 'w1280',
      original: 'original',
    },
    poster: {
      w92: 'w92',
      w154: 'w154',
      w185: 'w185',
      w342: 'w342',
      w500: 'w500',
      w780: 'w780',
      original: 'original',
    },
    profile: {
      w45: 'w45',
      w185: 'w185',
      h632: 'h632',
      original: 'original',
    },
    still: {
      w92: 'w92',
      w185: 'w185',
      w300: 'w300',
      original: 'original',
    },
  },
} as const;

export const TMDB_ENDPOINTS = {
  // Movies
  MOVIE_POPULAR: '/movie/popular',
  MOVIE_TOP_RATED: '/movie/top_rated',
  MOVIE_UPCOMING: '/movie/upcoming',
  MOVIE_NOW_PLAYING: '/movie/now_playing',
  MOVIE_DETAILS: (id: number) => `/movie/${id}`,
  MOVIE_CREDITS: (id: number) => `/movie/${id}/credits`,
  MOVIE_VIDEOS: (id: number) => `/movie/${id}/videos`,
  MOVIE_SIMILAR: (id: number) => `/movie/${id}/similar`,
  MOVIE_RECOMMENDATIONS: (id: number) => `/movie/${id}/recommendations`,
  MOVIE_IMAGES: (id: number) => `/movie/${id}/images`,
  MOVIE_REVIEWS: (id: number) => `/movie/${id}/reviews`,

  // TV Shows
  TV_POPULAR: '/tv/popular',
  TV_TOP_RATED: '/tv/top_rated',
  TV_ON_THE_AIR: '/tv/on_the_air',
  TV_AIRING_TODAY: '/tv/airing_today',
  TV_DETAILS: (id: number) => `/tv/${id}`,
  TV_CREDITS: (id: number) => `/tv/${id}/credits`,
  TV_VIDEOS: (id: number) => `/tv/${id}/videos`,
  TV_SIMILAR: (id: number) => `/tv/${id}/similar`,
  TV_RECOMMENDATIONS: (id: number) => `/tv/${id}/recommendations`,

  // Actors (People)
  PERSON_POPULAR: '/person/popular',
  PERSON_DETAILS: (id: number) => `/person/${id}`,
  PERSON_MOVIE_CREDITS: (id: number) => `/person/${id}/movie_credits`,
  PERSON_TV_CREDITS: (id: number) => `/person/${id}/tv_credits`,
  PERSON_COMBINED_CREDITS: (id: number) => `/person/${id}/combined_credits`,
  PERSON_IMAGES: (id: number) => `/person/${id}/images`,
  PERSON_EXTERNAL_IDS: (id: number) => `/person/${id}/external_ids`,

  // Genres
  MOVIE_GENRES: '/genre/movie/list',
  TV_GENRES: '/genre/tv/list',

  // Discover
  DISCOVER_MOVIE: '/discover/movie',
  DISCOVER_TV: '/discover/tv',

  // Search
  SEARCH_MULTI: '/search/multi',
  SEARCH_MOVIE: '/search/movie',
  SEARCH_TV: '/search/tv',
  SEARCH_PERSON: '/search/person',

  // Trending
  TRENDING: (mediaType: 'all' | 'movie' | 'tv' | 'person', timeWindow: 'day' | 'week') =>
    `/trending/${mediaType}/${timeWindow}`,
} as const;

export const getImageUrl = (
  path: string | null | undefined,
  size: string = 'original'
): string => {
  if (!path) return '/placeholder-image.jpg';
  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${size}${path}`;
};
