/**
 * Mock Provider Implementation
 * 
 * Fallback provider for testing and development
 */

import { MovieProvider } from '../base/MovieProvider';
import type {
  Movie,
  MovieDetails,
  PaginatedResponse,
  SearchQuery,
  DiscoverOptions,
  Credits,
  VideoCollection,
  ImageCollection,
  Review,
  Genre,
  ProviderName,
} from '@/types/movie';
import {
  TRENDING_MOVIES,
  TOP_RATED_MOVIES,
  UPCOMING_MOVIES,
  FEATURED_MOVIE,
  HERO_MOVIE,
  GENRES,
} from '@/lib/mockData';

export class MockProvider extends MovieProvider {
  readonly name: ProviderName = 'mock';
  readonly priority: number = 99; // Lowest priority

  private allMovies: Movie[] = [
    ...TRENDING_MOVIES,
    ...TOP_RATED_MOVIES,
    ...UPCOMING_MOVIES,
    FEATURED_MOVIE,
    HERO_MOVIE,
  ];

  /**
   * Simulate network delay
   */
  private async delay(ms: number = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Paginate array
   */
  private paginate<T>(items: T[], page: number = 1, perPage: number = 20): PaginatedResponse<T> {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const results = items.slice(start, end);
    const total_pages = Math.ceil(items.length / perPage);

    return {
      results,
      page,
      total_pages,
      total_results: items.length,
      hasNextPage: page < total_pages,
      hasPreviousPage: page > 1,
    };
  }

  async getMovie(id: number): Promise<Movie> {
    await this.delay();
    const movie = this.allMovies.find((m) => m.id === id);
    if (!movie) {
      throw new Error(`Movie ${id} not found in mock data`);
    }
    return movie;
  }

  async getMovieDetails(id: number): Promise<MovieDetails> {
    await this.delay();
    const movie = await this.getMovie(id);
    
    return {
      ...movie,
      credits: {
        id,
        cast: movie.cast?.map((name, index) => ({
          id: index,
          name,
          character: 'Character',
          order: index,
        })) || [],
        crew: movie.director ? [{
          id: 0,
          name: movie.director,
          job: 'Director',
          department: 'Directing',
        }] : [],
      },
      videos: {
        results: movie.trailer ? [{
          id: '1',
          key: movie.trailer.split('=')[1] || '',
          name: 'Official Trailer',
          site: 'YouTube',
          type: 'Trailer',
          official: true,
          published_at: new Date().toISOString(),
        }] : [],
      },
    };
  }

  async getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    return this.paginate(TRENDING_MOVIES, page);
  }

  async getTrendingMovies(timeWindow: 'day' | 'week' = 'week', page: number = 1): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    return this.paginate(TRENDING_MOVIES, page);
  }

  async getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    return this.paginate(TOP_RATED_MOVIES, page);
  }

  async getUpcomingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    return this.paginate(UPCOMING_MOVIES, page);
  }

  async getNowPlayingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    return this.paginate(TRENDING_MOVIES, page);
  }

  async searchMovies(query: SearchQuery): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    const filtered = this.allMovies.filter((m) =>
      m.title.toLowerCase().includes(query.query.toLowerCase())
    );
    return this.paginate(filtered, query.page || 1);
  }

  async discoverMovies(options: DiscoverOptions): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    let filtered = [...this.allMovies];

    if (options.with_genres) {
      const genreIds = options.with_genres.split(',');
      filtered = filtered.filter((m) =>
        m.genres.some((g) => genreIds.includes(g))
      );
    }

    if (options.year) {
      filtered = filtered.filter((m) => m.year === options.year);
    }

    return this.paginate(filtered, options.page || 1);
  }

  async getMovieCredits(id: number): Promise<Credits> {
    await this.delay();
    const movie = await this.getMovie(id);
    
    return {
      id,
      cast: movie.cast?.map((name, index) => ({
        id: index,
        name,
        character: 'Character',
        order: index,
      })) || [],
      crew: movie.director ? [{
        id: 0,
        name: movie.director,
        job: 'Director',
        department: 'Directing',
      }] : [],
    };
  }

  async getMovieVideos(id: number): Promise<VideoCollection> {
    await this.delay();
    const movie = await this.getMovie(id);
    
    return {
      results: movie.trailer ? [{
        id: '1',
        key: movie.trailer.split('=')[1] || '',
        name: 'Official Trailer',
        site: 'YouTube',
        type: 'Trailer',
        official: true,
        published_at: new Date().toISOString(),
      }] : [],
    };
  }

  async getMovieImages(): Promise<ImageCollection> {
    await this.delay();
    return {
      backdrops: [],
      posters: [],
      logos: [],
    };
  }

  async getMovieReviews(id: number, page: number = 1): Promise<PaginatedResponse<Review>> {
    await this.delay();
    return {
      results: [],
      page,
      total_pages: 0,
      total_results: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  async getSimilarMovies(id: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    return this.paginate(TRENDING_MOVIES.slice(0, 5), page);
  }

  async getRecommendedMovies(id: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    return this.paginate(TOP_RATED_MOVIES.slice(0, 5), page);
  }

  async getGenres(): Promise<Genre[]> {
    await this.delay();
    return GENRES.filter((g) => g !== 'All').map((name, index) => ({
      id: index + 1,
      name,
    }));
  }

  async getMoviesByGenre(genreId: number, page: number = 1): Promise<PaginatedResponse<Movie>> {
    await this.delay();
    return this.paginate(TRENDING_MOVIES, page);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
