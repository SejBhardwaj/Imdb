/**
 * Movie Provider Interface
 * 
 * Abstract interface that all movie data providers must implement.
 * This allows swapping between TMDb, OMDb, or any other provider
 * without changing UI code.
 */

import type {
  Movie,
  MovieDetails,
  MovieCredits,
  MovieVideo,
  MovieImage,
  PaginatedResponse,
  CursorPaginatedResponse,
  MovieFilters,
} from '../types/movie';

/**
 * Movie Provider Interface
 * 
 * All providers (TMDb, OMDb, mock, etc.) must implement this interface
 */
export interface MovieProvider {
  /**
   * Provider identifier
   */
  readonly name: string;

  /**
   * Get a single movie by ID
   */
  getMovie(id: number | string): Promise<MovieDetails>;

  /**
   * Get popular movies (paginated)
   */
  getPopularMovies(page?: number): Promise<PaginatedResponse<Movie>>;

  /**
   * Get popular movies with cursor pagination
   */
  getPopularMoviesCursor(cursor?: string): Promise<CursorPaginatedResponse<Movie>>;

  /**
   * Get top-rated movies
   */
  getTopRatedMovies(page?: number): Promise<PaginatedResponse<Movie>>;

  /**
   * Get now playing movies
   */
  getNowPlayingMovies(page?: number): Promise<PaginatedResponse<Movie>>;

  /**
   * Get upcoming movies
   */
  getUpcomingMovies(page?: number): Promise<PaginatedResponse<Movie>>;

  /**
   * Search movies
   */
  searchMovies(query: string, page?: number): Promise<PaginatedResponse<Movie>>;

  /**
   * Search movies with filters
   */
  searchMoviesWithFilters(
    query: string,
    filters: MovieFilters,
    page?: number
  ): Promise<PaginatedResponse<Movie>>;

  /**
   * Get movie recommendations
   */
  getRecommendations(movieId: number, page?: number): Promise<PaginatedResponse<Movie>>;

  /**
   * Get similar movies
   */
  getSimilarMovies(movieId: number, page?: number): Promise<PaginatedResponse<Movie>>;

  /**
   * Get movie credits (cast + crew)
   */
  getMovieCredits(movieId: number): Promise<MovieCredits>;

  /**
   * Get movie videos (trailers, teasers)
   */
  getMovieVideos(movieId: number): Promise<MovieVideo[]>;

  /**
   * Get movie images
   */
  getMovieImages(movieId: number): Promise<{
    backdrops: MovieImage[];
    posters: MovieImage[];
    logos: MovieImage[];
  }>;

  /**
   * Discover movies by genre
   */
  discoverByGenre(genreId: number, page?: number): Promise<PaginatedResponse<Movie>>;

  /**
   * Get movie by external ID (IMDb ID)
   */
  getMovieByExternalId?(imdbId: string): Promise<MovieDetails>;

  /**
   * Batch get movies (for efficiency)
   */
  getMoviesBatch?(ids: number[]): Promise<MovieDetails[]>;

  /**
   * Prefetch movie data (for hover prefetching)
   */
  prefetchMovie?(id: number): Promise<void>;

  /**
   * Get full image URL
   */
  getImageUrl(path: string, size?: 'small' | 'medium' | 'large' | 'original'): string;
}

/**
 * Provider registry for managing multiple providers
 */
export class ProviderRegistry {
  private providers = new Map<string, MovieProvider>();
  private defaultProvider: string | null = null;

  /**
   * Register a provider
   */
  register(name: string, provider: MovieProvider): void {
    this.providers.set(name, provider);
    
    // Set first registered as default
    if (!this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  /**
   * Get provider by name
   */
  get(name: string): MovieProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get default provider
   */
  getDefault(): MovieProvider {
    if (!this.defaultProvider) {
      throw new Error('No default provider registered');
    }

    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new Error(`Default provider "${this.defaultProvider}" not found`);
    }

    return provider;
  }

  /**
   * Set default provider
   */
  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" not registered`);
    }
    this.defaultProvider = name;
  }

  /**
   * List all registered providers
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider exists
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }
}

// Global provider registry
export const providerRegistry = new ProviderRegistry();
