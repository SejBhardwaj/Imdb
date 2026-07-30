/**
 * useAnnouncer Hook
 * 
 * React hook for screen reader announcements.
 * Manages live regions for accessible notifications.
 */

import { useEffect, useRef, useCallback } from 'react';
import { announce, announceAlert, LiveRegion } from '@/lib/utils/a11y';

interface AnnouncerOptions {
  priority?: 'polite' | 'assertive';
  delay?: number; // Delay before announcement (ms)
}

/**
 * Hook for managing announcements
 */
export function useAnnouncer() {
  const liveRegionRef = useRef<LiveRegion | null>(null);

  useEffect(() => {
    // Create live region on mount
    liveRegionRef.current = new LiveRegion('polite');

    return () => {
      // Cleanup on unmount
      liveRegionRef.current?.destroy();
    };
  }, []);

  const announcePolite = useCallback((message: string, delay = 0) => {
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.announce(message);
      } else {
        announce(message, 'polite');
      }
    }, delay);
  }, []);

  const announceAssertive = useCallback((message: string, delay = 0) => {
    setTimeout(() => {
      announceAlert(message);
    }, delay);
  }, []);

  return {
    announce: announcePolite,
    announceAlert: announceAssertive,
  };
}

/**
 * Hook for review-specific announcements
 */
export function useReviewAnnouncer() {
  const { announce, announceAlert } = useAnnouncer();

  const announceReviewCreated = useCallback(() => {
    announce('Review submitted successfully');
  }, [announce]);

  const announceReviewUpdated = useCallback(() => {
    announce('Review updated successfully');
  }, [announce]);

  const announceReviewDeleted = useCallback(() => {
    announce('Review deleted. You have 5 seconds to undo.');
  }, [announce]);

  const announceReviewRestored = useCallback(() => {
    announce('Review deletion cancelled');
  }, [announce]);

  const announceVoteAdded = useCallback((type: 'upvote' | 'downvote') => {
    announce(`${type === 'upvote' ? 'Helpful' : 'Not helpful'} vote recorded`);
  }, [announce]);

  const announceVoteRemoved = useCallback(() => {
    announce('Vote removed');
  }, [announce]);

  const announceSortChanged = useCallback((sortOption: string) => {
    announce(`Reviews sorted by ${sortOption}`);
  }, [announce]);

  const announceReviewsLoaded = useCallback((count: number) => {
    announce(`${count} review${count !== 1 ? 's' : ''} loaded`);
  }, [announce]);

  const announceError = useCallback((message: string) => {
    announceAlert(`Error: ${message}`);
  }, [announceAlert]);

  const announceRateLimited = useCallback((retryAfter: number) => {
    announceAlert(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
  }, [announceAlert]);

  return {
    announceReviewCreated,
    announceReviewUpdated,
    announceReviewDeleted,
    announceReviewRestored,
    announceVoteAdded,
    announceVoteRemoved,
    announceSortChanged,
    announceReviewsLoaded,
    announceError,
    announceRateLimited,
  };
}

/**
 * Hook for form accessibility
 */
export function useFormAnnouncer() {
  const { announce, announceAlert } = useAnnouncer();

  const announceValidationError = useCallback((fieldName: string, error: string) => {
    announceAlert(`${fieldName}: ${error}`);
  }, [announceAlert]);

  const announceFormSubmitting = useCallback(() => {
    announce('Submitting form...');
  }, [announce]);

  const announceFormSuccess = useCallback(() => {
    announce('Form submitted successfully');
  }, [announce]);

  const announceFormError = useCallback((message: string) => {
    announceAlert(`Form error: ${message}`);
  }, [announceAlert]);

  const announceFieldChanged = useCallback((fieldName: string, value: string) => {
    // Only announce for select/radio/checkbox, not text input (too verbose)
    announce(`${fieldName} changed to ${value}`);
  }, [announce]);

  const announceCharacterCount = useCallback((current: number, max: number) => {
    if (current > max * 0.9) {
      // Only announce when approaching limit
      const remaining = max - current;
      announce(`${remaining} characters remaining`);
    }
  }, [announce]);

  return {
    announceValidationError,
    announceFormSubmitting,
    announceFormSuccess,
    announceFormError,
    announceFieldChanged,
    announceCharacterCount,
  };
}

/**
 * Hook for navigation announcements
 */
export function useNavigationAnnouncer() {
  const { announce } = useAnnouncer();

  const announcePageChange = useCallback((pageName: string) => {
    announce(`Navigated to ${pageName}`);
  }, [announce]);

  const announceModalOpen = useCallback((modalName: string) => {
    announce(`${modalName} dialog opened`);
  }, [announce]);

  const announceModalClose = useCallback((modalName: string) => {
    announce(`${modalName} dialog closed`);
  }, [announce]);

  const announceTabChange = useCallback((tabName: string) => {
    announce(`${tabName} tab selected`);
  }, [announce]);

  return {
    announcePageChange,
    announceModalOpen,
    announceModalClose,
    announceTabChange,
  };
}

/**
 * Hook for loading states
 */
export function useLoadingAnnouncer() {
  const { announce } = useAnnouncer();
  const loadingRef = useRef(false);

  const announceLoadingStart = useCallback((message = 'Loading...') => {
    if (!loadingRef.current) {
      loadingRef.current = true;
      announce(message);
    }
  }, [announce]);

  const announceLoadingComplete = useCallback((message = 'Loading complete') => {
    if (loadingRef.current) {
      loadingRef.current = false;
      announce(message);
    }
  }, [announce]);

  return {
    announceLoadingStart,
    announceLoadingComplete,
    isLoading: loadingRef.current,
  };
}
