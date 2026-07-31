/**
 * TMDb Response Mappers
 * 
 * Convert TMDb API responses to unified Movie types
 */

import type {
  Movie,
  MovieDetails,
  Credits,
  CastMember,
  CrewMember,
  VideoCollection,
  Video,
  ImageCollection,
  Image,
  Review,
  Genre,
  PaginatedResponse,
} from '@/types/movie';
import { buildImageUrl } from './config';

/**
 * TMDb API Response Types
 */
interface TMDbMovie {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  overview: string;
  tagline?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  status?: string;
  revenue?: number;
  budget?: number;
  popularity?: number;
}

interface TMDbCredits {
  id: number;
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
    popularity?: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }[];
}

interface TMDbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
  size?: number;
}

interface TMDbImage {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
  vote_count: number;
}

interface TMDbReview {
  id: string;
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  updated_at: string;
  url: string;
}

/**
 * Map TMDb movie to unified Movie type
 */
export function mapTMDbMovie(tmdbMovie: TMDbMovie, genreMap?: Map<number, string>): Movie {
  const year = tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 0;
  
  // Map genre IDs to names
  let genres: string[] = [];
  if (tmdbMovie.genres) {
    genres = tmdbMovie.genres.map((g) => g.name);
  } else if (tmdbMovie.genre_ids && genreMap) {
    genres = tmdbMovie.genre_ids
      .map((id) => genreMap.get(id))
      .filter((name): name is string => !!name);
  }

  // Format runtime
  const runtime = tmdbMovie.runtime
    ? `${Math.floor(tmdbMovie.runtime / 60)}h ${tmdbMovie.runtime % 60}m`
    : 'N/A';

  // Format votes
  const votes = tmdbMovie.vote_count >= 1000
    ? `${(tmdbMovie.vote_count / 1000).toFixed(1)}K`
    : tmdbMovie.vote_count.toString();

  return {
    id: tmdbMovie.id,
    title: tmdbMovie.title,
    year,
    rating: Math.round(tmdbMovie.vote_average * 10) / 10,
    votes,
    genres,
    runtime,
    overview: tmdbMovie.overview,
    tagline: tmdbMovie.tagline,
    poster: buildImageUrl(tmdbMovie.poster_path, 'poster', 'medium'),
    backdrop: buildImageUrl(tmdbMovie.backdrop_path, 'backdrop', 'large'),
    language: tmdbMovie.original_language,
    status: tmdbMovie.status,
    popularity: tmdbMovie.popularity,
    provider: 'tmdb',
  };
}

/**
 * Map TMDb movie details to MovieDetails
 */
export function mapTMDbMovieDetails(
  tmdbMovie: TMDbMovie,
  credits?: TMDbCredits,
  videos?: { results: TMDbVideo[] },
  images?: { backdrops: TMDbImage[]; posters: TMDbImage[]; logos: TMDbImage[] },
  reviews?: { results: TMDbReview[] },
  similar?: { results: TMDbMovie[] },
  recommendations?: { results: TMDbMovie[] }
): MovieDetails {
  const baseMovie = mapTMDbMovie(tmdbMovie);

  const details: MovieDetails = {
    ...baseMovie,
  };

  if (credits) {
    details.credits = mapTMDbCredits(credits);
    
    // Extract director
    const director = credits.crew.find((c) => c.job === 'Director');
    if (director) {
      details.director = director.name;
    }

    // Extract top cast
    details.cast = credits.cast.slice(0, 5).map((c) => c.name);
  }

  if (videos) {
    details.videos = mapTMDbVideos(videos);
    
    // Extract trailer
    const trailer = videos.results.find(
      (v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official
    );
    if (trailer) {
      details.trailer = `https://www.youtube.com/watch?v=${trailer.key}`;
    }
  }

  if (images) {
    details.images = mapTMDbImages(images);
  }

  if (reviews) {
    details.reviews = reviews.results.map(mapTMDbReview);
  }

  if (similar) {
    details.similar = similar.results.map((m) => mapTMDbMovie(m));
  }

  if (recommendations) {
    details.recommendations = recommendations.results.map((m) => mapTMDbMovie(m));
  }

  return details;
}

/**
 * Map TMDb credits
 */
export function mapTMDbCredits(tmdbCredits: TMDbCredits): Credits {
  return {
    id: tmdbCredits.id,
    cast: tmdbCredits.cast.map(
      (c): CastMember => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profile_path,
        order: c.order,
        popularity: c.popularity,
      })
    ),
    crew: tmdbCredits.crew.map(
      (c): CrewMember => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profile_path: c.profile_path,
      })
    ),
  };
}

/**
 * Map TMDb videos
 */
export function mapTMDbVideos(tmdbVideos: { results: TMDbVideo[] }): VideoCollection {
  return {
    results: tmdbVideos.results.map(
      (v): Video => ({
        id: v.id,
        key: v.key,
        name: v.name,
        site: v.site,
        type: v.type,
        official: v.official,
        published_at: v.published_at,
        size: v.size,
      })
    ),
  };
}

/**
 * Map TMDb images
 */
export function mapTMDbImages(tmdbImages: {
  backdrops: TMDbImage[];
  posters: TMDbImage[];
  logos: TMDbImage[];
}): ImageCollection {
  return {
    backdrops: tmdbImages.backdrops.map(
      (i): Image => ({
        file_path: i.file_path,
        width: i.width,
        height: i.height,
        vote_average: i.vote_average,
        vote_count: i.vote_count,
      })
    ),
    posters: tmdbImages.posters.map(
      (i): Image => ({
        file_path: i.file_path,
        width: i.width,
        height: i.height,
        vote_average: i.vote_average,
        vote_count: i.vote_count,
      })
    ),
    logos: tmdbImages.logos.map(
      (i): Image => ({
        file_path: i.file_path,
        width: i.width,
        height: i.height,
        vote_average: i.vote_average,
        vote_count: i.vote_count,
      })
    ),
  };
}

/**
 * Map TMDb review
 */
export function mapTMDbReview(tmdbReview: TMDbReview): Review {
  return {
    id: tmdbReview.id,
    author: tmdbReview.author,
    author_details: {
      name: tmdbReview.author_details.name,
      username: tmdbReview.author_details.username,
      avatar_path: tmdbReview.author_details.avatar_path || undefined,
      rating: tmdbReview.author_details.rating || undefined,
    },
    content: tmdbReview.content,
    created_at: tmdbReview.created_at,
    updated_at: tmdbReview.updated_at,
    url: tmdbReview.url,
  };
}

/**
 * Map TMDb paginated response
 */
export function mapTMDbPaginatedResponse<T>(
  response: {
    results: T[];
    page: number;
    total_pages: number;
    total_results: number;
  },
  mapper: (item: T) => unknown
): PaginatedResponse<unknown> {
  return {
    results: response.results.map(mapper),
    page: response.page,
    total_pages: response.total_pages,
    total_results: response.total_results,
    hasNextPage: response.page < response.total_pages,
    hasPreviousPage: response.page > 1,
  };
}

/**
 * Map TMDb genre
 */
export function mapTMDbGenre(tmdbGenre: { id: number; name: string }): Genre {
  return {
    id: tmdbGenre.id,
    name: tmdbGenre.name,
  };
}
