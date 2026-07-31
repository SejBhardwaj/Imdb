/**
 * TMDb API Configuration
 */

export const TMDB_CONFIG = {
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
} as const;

export const TMDB_IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
    original: 'original',
  },
  logo: {
    small: 'w45',
    medium: 'w92',
    large: 'w185',
    original: 'original',
  },
} as const;

/**
 * Get TMDb API key from environment
 */
export function getTMDbApiKey(): string | null {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ TMDb API key not configured. Movie data features will be disabled. Set NEXT_PUBLIC_TMDB_API_KEY in .env.local');
    return null;
  }
  
  return apiKey;
}

/**
 * Build image URL
 */
export function buildImageUrl(
  path: string | null | undefined,
  type: 'poster' | 'backdrop' | 'profile' | 'logo' = 'poster',
  size: 'small' | 'medium' | 'large' | 'original' = 'medium'
): string {
  if (!path) {
    return '/placeholder-movie.jpg'; // Fallback
  }

  const sizeConfig = TMDB_IMAGE_SIZES[type];
  const sizeValue = sizeConfig[size];

  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${sizeValue}${path}`;
}
