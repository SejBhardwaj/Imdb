/**
 * Movie Poster Component
 * 
 * Optimized poster rendering with fallbacks and blur placeholders
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getPosterUrl, getPlaceholderUrl, getResponsiveSizes, getImageDimensions, generateBlurDataURL, getImageQuality } from '@/lib/images/imageBuilder';
import type { ImageSize } from '@/lib/images/imageBuilder';

interface MoviePosterProps {
  path: string | null | undefined;
  alt: string;
  size?: ImageSize;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function MoviePoster({
  path,
  alt,
  size = 'medium',
  priority = false,
  className = '',
  fill = false,
  width,
  height,
  quality,
  onLoad,
  onError,
}: MoviePosterProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const imageUrl = error ? getPlaceholderUrl('poster') : getPosterUrl(path, size);
  const dimensions = getImageDimensions('poster', size);
  const finalQuality = quality ?? getImageQuality(priority);

  const handleError = () => {
    setError(true);
    setLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const imageProps = fill
    ? {
        fill: true,
        sizes: getResponsiveSizes('poster'),
      }
    : {
        width: width || dimensions.width,
        height: height || dimensions.height,
      };

  return (
    <div className={`relative ${className}`}>
      <Image
        src={imageUrl}
        alt={alt || 'Movie poster'}
        {...imageProps}
        className={`object-cover transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
        quality={finalQuality}
        priority={priority}
        placeholder="blur"
        blurDataURL={generateBlurDataURL('#1a1a2e')}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black animate-pulse" />
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black">
          <svg
            className="w-12 h-12 text-gray-600 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs text-gray-500">No poster</span>
        </div>
      )}
    </div>
  );
}
