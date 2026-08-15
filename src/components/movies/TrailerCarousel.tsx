'use client';

/**
 * Trailer Carousel - Client Island with Framer Motion
 * 
 * Features:
 * - Autoplay (3 seconds)
 * - Swipe gestures
 * - Inertial dragging
 * - Keyboard navigation (Arrow keys)
 * - Lazy loading
 * - Hover prefetch
 * - prefers-reduced-motion support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { prefetchVideo } from '@/lib/tmdb/prefetch';
import { getYouTubeThumbnail } from '@/lib/images/imageBuilder';

interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

interface TrailerCarouselProps {
  videos: Video[];
  movieId: number;
}

export default function TrailerCarousel({ videos, movieId }: TrailerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout>();

  const x = useMotionValue(0);
  const dragProgress = useTransform(x, [-200, 0, 200], [1, 0, -1]);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Autoplay logic
  useEffect(() => {
    if (!autoplay || isPlaying || prefersReducedMotion) return;

    autoplayTimerRef.current = setTimeout(() => {
      goToNext();
    }, 3000);

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
    };
  }, [currentIndex, autoplay, isPlaying, prefersReducedMotion]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  }, [videos.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  }, [videos.length]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    
    if (info.offset.x > threshold) {
      goToPrev();
    } else if (info.offset.x < -threshold) {
      goToNext();
    }
  }, [goToNext, goToPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          if (isPlaying) {
            setIsPlaying(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, isPlaying]);

  const handlePlay = useCallback((video: Video) => {
    setIsPlaying(true);
    setAutoplay(false);
  }, []);

  // Prefetch on hover
  const handleHover = useCallback((video: Video) => {
    if (video.site === 'YouTube') {
      const videoUrl = `https://www.youtube.com/watch?v=${video.key}`;
      prefetchVideo(videoUrl, { priority: 'high' }).catch(console.warn);
    }
  }, []);

  const currentVideo = videos[currentIndex];

  return (
    <div className="relative">
      {/* Carousel */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            drag={!isPlaying ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ x }}
            className="relative w-full h-full cursor-grab active:cursor-grabbing"
            onMouseEnter={() => handleHover(currentVideo)}
            onFocus={() => handleHover(currentVideo)}
            role="button"
            tabIndex={0}
            aria-label={`Play ${currentVideo.name}`}
          >
            {/* Thumbnail */}
            {currentVideo.site === 'YouTube' && (
              <div className="relative w-full h-full">
                <Image
                  src={getYouTubeThumbnail(currentVideo.key, 'maxresdefault')}
                  alt={currentVideo.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1280px"
                  quality={85}
                  priority={currentIndex === 0}
                />
              </div>
            )}

            {/* Play Button Overlay */}
            {!isPlaying && (
              <motion.button
                onClick={() => handlePlay(currentVideo)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors group"
                whileHover={{ scale: prefersReducedMotion ? 1 : 1.05 }}
                whileTap={{ scale: prefersReducedMotion ? 1 : 0.95 }}
                aria-label={`Play ${currentVideo.name}`}
              >
                <motion.div
                  className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center group-hover:bg-red-700 transition-colors"
                  whileHover={{ scale: prefersReducedMotion ? 1 : 1.1 }}
                >
                  <Play className="w-10 h-10 text-white fill-white ml-1" />
                </motion.div>
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {!isPlaying && videos.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center backdrop-blur-sm transition-colors z-10"
              aria-label="Previous video"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center backdrop-blur-sm transition-colors z-10"
              aria-label="Next video"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Indicators */}
        {!isPlaying && videos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-white'
                    : 'w-1.5 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to video ${index + 1}`}
                aria-current={index === currentIndex}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Title */}
      <div className="mt-4">
        <h3 className="font-semibold">{currentVideo.name}</h3>
        <p className="text-sm text-gray-400">
          {currentVideo.type} • {currentIndex + 1} of {videos.length}
        </p>
      </div>

      {/* Fullscreen Player Modal */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setIsPlaying(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Video player"
          >
            <button
              onClick={() => setIsPlaying(false)}
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close video"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-5xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              {currentVideo.site === 'YouTube' && (
                <iframe
                  src={`https://www.youtube.com/embed/${currentVideo.key}?autoplay=1&rel=0`}
                  title={currentVideo.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
