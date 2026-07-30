// TMDB API Response Types

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  video: boolean;
}

export interface TMDBMovieDetails extends TMDBMovie {
  budget: number;
  revenue: number;
  runtime: number;
  status: string;
  tagline: string;
  homepage: string;
  imdb_id: string;
  genres: TMDBGenre[];
  production_companies: TMDBProductionCompany[];
  production_countries: TMDBProductionCountry[];
  spoken_languages: TMDBSpokenLanguage[];
  belongs_to_collection: TMDBCollection | null;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
}

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  known_for: (TMDBMovie | TMDBTVShow)[];
  adult: boolean;
  gender: number;
}

export interface TMDBPersonDetails extends TMDBPerson {
  also_known_as: string[];
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  homepage: string | null;
  imdb_id: string;
}

export interface TMDBCast {
  id: number;
  cast_id: number;
  credit_id: string;
  character: string;
  name: string;
  profile_path: string | null;
  order: number;
  gender: number;
  known_for_department: string;
}

export interface TMDBCrew {
  id: number;
  credit_id: string;
  department: string;
  job: string;
  name: string;
  profile_path: string | null;
  gender: number;
}

export interface TMDBCredits {
  id: number;
  cast: TMDBCast[];
  crew: TMDBCrew[];
}

export interface TMDBMovieCredit {
  id: number;
  title: string;
  original_title: string;
  character?: string;
  job?: string;
  department?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  credit_id: string;
  adult: boolean;
  genre_ids: number[];
}

export interface TMDBTVCredit {
  id: number;
  name: string;
  original_name: string;
  character?: string;
  job?: string;
  department?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  credit_id: string;
  episode_count: number;
  genre_ids: number[];
}

export interface TMDBPersonCredits {
  id: number;
  cast: TMDBMovieCredit[];
  crew: TMDBMovieCredit[];
}

export interface TMDBPersonCombinedCredits {
  id: number;
  cast: (TMDBMovieCredit | TMDBTVCredit)[];
  crew: (TMDBMovieCredit | TMDBTVCredit)[];
}

export interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TMDBImage {
  aspect_ratio: number;
  file_path: string;
  height: number;
  width: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
}

export interface TMDBImages {
  id: number;
  backdrops: TMDBImage[];
  posters: TMDBImage[];
  profiles?: TMDBImage[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TMDBProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TMDBSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface TMDBCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDBExternalIds {
  id: number;
  imdb_id: string | null;
  facebook_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
  tiktok_id: string | null;
  youtube_id: string | null;
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
