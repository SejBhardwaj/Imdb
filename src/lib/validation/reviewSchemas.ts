/**
 * Review Validation Schemas (Zod)
 * 
 * Client and server validation for all review operations
 */

import { z } from 'zod';

// Review rating (1-10)
export const ratingSchema = z
  .number()
  .int()
  .min(1, 'Rating must be at least 1')
  .max(10, 'Rating must be at most 10');

// Review title
export const titleSchema = z
  .string()
  .min(5, 'Title must be at least 5 characters')
  .max(100, 'Title must be at most 100 characters')
  .trim();

// Review content
export const contentSchema = z
  .string()
  .min(50, 'Review must be at least 50 characters')
  .max(5000, 'Review must be at most 5000 characters')
  .trim();

// Idempotency key
export const idempotencyKeySchema = z
  .string()
  .uuid('Invalid idempotency key format');

// Movie ID
export const movieIdSchema = z
  .number()
  .int()
  .positive('Invalid movie ID');

// Create review request
export const createReviewSchema = z.object({
  movieId: movieIdSchema,
  rating: ratingSchema,
  title: titleSchema,
  content: contentSchema,
  idempotencyKey: idempotencyKeySchema,
});

// Update review request
export const updateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  rating: ratingSchema.optional(),
  title: titleSchema.optional(),
  content: contentSchema.optional(),
}).refine(
  (data) => data.rating !== undefined || data.title !== undefined || data.content !== undefined,
  'At least one field must be provided for update'
);

// Vote review request
export const voteReviewSchema = z.object({
  reviewId: z.string().uuid(),
  voteType: z.enum(['upvote', 'downvote']).nullable(),
  idempotencyKey: idempotencyKeySchema,
});

// Delete review request
export const deleteReviewSchema = z.object({
  reviewId: z.string().uuid(),
});

// Restore review request
export const restoreReviewSchema = z.object({
  reviewId: z.string().uuid(),
});

// Flag review request
export const flagReviewSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(['spam', 'offensive', 'inappropriate', 'misleading', 'other']),
  description: z.string().max(500).optional(),
});

// Review query parameters
export const reviewQuerySchema = z.object({
  movieId: movieIdSchema,
  userId: z.string().optional(),
  status: z.array(z.enum(['draft', 'published', 'deleted', 'flagged', 'moderated'])).optional(),
  minRating: ratingSchema.optional(),
  maxRating: ratingSchema.optional(),
  sort: z.enum(['helpful', 'recent', 'controversial']).default('helpful'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(5).max(100).default(20),
});

// Draft schema
export const draftSchema = z.object({
  id: z.string().uuid(),
  movieId: movieIdSchema,
  userId: z.string(),
  rating: ratingSchema,
  title: titleSchema,
  content: contentSchema,
  savedAt: z.number(),
  syncStatus: z.enum(['pending', 'synced', 'failed']),
});

// Review response schema
export const reviewResponseSchema = z.object({
  id: z.string().uuid(),
  movieId: movieIdSchema,
  userId: z.string(),
  author: z.object({
    uid: z.string(),
    displayName: z.string(),
    photoURL: z.string().optional(),
  }),
  rating: ratingSchema,
  title: titleSchema,
  content: contentSchema,
  status: z.enum(['draft', 'published', 'deleted', 'flagged', 'moderated']),
  votes: z.object({
    upvotes: z.number().int().nonnegative(),
    downvotes: z.number().int().nonnegative(),
    wilsonScore: z.number(),
  }),
  moderation: z.object({
    flagCount: z.number().int().nonnegative(),
    isFlagged: z.boolean(),
    moderatedAt: z.number().optional(),
    moderatedBy: z.string().optional(),
    moderationReason: z.string().optional(),
  }),
  metadata: z.object({
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().optional(),
    publishedAt: z.number().optional(),
    editCount: z.number().int().nonnegative(),
    wordCount: z.number().int().nonnegative(),
  }),
  idempotencyKey: idempotencyKeySchema,
});

// Reviews list response
export const reviewsResponseSchema = z.object({
  reviews: z.array(reviewResponseSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    hasMore: z.boolean(),
  }),
  sort: z.enum(['helpful', 'recent', 'controversial']),
});

// Rate limit response
export const rateLimitResponseSchema = z.object({
  limit: z.number().int().positive(),
  remaining: z.number().int().nonnegative(),
  resetAt: z.number(),
  retryAfter: z.number().optional(),
});

// Error response
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

// Types inferred from schemas
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type VoteReviewInput = z.infer<typeof voteReviewSchema>;
export type FlagReviewInput = z.infer<typeof flagReviewSchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
export type ReviewDraftInput = z.infer<typeof draftSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ReviewsResponse = z.infer<typeof reviewsResponseSchema>;
export type RateLimitResponse = z.infer<typeof rateLimitResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
