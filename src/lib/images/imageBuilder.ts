/**
 * Enterprise Image URL Builder
 * 
 * Centralized image URL generation for TMDb assets
 * Netflix/IMDb/Disney+ level implementation
 */

import { TMDB_CONFIG, TMDB_IMAGE_SIZES } from '@/providers/tmdb/config';

export type ImageType = 'poster' | 'backdrop' | 'profile' | 'logo' | 'still';
export type ImageSize = 'small' | 'medium' | 'large' | 'original';

export interface ImageUrlOptions {
  path: string | null | undefined;
  type: ImageType;
  size?: ImageSize;
  fallback?: string;
}

/**
 * Build TMDb image URL with validation
 */
export function buildImageUrl(
  path: string | null | undefined,
  type: ImageType = 'poster',
  size: ImageSize = 'medium'
): string {
  // Handle null/undefined
  if (!path) {
    return getPlaceholderUrl(type);
  }

  // Validate path format
  if (!path.startsWith('/')) {
    console.warn(`[ImageBuilder] Invalid TMDb path: ${path}`);
    return getPlaceholderUrl(type);
  }

  const sizeConfig = TMDB_IMAGE_SIZES[type];
  const sizeValue = sizeConfig?.[size] || sizeConfig?.medium || 'w500';

  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${sizeValue}${path}`;
}

/**
 * Get poster URL
 */
export function getPosterUrl(
  path: string | null | undefined,
  size: ImageSize = 'medium'
): string {
  return buildImageUrl(path, 'poster', size);
}

/**
 * Get backdrop URL
 */
export function getBackdropUrl(
  path: string | null | undefined,
  size: ImageSize = 'large'
): string {
  return buildImageUrl(path, 'backdrop', size);
}

/**
 * Get profile URL (for cast/crew)
 */
export function getProfileUrl(
  path: string | null | undefined,
  size: ImageSize = 'medium'
): string {
  return buildImageUrl(path, 'profile', size);
}

/**
 * Get logo URL
 */
export function getLogoUrl(
  path: string | null | undefined,
  size: ImageSize = 'medium'
): string {
  return buildImageUrl(path, 'logo', size);
}

/**
 * Get still URL (for TV episodes)
 */
export function getStillUrl(
  path: string | null | undefined,
  size: ImageSize = 'medium'
): string {
  return buildImageUrl(path, 'still', size);
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(
  videoKey: string,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'
): string {
  if (!videoKey) {
    return '/placeholder-video.jpg';
  }
  return `https://img.youtube.com/vi/${videoKey}/${quality}.jpg`;
}

/**
 * Get placeholder URL based on image type
 */
export function getPlaceholderUrl(type: ImageType): string {
  const placeholders = {
    poster: '/placeholder-poster.svg',
    backdrop: '/placeholder-backdrop.svg',
    profile: '/placeholder-profile.svg',
    logo: '/placeholder-poster.svg',
    still: '/placeholder-backdrop.svg',
  };

  return placeholders[type] || '/placeholder-poster.svg';
}

/**
 * Get responsive sizes string for Next.js Image
 */
export function getResponsiveSizes(type: ImageType): string {
  const sizes = {
    poster: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
    backdrop: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1280px',
    profile: '(max-width: 640px) 20vw, (max-width: 1024px) 15vw, 10vw',
    logo: '(max-width: 640px) 30vw, (max-width: 1024px) 20vw, 15vw',
    still: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  };

  return sizes[type] || sizes.poster;
}

/**
 * Validate if image URL is from TMDb
 */
export function isTMDbImage(url: string): boolean {
  return url.includes('image.tmdb.org');
}

/**
 * Extract image path from full URL
 */
export function extractImagePath(url: string): string | null {
  if (!url || !isTMDbImage(url)) {
    return null;
  }

  const match = url.match(/\/t\/p\/[^/]+(\/.+)$/);
  return match ? match[1] : null;
}

/**
 * Get image dimensions for specific type and size
 */
export function getImageDimensions(
  type: ImageType,
  size: ImageSize
): { width: number; height: number } {
  const dimensions = {
    poster: {
      small: { width: 185, height: 278 },
      medium: { width: 342, height: 513 },
      large: { width: 500, height: 750 },
      original: { width: 2000, height: 3000 },
    },
    backdrop: {
      small: { width: 300, height: 169 },
      medium: { width: 780, height: 439 },
      large: { width: 1280, height: 720 },
      original: { width: 1920, height: 1080 },
    },
    profile: {
      small: { width: 45, height: 68 },
      medium: { width: 185, height: 278 },
      large: { width: 632, height: 948 },
      original: { width: 2000, height: 3000 },
    },
    logo: {
      small: { width: 45, height: 45 },
      medium: { width: 92, height: 92 },
      large: { width: 185, height: 185 },
      original: { width: 500, height: 500 },
    },
    still: {
      small: { width: 185, height: 104 },
      medium: { width: 300, height: 169 },
      large: { width: 500, height: 281 },
      original: { width: 1920, height: 1080 },
    },
  };

  return dimensions[type]?.[size] || dimensions.poster.medium;
}

/**
 * Generate blur placeholder data URL
 */
export function generateBlurDataURL(color: string = '#1a1a1a'): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='1'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='1 1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Cg filter='url(%23b)'%3E%3Crect width='8' height='8' fill='${color}'/%3E%3C/g%3E%3C/svg%3E`;
}

/**
 * Get quality setting based on priority
 */
export function getImageQuality(priority: boolean): number {
  return priority ? 90 : 75;
}
