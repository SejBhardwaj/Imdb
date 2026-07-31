// @ts-nocheck
/**
 * useReviews Hook
 * 
 * React Query hook for complete review CRUD operations
 * Handles optimistic updates, caching, and synchronization
 */

import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { ReviewRepository } from '@/repositories/ReviewRepository';
import { toast } from 'sonner';
import type { Review, CreateReviewRequest, UpdateReviewRequest, ReviewFilterOptions } from '@/types/review';

/**
 * Query keys for cache management
 */
export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (movieId: number, sort: string) => [...reviewKeys.lists(), movieId, sort] as const,
  details: () => [...reviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...reviewKeys.details(), id] as const,
  drafts: () => [...reviewKeys.all, 'drafts'] as const,
  draft: (userId: string, movieId: number) => [...reviewKeys.drafts(), userId, movieId] as const,
  revisions: (reviewId: string) => [...reviewKeys.all, 'revisions', reviewId] as const,
};

/**
 * Fetch reviews for movie
 */
export function useMovieReviews(
  movieId: number,
  options?: UseQueryOptions<Review[]>
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: reviewKeys.list(movieId, 'helpful'),
    queryFn: async () => {
      // Try cache first
      const cached = await ReviewRepository.getCachedReviews(movieId);
      if (cached.length > 0) {
        return cached;
      }

      // Fetch from API
      const response = await fetch(`/api/reviews?movieId=${movieId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      return data.reviews as Review[];
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Create review mutation with optimistic update
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request,
      user,
    }: {
      request: CreateReviewRequest;
      user: { uid: string; displayName: string; photoURL?: string };
    }) => {
      // Create optimistic review via repository
      const result = await ReviewRepository.createReview(request, user);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create review');
      }

      const optimisticReview = result.data;

      // Send to server
      try {
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.uid,
            'X-User-Name': user.displayName,
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Server error');
        }

        const serverReview: Review = await response.json();

        // Merge server echo
        await ReviewRepository.mergeServerEcho(optimisticReview.id, serverReview);

        return { optimisticReview, serverReview };
      } catch (error) {
        // If offline or error, queue for background sync
        if (!navigator.onLine) {
          await ReviewRepository.queueOfflineAction({
            type: 'create',
            movieId: request.movieId,
            userId: user.uid,
            payload: request,
            idempotencyKey: request.idempotencyKey,
          });

          toast.info('Review will be published when online');
        }

        return { optimisticReview, serverReview: null };
      }
    },

    onMutate: async ({ request }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: reviewKeys.list(request.movieId, 'helpful') });

      // Snapshot previous value
      const previousReviews = queryClient.getQueryData<Review[]>(
        reviewKeys.list(request.movieId, 'helpful')
      );

      return { previousReviews };
    },

    onSuccess: ({ optimisticReview, serverReview }, { request }) => {
      // Update cache with new review
      queryClient.setQueryData<Review[]>(
        reviewKeys.list(request.movieId, 'helpful'),
        (old = []) => [serverReview || optimisticReview, ...old]
      );

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });

      toast.success('Review published successfully!');
    },

    onError: (error, { request }, context) => {
      // Rollback on error
      if (context?.previousReviews) {
        queryClient.setQueryData(
          reviewKeys.list(request.movieId, 'helpful'),
          context.previousReviews
        );
      }

      toast.error(`Failed to publish review: ${error.message}`);
    },
  });
}

/**
 * Update review mutation
 */
export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request,
      currentReview,
    }: {
      request: UpdateReviewRequest;
      currentReview: Review;
    }) => {
      const result = await ReviewRepository.updateReview(request, currentReview);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update review');
      }

      // Send to server
      const response = await fetch(`/api/reviews/${request.reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      return result.data;
    },

    onSuccess: (updatedReview, { currentReview }) => {
      // Update cache
      queryClient.setQueryData<Review[]>(
        reviewKeys.list(currentReview.movieId, 'helpful'),
        (old = []) => old.map((r) => (r.id === updatedReview.id ? updatedReview : r))
      );

      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(updatedReview.id) });

      toast.success('Review updated successfully!');
    },

    onError: (error) => {
      toast.error(`Failed to update review: ${error.message}`);
    },
  });
}

/**
 * Delete review mutation with undo
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const result = await ReviewRepository.deleteReview(reviewId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to delete review');
      }

      // Send to server
      await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      return { review: result.data, rollback: result.rollback };
    },

    onSuccess: ({ review, rollback }, reviewId) => {
      // Update cache
      queryClient.setQueryData<Review[]>(
        reviewKeys.list(review.movieId, 'helpful'),
        (old = []) => old.filter((r) => r.id !== reviewId)
      );

      // Show undo toast
      toast.success('Review deleted', {
        duration: 5000,
        action: rollback
          ? {
              label: 'Undo',
              onClick: async () => {
                await rollback();
                queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
                toast.info('Review restored');
              },
            }
          : undefined,
      });
    },

    onError: (error) => {
      toast.error(`Failed to delete review: ${error.message}`);
    },
  });
}

/**
 * Get revision history
 */
export function useRevisionHistory(reviewId: string) {
  return useQuery({
    queryKey: reviewKeys.revisions(reviewId),
    queryFn: () => ReviewRepository.getRevisionHistory(reviewId),
    enabled: !!reviewId,
  });
}
// @ts-nocheck

