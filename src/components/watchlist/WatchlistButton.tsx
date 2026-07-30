'use client';

/**
 * WatchlistButton Component
 * 
 * Production-grade watchlist toggle button with:
 * - Framer Motion microinteractions
 * - Optimistic updates
 * - Loading states
 * - Error handling with undo
 * - Accessibility (ARIA, keyboard)
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, BookmarkCheck, Loader2, Plus } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface WatchlistButtonProps {
  movieId: number;
  movieTitle?: string;
  variant?: 'default' | 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg';
  onAdd?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function WatchlistButton({
  movieId,
  movieTitle = 'this movie',
  variant = 'default',
  size = 'md',
  onAdd,
  onRemove,
  className = '',
}: WatchlistButtonProps) {
  const { isInWatchlist, isToggling, toggle, toggleError } = useWatchlist(movieId);
  const [lastAction, setLastAction] = useState<'add' | 'remove' | null>(null);

  // Handle errors with undo
  useEffect(() => {
    if (toggleError && lastAction) {
      toast.error(`Failed to ${lastAction === 'add' ? 'add' : 'remove'} ${movieTitle}`, {
        description: 'The action has been rolled back.',
        action: {
          label: 'Retry',
          onClick: () => handleToggle(),
        },
      });
    }
  }, [toggleError, lastAction, movieTitle]);

  const handleToggle = async () => {
    try {
      const result = await toggle(movieId);
      const action = result.action === 'added' ? 'add' : 'remove';
      
      setLastAction(action);

      // Success toast with undo
      if (result.action === 'added') {
        onAdd?.();
        toast.success(`${movieTitle} added to watchlist`, {
          action: {
            label: 'Undo',
            onClick: () => toggle(movieId),
          },
        });
      } else {
        onRemove?.();
        toast.info(`${movieTitle} removed from watchlist`, {
          action: {
            label: 'Undo',
            onClick: () => toggle(movieId),
          },
        });
      }
    } catch (error) {
      // Error is handled by useEffect
      console.error('Toggle error:', error);
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  const iconSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <motion.button
        onClick={handleToggle}
        disabled={isToggling}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={`
          relative flex items-center justify-center rounded-full
          ${iconSizeClasses[size]}
          ${isInWatchlist 
            ? 'bg-red-600 text-white hover:bg-red-700' 
            : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
          }
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black
          ${className}
        `}
        aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-pressed={isInWatchlist}
      >
        <AnimatePresence mode="wait">
          {isToggling ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ 
                opacity: { duration: 0.2 },
                rotate: { duration: 0.6, repeat: Infinity, ease: 'linear' }
              }}
            >
              <Loader2 size={iconSize[size]} />
            </motion.div>
          ) : isInWatchlist ? (
            <motion.div
              key="added"
              initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
              transition={{ 
                type: 'spring', 
                stiffness: 500, 
                damping: 15 
              }}
            >
              <BookmarkCheck size={iconSize[size]} />
            </motion.div>
          ) : (
            <motion.div
              key="not-added"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ 
                type: 'spring', 
                stiffness: 500, 
                damping: 15 
              }}
            >
              <Bookmark size={iconSize[size]} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // Full variant with text
  if (variant === 'full') {
    return (
      <motion.button
        onClick={handleToggle}
        disabled={isToggling}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={`
          relative flex items-center justify-center gap-2 rounded-lg font-medium
          ${sizeClasses[size]}
          ${isInWatchlist 
            ? 'bg-red-600 text-white hover:bg-red-700' 
            : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20'
          }
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black
          ${className}
        `}
        aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-pressed={isInWatchlist}
      >
        <AnimatePresence mode="wait">
          {isToggling ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ 
                opacity: { duration: 0.2 },
                rotate: { duration: 0.6, repeat: Infinity, ease: 'linear' }
              }}
            >
              <Loader2 size={iconSize[size]} />
            </motion.div>
          ) : (
            <motion.div
              key={isInWatchlist ? 'added' : 'not-added'}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {isInWatchlist ? (
                <BookmarkCheck size={iconSize[size]} />
              ) : (
                <Plus size={iconSize[size]} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <span>
          {isToggling ? 'Saving...' : isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </span>
      </motion.button>
    );
  }

  // Default variant (icon + minimal text)
  return (
    <motion.button
      onClick={handleToggle}
      disabled={isToggling}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        relative flex items-center gap-2 rounded-lg font-medium
        ${sizeClasses[size]}
        ${isInWatchlist 
          ? 'bg-red-600 text-white hover:bg-red-700' 
          : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20'
        }
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black
        ${className}
      `}
      aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-pressed={isInWatchlist}
    >
      <AnimatePresence mode="wait">
        {isToggling ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ 
              opacity: { duration: 0.15 },
              rotate: { duration: 0.6, repeat: Infinity, ease: 'linear' }
            }}
          >
            <Loader2 size={iconSize[size]} />
          </motion.div>
        ) : isInWatchlist ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0, rotate: 180 }}
            transition={{ 
              type: 'spring', 
              stiffness: 500, 
              damping: 15,
              duration: 0.3 
            }}
          >
            <BookmarkCheck size={iconSize[size]} />
          </motion.div>
        ) : (
          <motion.div
            key="plus"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <Plus size={iconSize[size]} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * Watchlist Badge - Shows count
 */
export function WatchlistBadge({ className = '' }: { className?: string }) {
  const { watchlist } = useWatchlist();

  if (watchlist.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className={`
        absolute -top-1 -right-1 h-5 w-5 rounded-full 
        bg-red-600 text-white text-xs font-bold
        flex items-center justify-center
        ${className}
      `}
    >
      {watchlist.length > 99 ? '99+' : watchlist.length}
    </motion.div>
  );
}
