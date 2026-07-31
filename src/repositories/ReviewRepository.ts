// @ts-nocheck
/**
 * Review Repository - Complete Repository Pattern
 * 
 * Single source of truth for all review operations
 * UI components NEVER access storage/API directly
 * 
 * Responsibilities:
 * - CRUD operations
 * - Draft management
 * - Offline queue
 * - Vote handling
 * - Revision history
 * - Cache management
 * - Realtime subscriptions
 */

import { v4 as uuidv4 } from 'uuid';
import { getReviewsDB } from '@/lib/db/reviewsDB';
import { calculateWilsonScore } from '@/lib/utils/wilsonScore';
import { checkProfanity, shouldAutoReject, shouldAutoFlag } from '@/lib/utils/profanityFilter';
import { generateReviewDiff, countWords } from '@/lib/utils/diffEngine';
import type {
  Review,
  ReviewDraft,
  OfflineReviewAction,
  ReviewRevision,
  ReviewVote,
  RepositoryResult,
  CreateReviewRequest,
  UpdateReviewRequest,
  VoteType,
} from '@/types/review';

/**
 * Repository class
 */
class ReviewRepositoryClass {
  /**
   * ==========================================
   * DRAFT MANAGEMENT (Autosave)
   * ==========================================
   */

  /**
   * Save draft to IndexedDB
   */
  async saveDraft(draft: Omit<ReviewDraft, 'id' | 'savedAt'>): Promise<RepositoryResult<ReviewDraft>> {
    try {
      const db = await getReviewsDB();

      const draftId = `${draft.userId}-${draft.movieId}`;
      const savedDraft: ReviewDraft = {
        ...draft,
        id: draftId,
        savedAt: Date.now(),
      };

      await db.put('drafts', savedDraft);

      console.log('[Review Repo] Draft saved:', draftId);

      return { success: true, data: savedDraft };
    } catch (error) {
      console.error('[Review Repo] Failed to save draft:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Load draft from IndexedDB
   */
  async loadDraft(userId: string, movieId: number): Promise<RepositoryResult<ReviewDraft | null>> {
    try {
      const db = await getReviewsDB();
      const draftId = `${userId}-${movieId}`;

      const draft = await db.get('drafts', draftId);

      return { success: true, data: draft || null };
    } catch (error) {
      console.error('[Review Repo] Failed to load draft:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete draft
   */
  async deleteDraft(userId: string, movieId: number): Promise<RepositoryResult<void>> {
    try {
      const db = await getReviewsDB();
      const draftId = `${userId}-${movieId}`;

      await db.delete('drafts', draftId);

      console.log('[Review Repo] Draft deleted:', draftId);

      return { success: true };
    } catch (error) {
      console.error('[Review Repo] Failed to delete draft:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all drafts for user
   */
  async getUserDrafts(userId: string): Promise<RepositoryResult<ReviewDraft[]>> {
    try {
      const db = await getReviewsDB();
      const drafts = await db.getAllFromIndex('drafts', 'userId', userId);

      return { success: true, data: drafts };
    } catch (error) {
      console.error('[Review Repo] Failed to get user drafts:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * ==========================================
   * CREATE REVIEW (Optimistic)
   * ==========================================
   */

  /**
   * Create review with optimistic update
   */
  async createReview(
    request: CreateReviewRequest,
    user: { uid: string; displayName: string; photoURL?: string }
  ): Promise<RepositoryResult<Review>> {
    try {
      // Validate content
      const profanityCheck = checkProfanity(request.content);
      
      if (shouldAutoReject(request.content)) {
        return { 
          success: false, 
          error: 'Review contains inappropriate content and was rejected.' 
        };
      }

      // Generate optimistic review
      const optimisticReview: Review = {
        id: uuidv4(),
        movieId: request.movieId,
        userId: user.uid,
        author: {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
        rating: request.rating,
        title: request.title,
        content: request.content,
        status: 'published',
        votes: {
          upvotes: 0,
          downvotes: 0,
          wilsonScore: 0,
        },
        moderation: {
          flagCount: 0,
          isFlagged: shouldAutoFlag(request.content),
        },
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          publishedAt: Date.now(),
          editCount: 0,
          wordCount: countWords(request.content),
        },
        idempotencyKey: request.idempotencyKey,
      };

      // Save to cache immediately (optimistic)
      const db = await getReviewsDB();
      await db.put('reviewCache', {
        ...optimisticReview,
        cachedAt: Date.now(),
      });

      // Queue for background sync if offline
      if (!navigator.onLine) {
        await this.queueOfflineAction({
          type: 'create',
          movieId: request.movieId,
          userId: user.uid,
          payload: request,
          idempotencyKey: request.idempotencyKey,
        });
      }

      // Delete draft after successful creation
      await this.deleteDraft(user.uid, request.movieId);

      console.log('[Review Repo] Review created (optimistic):', optimisticReview.id);

      return { 
        success: true, 
        data: optimisticReview,
      };
    } catch (error) {
      console.error('[Review Repo] Failed to create review:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Merge server response with optimistic review
   */
  async mergeServerEcho(optimisticId: string, serverReview: Review): Promise<void> {
    try {
      const db = await getReviewsDB();

      // Delete optimistic version
      await db.delete('reviewCache', optimisticId);

      // Store server version
      await db.put('reviewCache', {
        ...serverReview,
        cachedAt: Date.now(),
      });

      console.log('[Review Repo] Server echo merged:', serverReview.id);
    } catch (error) {
      console.error('[Review Repo] Failed to merge server echo:', error);
    }
  }

  /**
   * ==========================================
   * UPDATE REVIEW
   * ==========================================
   */

  /**
   * Update review (with revision history)
   */
  async updateReview(
    request: UpdateReviewRequest,
    currentReview: Review
  ): Promise<RepositoryResult<Review>> {
    try {
      // Create revision before update
      await this.createRevision(currentReview);

      // Generate diff
      const diff = generateReviewDiff(
        {
          title: currentReview.title,
          content: currentReview.content,
          rating: currentReview.rating,
        },
        {
          title: request.title ?? currentReview.title,
          content: request.content ?? currentReview.content,
          rating: request.rating ?? currentReview.rating,
        }
      );

      // Update review
      const updatedReview: Review = {
        ...currentReview,
        title: request.title ?? currentReview.title,
        content: request.content ?? currentReview.content,
        rating: request.rating ?? currentReview.rating,
        metadata: {
          ...currentReview.metadata,
          updatedAt: Date.now(),
          editCount: currentReview.metadata.editCount + 1,
          wordCount: countWords(request.content ?? currentReview.content),
        },
      };

      // Update cache
      const db = await getReviewsDB();
      await db.put('reviewCache', {
        ...updatedReview,
        cachedAt: Date.now(),
      });

      console.log('[Review Repo] Review updated:', updatedReview.id);

      return { success: true, data: updatedReview };
    } catch (error) {
      console.error('[Review Repo] Failed to update review:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * ==========================================
   * DELETE REVIEW (Soft Delete)
   * ==========================================
   */

  /**
   * Soft delete review (can be undone within deadline)
   */
  async deleteReview(reviewId: string, userId: string): Promise<RepositoryResult<Review>> {
    try {
      const db = await getReviewsDB();

      // Get current review
      const cachedReview = await db.get('reviewCache', reviewId);
      if (!cachedReview) {
        return { success: false, error: 'Review not found' };
      }

      // Check ownership
      if (cachedReview.userId !== userId) {
        return { success: false, error: 'Not authorized to delete this review' };
      }

      const now = Date.now();
      const restoreDeadline = now + 5000; // 5 seconds to undo

      // Mark as deleted
      const deletedReview: Review = {
        ...cachedReview,
        status: 'deleted',
        metadata: {
          ...cachedReview.metadata,
          deletedAt: now,
          deletedBy: userId,
          restoreDeadline,
          updatedAt: now,
        },
      };

      // Update cache
      await db.put('reviewCache', {
        ...deletedReview,
        cachedAt: Date.now(),
      });

      console.log('[Review Repo] Review soft deleted:', reviewId, 'Deadline:', new Date(restoreDeadline).toISOString());

      // Return rollback function for undo
      const rollback = async () => {
        await this.restoreReview(reviewId);
      };

      return { 
        success: true, 
        data: deletedReview,
        rollback,
      };
    } catch (error) {
      console.error('[Review Repo] Failed to delete review:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Restore deleted review (undo delete)
   */
  async restoreReview(reviewId: string): Promise<RepositoryResult<Review>> {
    try {
      const db = await getReviewsDB();

      // Get deleted review
      const cachedReview = await db.get('reviewCache', reviewId);
      if (!cachedReview || cachedReview.status !== 'deleted') {
        return { success: false, error: 'Review not found or not deleted' };
      }

      // Check if deadline passed
      const now = Date.now();
      if (cachedReview.metadata.restoreDeadline && now > cachedReview.metadata.restoreDeadline) {
        return { 
          success: false, 
          error: 'Restore deadline has passed. Review cannot be recovered.' 
        };
      }

      // Restore
      const restoredReview: Review = {
        ...cachedReview,
        status: 'published',
        metadata: {
          ...cachedReview.metadata,
          deletedAt: undefined,
          deletedBy: undefined,
          restoreDeadline: undefined,
          updatedAt: now,
        },
      };

      // Update cache
      await db.put('reviewCache', {
        ...restoredReview,
        cachedAt: Date.now(),
      });

      console.log('[Review Repo] Review restored:', reviewId);

      return { success: true, data: restoredReview };
    } catch (error) {
      console.error('[Review Repo] Failed to restore review:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Permanently delete review (after deadline)
   */
  async permanentlyDeleteReview(reviewId: string): Promise<RepositoryResult<void>> {
    try {
      const db = await getReviewsDB();

      // Get review
      const cachedReview = await db.get('reviewCache', reviewId);
      if (!cachedReview) {
        return { success: false, error: 'Review not found' };
      }

      // Remove from cache
      await db.delete('reviewCache', reviewId);

      // Remove associated votes
      const votes = await db.getAllFromIndex('votes', 'reviewId', reviewId);
      for (const vote of votes) {
        await db.delete('votes', vote.id);
      }

      // Remove revisions
      const revisions = await db.getAllFromIndex('revisions', 'reviewId', reviewId);
      for (const revision of revisions) {
        await db.delete('revisions', revision.id);
      }

      console.log('[Review Repo] Review permanently deleted:', reviewId);

      return { success: true };
    } catch (error) {
      console.error('[Review Repo] Failed to permanently delete review:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * ==========================================
   * VOTE HANDLING
   * ==========================================
   */

  /**
   * Vote on review (with optimistic update)
   */
  async voteReview(
    reviewId: string,
    userId: string,
    voteType: VoteType,
    idempotencyKey: string
  ): Promise<RepositoryResult<Review>> {
    try {
      const db = await getReviewsDB();

      // Get current review
      const cachedReview = await db.get('reviewCache', reviewId);
      if (!cachedReview) {
        return { success: false, error: 'Review not found' };
      }

      // Get existing vote
      const voteId = `${userId}-${reviewId}`;
      const existingVote = await db.get('votes', voteId);

      let upvotes = cachedReview.votes.upvotes;
      let downvotes = cachedReview.votes.downvotes;

      // Remove old vote
      if (existingVote) {
        if (existingVote.voteType === 'upvote') {
          upvotes--;
        } else if (existingVote.voteType === 'downvote') {
          downvotes--;
        }
      }

      // Add new vote
      if (voteType === 'upvote') {
        upvotes++;
      } else if (voteType === 'downvote') {
        downvotes++;
      }

      // Recalculate Wilson score
      const wilsonScore = calculateWilsonScore({ upvotes, downvotes });

      // Update review
      const updatedReview: Review = {
        ...cachedReview,
        votes: {
          upvotes,
          downvotes,
          wilsonScore,
        },
      };

      // Update cache
      await db.put('reviewCache', {
        ...updatedReview,
        cachedAt: Date.now(),
      });

      // Store vote
      if (voteType) {
        const vote: ReviewVote = {
          id: voteId,
          reviewId,
          userId,
          voteType,
          createdAt: Date.now(),
        };
        await db.put('votes', vote);
      } else if (existingVote) {
        await db.delete('votes', voteId);
      }

      console.log('[Review Repo] Vote recorded:', reviewId, voteType);

      return { success: true, data: updatedReview };
    } catch (error) {
      console.error('[Review Repo] Failed to vote:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get user's vote on review
   */
  async getUserVote(userId: string, reviewId: string): Promise<VoteType> {
    try {
      const db = await getReviewsDB();
      const voteId = `${userId}-${reviewId}`;
      const vote = await db.get('votes', voteId);
      return vote?.voteType ?? null;
    } catch (error) {
      console.error('[Review Repo] Failed to get user vote:', error);
      return null;
    }
  }

  /**
   * ==========================================
   * REVISION HISTORY
   * ==========================================
   */

  /**
   * Create revision snapshot
   */
  async createRevision(review: Review): Promise<void> {
    try {
      const db = await getReviewsDB();

      // Get previous revision to calculate version
      const previousRevisions = await db.getAllFromIndex('revisions', 'reviewId', review.id);
      const version = previousRevisions.length + 1;

      const revision: ReviewRevision = {
        id: uuidv4(),
        reviewId: review.id,
        version,
        title: review.title,
        content: review.content,
        rating: review.rating,
        createdAt: Date.now(),
        createdBy: review.userId,
      };

      await db.put('revisions', revision);

      console.log('[Review Repo] Revision created:', revision.id, `v${version}`);
    } catch (error) {
      console.error('[Review Repo] Failed to create revision:', error);
    }
  }

  /**
   * Get revision history
   */
  async getRevisionHistory(reviewId: string): Promise<ReviewRevision[]> {
    try {
      const db = await getReviewsDB();
      const revisions = await db.getAllFromIndex('revisions', 'reviewId', reviewId);
      return revisions.sort((a, b) => b.version - a.version);
    } catch (error) {
      console.error('[Review Repo] Failed to get revision history:', error);
      return [];
    }
  }

  /**
   * ==========================================
   * OFFLINE QUEUE
   * ==========================================
   */

  /**
   * Queue action for offline sync
   */
  async queueOfflineAction(
    action: Omit<OfflineReviewAction, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<void> {
    try {
      const db = await getReviewsDB();

      const queuedAction: OfflineReviewAction = {
        ...action,
        id: uuidv4(),
        timestamp: Date.now(),
        retryCount: 0,
      };

      await db.put('offlineQueue', queuedAction);

      console.log('[Review Repo] Action queued for offline sync:', queuedAction.id);
    } catch (error) {
      console.error('[Review Repo] Failed to queue action:', error);
    }
  }

  /**
   * Get pending offline actions
   */
  async getPendingActions(): Promise<OfflineReviewAction[]> {
    try {
      const db = await getReviewsDB();
      return await db.getAll('offlineQueue');
    } catch (error) {
      console.error('[Review Repo] Failed to get pending actions:', error);
      return [];
    }
  }

  /**
   * Remove action from queue
   */
  async removeFromQueue(actionId: string): Promise<void> {
    try {
      const db = await getReviewsDB();
      await db.delete('offlineQueue', actionId);
      console.log('[Review Repo] Action removed from queue:', actionId);
    } catch (error) {
      console.error('[Review Repo] Failed to remove from queue:', error);
    }
  }

  /**
   * ==========================================
   * CACHE MANAGEMENT
   * ==========================================
   */

  /**
   * Get cached reviews for movie
   */
  async getCachedReviews(movieId: number): Promise<Review[]> {
    try {
      const db = await getReviewsDB();
      const cached = await db.getAllFromIndex('reviewCache', 'movieId', movieId);
      return cached.filter((review) => review.status !== 'deleted');
    } catch (error) {
      console.error('[Review Repo] Failed to get cached reviews:', error);
      return [];
    }
  }

  /**
   * Clear old cache entries
   */
  async clearOldCache(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await getReviewsDB();
      const cutoff = Date.now() - maxAgeMs;

      const allCached = await db.getAll('reviewCache');
      const toDelete = allCached.filter((review) => review.cachedAt < cutoff);

      for (const review of toDelete) {
        await db.delete('reviewCache', review.id);
      }

      console.log('[Review Repo] Cleared old cache:', toDelete.length, 'entries');
    } catch (error) {
      console.error('[Review Repo] Failed to clear old cache:', error);
    }
  }
}

// Export singleton instance
export const ReviewRepository = new ReviewRepositoryClass();

