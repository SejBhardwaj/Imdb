/**
 * Review System Types
 * 
 * Complete type definitions for production-grade review platform
 */

import { Timestamp } from 'firebase/firestore';

// Review statuses
export type ReviewStatus = 'draft' | 'published' | 'deleted' | 'flagged' | 'moderated';

// Vote types
export type VoteType = 'upvote' | 'downvote' | null;

// Sort options
export type ReviewSortOption = 'helpful' | 'recent' | 'controversial';

// Review entity
export interface Review {
  id: string;
  movieId: number;
  userId: string;
  author: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  rating: number; // 1-10
  title: string;
  content: string;
  status: ReviewStatus;
  votes: {
    upvotes: number;
    downvotes: number;
    wilsonScore: number; // Calculated ranking score
  };
  moderation: {
    flagCount: number;
    isFlagged: boolean;
    moderatedAt?: number;
    moderatedBy?: string;
    moderationReason?: string;
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    deletedAt?: number;
    deletedBy?: string;
    restoreDeadline?: number; // Timestamp when auto-delete happens
    publishedAt?: number;
    editCount: number;
    wordCount: number;
  };
  idempotencyKey: string;
}

// Draft stored in IndexedDB
export interface ReviewDraft {
  id: string;
  movieId: number;
  userId: string;
  rating: number;
  title: string;
  content: string;
  savedAt: number;
  syncStatus: 'pending' | 'synced' | 'failed';
}

// Offline queue entry
export interface OfflineReviewAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'vote';
  movieId: number;
  userId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  idempotencyKey: string;
}

// Review revision for history
export interface ReviewRevision {
  id: string;
  reviewId: string;
  version: number;
  title: string;
  content: string;
  rating: number;
  diff?: {
    titleDiff?: string;
    contentDiff?: string;
    ratingChange?: [number, number];
  };
  createdAt: number;
  createdBy: string;
}

// User vote on review
export interface ReviewVote {
  id: string;
  reviewId: string;
  userId: string;
  voteType: VoteType;
  createdAt: number;
}

// Moderation flag
export interface ModerationFlag {
  id: string;
  reviewId: string;
  flaggedBy: string;
  reason: 'spam' | 'offensive' | 'inappropriate' | 'misleading' | 'other';
  description?: string;
  createdAt: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

// Realtime update message
export interface RealtimeReviewUpdate {
  type: 'create' | 'update' | 'delete' | 'vote';
  review?: Review;
  reviewId?: string;
  movieId: number;
  timestamp: number;
}

// API request/response types
export interface CreateReviewRequest {
  movieId: number;
  rating: number;
  title: string;
  content: string;
  idempotencyKey: string;
}

export interface UpdateReviewRequest {
  reviewId: string;
  rating?: number;
  title?: string;
  content?: string;
}

export interface VoteReviewRequest {
  reviewId: string;
  voteType: VoteType;
  idempotencyKey: string;
}

export interface FlagReviewRequest {
  reviewId: string;
  reason: string;
  description?: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  sort: ReviewSortOption;
}

// Repository result types
export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rollback?: () => Promise<void>;
}

// Wilson score parameters
export interface WilsonScoreParams {
  upvotes: number;
  downvotes: number;
  confidence?: number; // Default 0.95
}

// Review filter options
export interface ReviewFilterOptions {
  movieId: number;
  userId?: string;
  status?: ReviewStatus[];
  minRating?: number;
  maxRating?: number;
  sort?: ReviewSortOption;
  page?: number;
  pageSize?: number;
}

// Review stats
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    [rating: number]: number;
  };
  totalVotes: number;
}

// Profanity filter result
export interface ProfanityCheckResult {
  hasProfanity: boolean;
  filteredText: string;
  detectedWords: string[];
}

// Rate limit info
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}
