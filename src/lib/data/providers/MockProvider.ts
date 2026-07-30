/**
 * Mock Provider Implementation
 * 
 * Testing and development provider with deterministic responses.
 * 
 * Features:
 * - Simulated delays
 * - Error injection (429, 500, timeout, network)
 * - Deterministic data
 * - Configurable failure rates
 * - No external dependencies
 * 
 * Usage:
 * - Unit tests
 * - E2E tests
 * - Development without API keys
 * - Failure scenario testing
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
  CastMember,
  CrewMember,
} from '../types/movie';
import { APIError, RateLimitError, NetworkError } from '../types/movie';
import type { MovieProvider } from './MovieProvider';

/**
 * Mock Provider Configuration
 */
export interface MockProviderConfig {
  /** Simulate network delay (ms) */
  delay?: number;
  /** Randomly fail requests with this probability (0-1) */
  failureRate?: number;
  /** Type of failure to simulate */
  failureType?: 'network' | 'rate_limit' | 'server_error' | 'timeout';
  /** Enable console logging */
  verbose?: boolean;
}

/**
 * Mock movie data generator
 */
class MockDataGenerator {
  private movieCache = new Map<number, MovieDetails>();
  private idCounter = 1000;

  /**
   * Generate a mock movie
   */
  generateMovie(id?: number, partial?: Partial<Movie>): Movie {
    const movieId = id || this.idCounter++;

    return {
      id: movieId,
      title: `Mock Movie ${movieId}`,
      overview: `This is a mock overview for movie ${movieId}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      posterPath: `/mock/poster/${movieId}.jpg`,
      backdropPath: `/mock/backdrop/${movieId}.jpg`,
      releaseDate: '2024-01-01',
      voteAverage: 7.5 + (movieId % 3),
      voteCount: 1000 + movieId * 10,
      popularity: 500 + movieId * 5,
      adult: false,
      originalLanguage: 'en',
      originalTitle: `Mock Movie ${movieId}`,
      genreIds: [28, 12, 878], // Action, Adventure, Sci-Fi
      ...partial,
    };
  }

  /**
   * Generate a mock movie details
   */
  generateMovieDetails(id: number, partial?: Partial<MovieDetails>): MovieDetails {
    const cached = this.movieCache.get(id);
    if (cached) {
      return cached;
    }

    const movie = this.generateMovie(id);
    const details: MovieDetails = {
      ...movie,
      runtime: 120 + (id % 60),
      budget: 100000000 + id * 1000000,
      revenue: 300000000 + id * 5000000,
      status: 'Released',
      tagline: `The tagline for movie ${id}`,
      homepage: `https://mock-movie-${id}.com`,
      imdbId: `tt${String(id).padStart(7, '0')}`,
      genres: [
        { id: 28, name: 'Action' },
        { id: 12, name: 'Adventure' },
        { id: 878, name: 'Science Fiction' },
      ],
      productionCompanies: [
        {
          id: 1,
          name: 'Mock Studios',
          logoPath: '/mock/studio/1.png',
          originCountry: 'US',
        },
      ],
      productionCountries: [
        { iso31661: 'US', name: 'United States of America' },
      ],
      spokenLanguages: [
        { iso6391: 'en', name: 'English', englishName: 'English' },
      ],
      ...partial,
    };

    this.movieCache.set(id, details);
    return details;
  }

