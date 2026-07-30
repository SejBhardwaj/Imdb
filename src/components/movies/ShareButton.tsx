'use client';

/**
 * Share Button - Client Island
 * 
 * Features:
 * - Web Share API
 * - Copy to clipboard fallback
 * - Framer Motion animations
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  movieId: number;
  movieTitle: string;
}

export default function ShareButton({ movieId, movieTitle }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/movies/${movieId}`
    : '';

  const handleShare = async () => {
    // Try Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: movieTitle,
          text: `Check out ${movieTitle} on IMDB`,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          handleCopy();
        }
      }
    } else {
      // Fallback to copy
      setShowMenu(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleShare}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
        aria-label="Share movie"
      >
        <Share2 className="w-5 h-5" />
        <span>Share</span>
      </motion.button>

      {/* Copy Menu (fallback) */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 bg-[#1a1a1a] border border-white/20 rounded-lg p-4 shadow-xl z-10 min-w-[250px]"
          >
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-white/10 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
