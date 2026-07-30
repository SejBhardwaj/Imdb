/**
 * useReviewVote Hook
 * 
 * Vote handling with optimistic updates
 * Supports upvote, downvote, and removing votes
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReviewRepository } from '@/repositories/ReviewRepository';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { Review, VoteType } from '@/types/review';
import { reviewKeys } from './useReviews';

interface VoteReviewParams {
  reviewId: string;
  userId: string;
  voteType: VoteType;
}

/**
 * Get user's vote on a review
 */
export function useUserVote(userId: string, reviewId: string) {
  return useQuery({
    queryKey: ['vote', userId, reviewId],
    queryFn: () => ReviewRepository.getUserVote(userId, reviewId),
    enabled: !!userId && !!reviewId,
    staleTime: Infinity, // Vote rarely changes except by user action
  });
}

/**
 * Vote on review with optimistic update
 */
export function useVoteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, userId, voteType }: VoteReviewParams) => {
      const idempotencyKey = uuidv4();

      // Optimistic update via repository
      const result = await ReviewRepository.voteReview(reviewId, userId, voteType, idempotencyKey);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to vote');
      }

      // Send to server
      try {
        const response = await fetch(`/api/reviews/${reviewId}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          body: JSON.stringify({
            reviewId,
            voteType,
            idempotencyKey,
          }),
        });

        if (!response.ok) {
          throw new Error('Server error');
        }

        const serverReview: Review = await response.json();
        return { optimisticReview: result.data, serverReview };
      } catch (error) {
        // If offline, queue for sync
        if (!navigator.onLine) {
          await ReviewRepository.queueOfflineAction({
            type: 'vote',
            movieId: result.data.movieId,
            userId,
            payload: { reviewId, voteType },
            idempotencyKey,
          });
        }

        return { optimisticReview: result.data, serverReview: null };
      }
    },

    onMutate: async ({ reviewId, userId, voteType }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['vote', userId, reviewId] });

      // Snapshot previous vote
      const previousVote = queryClient.getQueryData<VoteType>(['vote', userId, reviewId]);

      // Optimistically update vote
      queryClient.setQueryData<VoteType>(['vote', userId, reviewId], voteType);

      return { previousVote };
    },

    onSuccess: ({ optimisticReview, serverReview }, { reviewId, userId }) => {
      const review = serverReview || optimisticReview;

      // Update review in all lists
      queryClient.setQueriesData<Review[]>(
        { queryKey: reviewKeys.lists() },
        (old) => {
          if (!old) return old;
          return old.map((r) => (r.id === reviewId ? review : r));
        }
      );

      // Update vote cache
      queryClient.setQueryData(['vote', userId, reviewId], review.votes);

      // Invalidate to refetch with updated ranking
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },

    onError: (error, { reviewId, userId }, context) => {
      // Rollback vote on error
      if (context?.previousVote !== undefined) {
        queryClient.setQueryData(['vote', userId, reviewId], context.previousVote);
      }

      toast.error(`Failed to vote: ${error.message}`);
    },
  });
}

/**
 * Toggle vote (upvote/downvote/remove)
 */
export function useToggleVote() {
  const voteReview = useVoteReview();

  return {
    toggleVote: (params: VoteReviewParams) => {
      return voteReview.mutate(params);
    },
    isVoting: voteReview.isPending,
  };
}
