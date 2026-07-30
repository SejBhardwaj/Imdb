'use client';

/**
 * Favorite Button - Client Island
 * 
 * Integrates with existing watchlist system
 */

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';

interface FavoriteButtonProps {
  movieId: number;
  movieTitle: string;
}

export default function FavoriteButton({ movieId, movieTitle }: FavoriteButtonProps) {
  const { isInWatchlist, isToggling, toggle } = useWatchlist(movieId);

  const handleClick = async () => {
    try {
      await toggle(movieId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isToggling}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${isInWatchlist
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
        }
      `}
      aria-label={isInWatchlist ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isInWatchlist}
    >
      <motion.div
        animate={{
          scale: isInWatchlist ? [1, 1.2, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <Heart
          className={`w-5 h-5 ${isInWatchlist ? 'fill-current' : ''}`}
        />
      </motion.div>
      <span>{isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
    </motion.button>
  );
}
