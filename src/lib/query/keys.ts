/**
 * TanStack Query - Query Key Factory
 * 
 * Type-safe query key generation for cache management
 */

import type { SearchQuery, DiscoverOptions } from '@/types/movie';

/**
 * Query key factory
 * 
 * Hierarchical keys for fine-grained cache invalidation
 */
export const queryKeys = {
  // All movies
  all: ['movies'] as const,

  // Movie lists
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (filters: string) => [...queryKeys.lists(), filters] as const,

  // Popular movies
  popular: () => [...queryKeys.lists(), 'popular'] as const,
  popularPage: (page: number) => [...queryKeys.popular(), page] as const,

  // Trending movies
  trending: (timeWindow: 'day' | 'week' = 'week') =>
    [...queryKeys.lists(), 'trending', timeWindow] as const,
  trendingPage: (timeWindow: 'day' | 'week', page: number) =>
    [...queryKeys.trending(timeWindow), page] as const,

  // Top rated movies
  topRated: () => [...queryKeys.lists(), 'top_rated'] as const,
  topRatedPage: (page: number) => [...queryKeys.topRated(), page] as const,

  // Upcoming movies
  upcoming: () => [...queryKeys.lists(), 'upcoming'] as const,
  upcomingPage: (page: number) => [...queryKeys.upcoming(), page] as const,

  // Now playing movies
  nowPlaying: () => [...queryKeys.lists(), 'now_playing'] as const,
  nowPlayingPage: (page: number) => [...queryKeys.nowPlaying(), page] as const,

  // Individual movie details
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: number) => [...queryKeys.details(), id] as const,

  // Movie
  movies: () => [...queryKeys.all, 'movie'] as const,
  movie: (id: number) => [...queryKeys.movies(), id] as const,

  // Movie credits
  credits: (id: number) => [...queryKeys.movie(id), 'credits'] as const,

  // Movie videos
  videos: (id: number) => [...queryKeys.movie(id), 'videos'] as const,

  // Movie images
  images: (id: number) => [...queryKeys.movie(id), 'images'] as const,

  // Movie reviews
  reviews: (id: number) => [...queryKeys.movie(id), 'reviews'] as const,
  reviewsPage: (id: number, page: number) => [...queryKeys.reviews(id), page] as const,

  // Similar movies
  similar: (id: number) => [...queryKeys.movie(id), 'similar'] as const,
  similarPage: (id: number, page: number) => [...queryKeys.similar(id), page] as const,

  // Recommended movies
  recommendations: (id: number) => [...queryKeys.movie(id), 'recommendations'] as const,
  recommendationsPage: (id: number, page: number) =>
    [...queryKeys.recommendations(id), page] as const,

  // Search
  searches: () => [...queryKeys.all, 'search'] as const,
  search: (query: SearchQuery) => [...queryKeys.searches(), query] as const,

  // Discover
  discovers: () => [...queryKeys.all, 'discover'] as const,
  discover: (options: DiscoverOptions) => [...queryKeys.discovers(), options] as const,

  // Genres
  genres: () => ['genres'] as const,

  // Movies by genre
  byGenre: (genreId: number) => [...queryKeys.all, 'genre', genreId] as const,
  byGenrePage: (genreId: number, page: number) => [...queryKeys.byGenre(genreId), page] as const,

  // Infinite queries
  infinite: {
    popular: () => [...queryKeys.popular(), 'infinite'] as const,
    trending: (timeWindow: 'day' | 'week' = 'week') =>
      [...queryKeys.trending(timeWindow), 'infinite'] as const,
    topRated: () => [...queryKeys.topRated(), 'infinite'] as const,
    upcoming: () => [...queryKeys.upcoming(), 'infinite'] as const,
    nowPlaying: () => [...queryKeys.nowPlaying(), 'infinite'] as const,
    search: (query: SearchQuery) => [...queryKeys.search(query), 'infinite'] as const,
    discover: (options: DiscoverOptions) => [...queryKeys.discover(options), 'infinite'] as const,
    byGenre: (genreId: number) => [...queryKeys.byGenre(genreId), 'infinite'] as const,
  },
} as const;

/**
 * Type-safe query key helpers
 */
export type QueryKeys = typeof queryKeys;
// export type QueryKey = ReturnType<QueryKeys[keyof QueryKeys]>; // Complex type - not needed