  /**
   * Generate mock cast
   */
  generateCast(count: number = 10): CastMember[] {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Actor ${i + 1}`,
      character: `Character ${i + 1}`,
      profilePath: `/mock/actor/${i + 1}.jpg`,
      order: i,
    }));
  }

  /**
   * Generate mock crew
   */
  generateCrew(count: number = 5): CrewMember[] {
    const jobs = ['Director', 'Producer', 'Writer', 'Cinematography', 'Editor'];
    return Array.from({ length: count }, (_, i) => ({
      id: i + 100,
      name: `Crew Member ${i + 1}`,
      job: jobs[i % jobs.length],
      department: 'Production',
      profilePath: `/mock/crew/${i + 1}.jpg`,
    }));
  }

  /**
   * Generate mock videos
   */
  generateVideos(movieId: number, count: number = 3): MovieVideo[] {
    const types = ['Trailer', 'Teaser', 'Behind the Scenes'];
    return Array.from({ length: count }, (_, i) => ({
      id: `mock-video-${movieId}-${i}`,
      key: `mock-key-${movieId}-${i}`,
      name: `${types[i % types.length]} ${i + 1}`,
      site: 'YouTube',
      size: 1080,
      type: types[i % types.length],
      official: true,
      publishedAt: '2024-01-01T00:00:00.000Z',
    }));
  }

  /**
   * Generate mock images
   */
  generateImages(movieId: number): {
    backdrops: MovieImage[];
    posters: MovieImage[];
    logos: MovieImage[];
  } {
    const generateImageArray = (type: string, count: number): MovieImage[] =>
      Array.from({ length: count }, (_, i) => ({
        aspectRatio: 1.78,
        height: 1080,
        width: 1920,
        filePath: `/mock/${type}/${movieId}-${i}.jpg`,
        voteAverage: 7 + i * 0.5,
        voteCount: 10 + i * 5,
      }));

    return {
      backdrops: generateImageArray('backdrop', 5),
      posters: generateImageArray('poster', 3),
      logos: generateImageArray('logo', 2),
    };
  }

  /**
   * Generate paginated response
   */
  generatePaginatedResponse<T>(
    items: T[],
    page: number,
    pageSize: number = 20
  ): PaginatedResponse<T> {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = items.slice(start, end);

    return {
      results,
      page,
      totalPages: Math.ceil(items.length / pageSize),
      totalResults: items.length,
    };
  }
}

/**
 * Mock Provider Implementation
 */
export class MockProvider implements MovieProvider {
  readonly name = 'mock';

  private config: Required<MockProviderConfig>;
  private dataGenerator: MockDataGenerator;

  constructor(config: MockProviderConfig = {}) {
    this.config = {
      delay: config.delay ?? 100,
      failureRate: config.failureRate ?? 0,
      failureType: config.failureType ?? 'network',
      verbose: config.verbose ?? false,
    };

    this.dataGenerator = new MockDataGenerator();

    if (this.config.verbose) {
      console.log('[MockProvider] Initialized with config:', this.config);
    }
  }

  /**
   * Simulate delay and potential failure
   */
  private async simulateRequest<T>(operation: string, fn: () => T): Promise<T> {
    if (this.config.verbose) {
      console.log(`[MockProvider] ${operation}`);
    }

    // Simulate delay
    if (this.config.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delay));
    }

    // Simulate failure
    if (this.config.failureRate > 0 && Math.random() < this.config.failureRate) {
      throw this.generateError();
    }

    return fn();
  }

  /**
   * Generate error based on configuration
   */
  private generateError(): Error {
    switch (this.config.failureType) {
      case 'rate_limit':
        return new RateLimitError('Mock rate limit exceeded', 60, this.name);
      case 'server_error':
        return new (class extends Error {
          statusCode = 500;
          provider = 'mock';
          retryable = true;
        })('Mock server error');
      case 'timeout':
        return new Error('Mock request timeout');
      case 'network':
      default:
        return new NetworkError('Mock network error', this.name);
    }
  }

  /**
   * Get a single movie by ID
   */
  async getMovie(id: number | string): Promise<MovieDetails> {
    return this.simulateRequest('getMovie', () => {
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      return this.dataGenerator.generateMovieDetails(numericId);
    });
  }

  /**
   * Get popular movies
   */
  async getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('getPopularMovies', () => {
      const movies = Array.from({ length: 100 }, (_, i) =>
        this.dataGenerator.generateMovie(i + 1, {
          popularity: 1000 - i * 10,
        })
      );
      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Get popular movies with cursor
   */
  async getPopularMoviesCursor(cursor?: string): Promise<CursorPaginatedResponse<Movie>> {
    return this.simulateRequest('getPopularMoviesCursor', () => {
      const page = cursor ? parseInt(Buffer.from(cursor, 'base64').toString()) : 1;
      const movies = Array.from({ length: 20 }, (_, i) =>
        this.dataGenerator.generateMovie((page - 1) * 20 + i + 1)
      );

      const hasMore = page < 5; // Mock 5 pages
      const nextCursor = hasMore ? Buffer.from(String(page + 1)).toString('base64') : null;

      return {
        results: movies,
        cursor: nextCursor,
        hasMore,
      };
    });
  }

  /**
   * Get top-rated movies
   */
  async getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('getTopRatedMovies', () => {
      const movies = Array.from({ length: 100 }, (_, i) =>
        this.dataGenerator.generateMovie(i + 1, {
          voteAverage: 9 - i * 0.01,
        })
      );
      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Get now playing movies
   */
  async getNowPlayingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('getNowPlayingMovies', () => {
      const movies = Array.from({ length: 50 }, (_, i) =>
        this.dataGenerator.generateMovie(i + 1, {
          releaseDate: '2024-01-01',
        })
      );
      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Get upcoming movies
   */
  async getUpcomingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('getUpcomingMovies', () => {
      const movies = Array.from({ length: 50 }, (_, i) =>
        this.dataGenerator.generateMovie(i + 1, {
          releaseDate: '2025-06-01',
        })
      );
      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Search movies
   */
  async searchMovies(query: string, page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('searchMovies', () => {
      const movies = Array.from({ length: 30 }, (_, i) =>
        this.dataGenerator.generateMovie(i + 1, {
          title: `${query} ${i + 1}`,
        })
      );
      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Search movies with filters
   */
  async searchMoviesWithFilters(
    query: string,
    filters: MovieFilters,
    page: number = 1
  ): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('searchMoviesWithFilters', () => {
      const movies = Array.from({ length: 30 }, (_, i) => {
        const movie = this.dataGenerator.generateMovie(i + 1, {
          title: `${query} ${i + 1}`,
        });

        // Apply filters
        if (filters.year) {
          movie.releaseDate = `${filters.year}-01-01`;
        }
        if (filters.minRating) {
          movie.voteAverage = Math.max(movie.voteAverage, filters.minRating);
        }

        return movie;
      });

      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Get movie recommendations
   */
  async getRecommendations(movieId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('getRecommendations', () => {
      const movies = Array.from({ length: 20 }, (_, i) =>
        this.dataGenerator.generateMovie(movieId + i + 1, {
          title: `Recommended Movie ${i + 1}`,
        })
      );
      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Get similar movies
   */
  async getSimilarMovies(movieId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('getSimilarMovies', () => {
      const movies = Array.from({ length: 20 }, (_, i) =>
        this.dataGenerator.generateMovie(movieId + i + 100, {
          title: `Similar Movie ${i + 1}`,
        })
      );
      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Get movie credits
   */
  async getMovieCredits(movieId: number): Promise<MovieCredits> {
    return this.simulateRequest('getMovieCredits', () => ({
      cast: this.dataGenerator.generateCast(10),
      crew: this.dataGenerator.generateCrew(5),
    }));
  }

  /**
   * Get movie videos
   */
  async getMovieVideos(movieId: number): Promise<MovieVideo[]> {
    return this.simulateRequest('getMovieVideos', () =>
      this.dataGenerator.generateVideos(movieId, 3)
    );
  }

  /**
   * Get movie images
   */
  async getMovieImages(movieId: number): Promise<{
    backdrops: MovieImage[];
    posters: MovieImage[];
    logos: MovieImage[];
  }> {
    return this.simulateRequest('getMovieImages', () =>
      this.dataGenerator.generateImages(movieId)
    );
  }

  /**
   * Discover movies by genre
   */
  async discoverByGenre(genreId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    return this.simulateRequest('discoverByGenre', () => {
      const movies = Array.from({ length: 50 }, (_, i) =>
        this.dataGenerator.generateMovie(i + 1, {
          genreIds: [genreId],
        })
      );
      return this.dataGenerator.generatePaginatedResponse(movies, page);
    });
  }

  /**
   * Get movie by external ID
   */
  async getMovieByExternalId(imdbId: string): Promise<MovieDetails> {
    return this.simulateRequest('getMovieByExternalId', () => {
      const id = parseInt(imdbId.replace(/\D/g, '')) || 1;
      return this.dataGenerator.generateMovieDetails(id, { imdbId });
    });
  }

  /**
   * Batch get movies
   */
  async getMoviesBatch(ids: number[]): Promise<MovieDetails[]> {
    return this.simulateRequest('getMoviesBatch', () =>
      ids.map((id) => this.dataGenerator.generateMovieDetails(id))
    );
  }

  /**
   * Prefetch movie
   */
  async prefetchMovie(id: number): Promise<void> {
    await this.simulateRequest('prefetchMovie', () => {
      this.dataGenerator.generateMovieDetails(id);
    });
  }

  /**
   * Get image URL
   */
  getImageUrl(path: string, size?: 'small' | 'medium' | 'large' | 'original'): string {
    return `https://mock-images.example.com/${size || 'medium'}${path}`;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MockProviderConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get configuration
   */
  getConfig(): Required<MockProviderConfig> {
    return { ...this.config };
  }
}
