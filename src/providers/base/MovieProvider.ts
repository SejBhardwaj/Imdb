/**
 * Movie Provider Abstract Interface
 * 
 * All providers (TMDb, OMDb, Mock) must implement this interface
 */

import type {
  Movie,
  MovieDetails,
  PaginatedResponse,
  SearchQuery,
  MovieFilters,
  DiscoverOptions,
  Credits,
  VideoCollection,
  ImageCollection,
  Review,
  Genre,
  ProviderName,
} from '@/types/movie';

export abstract class MovieProvider {
  abstract readonly name: ProviderName;
  abstract readonly priority: number;

  /**
   * Get movie by ID
   */
  abstract getMovie(id: number, traceId?: string): Promise<Movie>;

  /**
   * Get detailed movie information
   */
  abstract getMovieDetails(id: number, traceId?: string): Promise<MovieDetails>;

  /**
   * Get popular movies
   */
  abstract getPopularMovies(page?: number, traceId?: string): Promise<PaginatedResponse<Movie>>;

  /**
   * Get trending movies
   */
  abstract getTrendingMovies(
    timeWindow?: 'day' | 'week',
    page?: number,
    traceId?: string
  ): Promise<PaginatedResponse<Movie>>;

  /**
   * Get top rated movies
   */
  abstract getTopRatedMovies(page?: number, traceId?: string): Promise<PaginatedResponse<Movie>>;

  /**
   * Get upcoming movies
   */
  abstract getUpcomingMovies(page?: number, traceId?: string): Promise<PaginatedResponse<Movie>>;

  /**
   * Get now playing movies
   */
  abstract getNowPlayingMovies(page?: number, traceId?: string): Promise<PaginatedResponse<Movie>>;

  /**
   * Search movies
   */
  abstract searchMovies(query: SearchQuery, traceId?: string): Promise<PaginatedResponse<Movie>>;

  /**
   * Discover movies with filters
   */
  abstract discoverMovies(
    options: DiscoverOptions,
    traceId?: string
  ): Promise<PaginatedResponse<Movie>>;

  /**
   * Get movie credits (cast & crew)
   */
  abstract getMovieCredits(id: number, traceId?: string): Promise<Credits>;

  /**
   * Get movie videos (trailers, clips)
   */
  abstract getMovieVideos(id: number, traceId?: string): Promise<VideoCollection>;

  /**
   * Get movie images (posters, backdrops)
   */
  abstract getMovieImages(id: number, traceId?: string): Promise<ImageCollection>;

  /**
   * Get movie reviews
   */
  abstract getMovieReviews(
    id: number,
    page?: number,
    traceId?: string
  ): Promise<PaginatedResponse<Review>>;

  /**
   * Get similar movies
   */
  abstract getSimilarMovies(
    id: number,
    page?: number,
    traceId?: string
  ): Promise<PaginatedResponse<Movie>>;

  /**
   * Get recommended movies
   */
  abstract getRecommendedMovies(
    id: number,
    page?: number,
    traceId?: string
  ): Promise<PaginatedResponse<Movie>>;

  /**
   * Get movie genres
   */
  abstract getGenres(traceId?: string): Promise<Genre[]>;

  /**
   * Get movies by genre
   */
  abstract getMoviesByGenre(
    genreId: number,
    page?: number,
    traceId?: string
  ): Promise<PaginatedResponse<Movie>>;

  /**
   * Health check
   */
  abstract healthCheck(traceId?: string): Promise<boolean>;
}
