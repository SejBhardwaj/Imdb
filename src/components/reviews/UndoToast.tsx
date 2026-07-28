/**
 * Undo Toast Component
 * 
 * Displays after review deletion with:
 * - Countdown timer (5 seconds)
 * - Undo button
 * - Auto-dismissal after deadline
 * - Accessibility announcements
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface UndoToastProps {
  message: string;
  duration?: number; // milliseconds
  onUndo: () => void;
  onExpire?: () => void;
  onDismiss?: () => void;
}

export function UndoToast({
  message,
  duration = 5000,
  onUndo,
  onExpire,
  onDismiss,
}: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start countdown
    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 100) {
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    // Auto-dismiss after duration
    timerRef.current = setTimeout(() => {
      handleExpire();
    }, duration);

    // Announce to screen readers
    announceToScreenReader(message);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [duration, message]);

  const handleUndo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setIsVisible(false);
    onUndo();
    announceToScreenReader('Review deletion undone');
  };

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setIsVisible(false);
    onDismiss?.();
  };

  const handleExpire = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setIsVisible(false);
    onExpire?.();
    announceToScreenReader('Review permanently deleted');
  };

  const progressPercent = (timeRemaining / duration) * 100;
  const secondsRemaining = Math.ceil(timeRemaining / 1000);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-4 right-4 z-50 w-full max-w-md"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-gray-800">
              <motion.div
                className="h-full bg-red-600"
                initial={{ width: '100%' }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Auto-deleting in {secondsRemaining} second{secondsRemaining !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={handleUndo}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  aria-label="Undo review deletion"
                >
                  <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
                  Undo
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Announce message to screen readers
 */
function announceToScreenReader(message: string) {
  // Create invisible live region
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.textContent = message;

  document.body.appendChild(liveRegion);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

/**
 * Hook for managing undo toast state
 */
export function useUndoToast() {
  const [toastState, setToastState] = useState<{
    isVisible: boolean;
    message: string;
    onUndo: () => void;
    onExpire: () => void;
  } | null>(null);

  const showUndoToast = (
    message: string,
    onUndo: () => void,
    onExpire: () => void
  ) => {
    setToastState({
      isVisible: true,
      message,
      onUndo,
      onExpire,
    });
  };

  const hideUndoToast = () => {
    setToastState(null);
  };

  return {
    toastState,
    showUndoToast,
    hideUndoToast,
  };
}

/**
 * Example usage:
 * 
 * ```typescript
 * const { toastState, showUndoToast, hideUndoToast } = useUndoToast();
 * 
 * const handleDelete = async () => {
 *   const result = await ReviewRepository.deleteReview(reviewId);
 * 
 *   if (result.success) {
 *     showUndoToast(
 *       'Review deleted',
 *       async () => {
 *         // Undo
 *         await result.rollback?.();
 *         hideUndoToast();
 *       },
 *       async () => {
 *         // Permanent delete
 *         await permanentlyDeleteReview(reviewId);
 *         hideUndoToast();
 *       }
 *     );
 *   }
 * };
 * 
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete Review</button>
 *     {toastState && (
 *       <UndoToast
 *         message={toastState.message}
 *         onUndo={toastState.onUndo}
 *         onExpire={toastState.onExpire}
 *         onDismiss={hideUndoToast}
 *       />
 *     )}
 *   </>
 * );
 * ```
 */
