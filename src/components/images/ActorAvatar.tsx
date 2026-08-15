/**
 * Actor Avatar Component
 * 
 * Optimized profile image rendering for cast/crew
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getProfileUrl, getPlaceholderUrl, getResponsiveSizes, getImageDimensions, generateBlurDataURL } from '@/lib/images/imageBuilder';
import type { ImageSize } from '@/lib/images/imageBuilder';

interface ActorAvatarProps {
  path: string | null | undefined;
  name: string;
  size?: ImageSize;
  priority?: boolean;
  className?: string;
  circular?: boolean;
}

export function ActorAvatar({
  path,
  name,
  size = 'medium',
  priority = false,
  className = '',
  circular = true,
}: ActorAvatarProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const imageUrl = error ? getPlaceholderUrl('profile') : getProfileUrl(path, size);
  const dimensions = getImageDimensions('profile', size);

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  // Extract initials from name
  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`relative aspect-square ${circular ? 'rounded-full' : 'rounded-lg'} overflow-hidden`}>
        <Image
          src={imageUrl}
          alt={name || 'Actor'}
          width={dimensions.width}
          height={dimensions.height}
          className={`object-cover transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          quality={75}
          priority={priority}
          placeholder="blur"
          blurDataURL={generateBlurDataURL('#2d3748')}
          sizes={getResponsiveSizes('profile')}
          onLoad={handleLoad}
          onError={handleError}
        />

        {loading && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 animate-pulse" />
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900">
            <span className="text-2xl font-bold text-gray-400">
              {getInitials(name || '??')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
