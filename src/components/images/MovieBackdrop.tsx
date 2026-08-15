/**
 * Movie Backdrop Component
 * 
 * Optimized backdrop rendering for hero sections
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getBackdropUrl, getPlaceholderUrl, getResponsiveSizes, getImageDimensions, generateBlurDataURL } from '@/lib/images/imageBuilder';
import type { ImageSize } from '@/lib/images/imageBuilder';

interface MovieBackdropProps {
  path: string | null | undefined;
  alt: string;
  size?: ImageSize;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  quality?: number;
  onLoad?: () => void;
}

export function MovieBackdrop({
  path,
  alt,
  size = 'large',
  priority = false,
  className = '',
  fill = true,
  quality = 90,
  onLoad,
}: MovieBackdropProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const imageUrl = error ? getPlaceholderUrl('backdrop') : getBackdropUrl(path, size);
  const dimensions = getImageDimensions('backdrop', size);

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const imageProps = fill
    ? {
        fill: true,
        sizes: getResponsiveSizes('backdrop'),
      }
    : {
        width: dimensions.width,
        height: dimensions.height,
      };

  return (
    <div className={`relative ${className}`}>
      <Image
        src={imageUrl}
        alt={alt || 'Movie backdrop'}
        {...imageProps}
        className={`object-cover transition-opacity duration-500 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
        quality={quality}
        priority={priority}
        placeholder="blur"
        blurDataURL={generateBlurDataURL('#0f172a')}
        onLoad={handleLoad}
        onError={handleError}
      />

      {loading && (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black animate-pulse" />
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-gray-700 mb-3 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <span className="text-sm text-gray-600">No backdrop available</span>
          </div>
        </div>
      )}
    </div>
  );
}
