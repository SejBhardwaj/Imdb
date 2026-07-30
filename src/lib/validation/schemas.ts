import { z } from 'zod';

/**
 * Zod schemas for runtime validation of server responses
 * Ensures type safety and catches API contract changes
 */

// Watchlist item schema
export const WatchlistItemSchema = z.object({
  movieId: z.number().int().positive(),
  addedAt: z.number().int().positive(),
  lastModified: z.number().int().positive(),
  deviceId: z.string().min(1),
});

export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;

// Watchlist response schema (from server)
export const WatchlistResponseSchema = z.object({
  userId: z.string().min(1),
  movieIds: z.array(z.number().int().positive()),
  items: z.array(WatchlistItemSchema).optional(),
  lastSynced: z.number().int().positive().optional(),
});

export type WatchlistResponse = z.infer<typeof WatchlistResponseSchema>;

// Add to watchlist request
export const AddToWatchlistSchema = z.object({
  movieId: z.number().int().positive(),
  timestamp: z.number().int().positive(),
  deviceId: z.string().min(1),
});

export type AddToWatchlistRequest = z.infer<typeof AddToWatchlistSchema>;

// Remove from watchlist request
export const RemoveFromWatchlistSchema = z.object({
  movieId: z.number().int().positive(),
  timestamp: z.number().int().positive(),
  deviceId: z.string().min(1),
});

export type RemoveFromWatchlistRequest = z.infer<typeof RemoveFromWatchlistSchema>;

// Sync operation schema
export const SyncOperationSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['add', 'remove']),
  movieId: z.number().int().positive(),
  timestamp: z.number().int().positive(),
  deviceId: z.string().min(1),
});

export type SyncOperation = z.infer<typeof SyncOperationSchema>;

// Batch sync request
export const BatchSyncRequestSchema = z.object({
  operations: z.array(SyncOperationSchema),
  deviceId: z.string().min(1),
});

export type BatchSyncRequest = z.infer<typeof BatchSyncRequestSchema>;

// Batch sync response
export const BatchSyncResponseSchema = z.object({
  success: z.boolean(),
  processed: z.number().int().nonnegative(),
  failed: z.array(z.string().uuid()),
  conflicts: z.array(z.object({
    operationId: z.string().uuid(),
    reason: z.string(),
    serverTimestamp: z.number().int().positive(),
  })).optional(),
});

export type BatchSyncResponse = z.infer<typeof BatchSyncResponseSchema>;

// Movie metadata cache schema
export const MovieCacheSchema = z.object({
  movieId: z.number().int().positive(),
  title: z.string().min(1),
  posterPath: z.string().nullable(),
  releaseDate: z.string(),
  voteAverage: z.number().min(0).max(10),
  cachedAt: z.number().int().positive(),
});

export type MovieCache = z.infer<typeof MovieCacheSchema>;

// Network status
export const NetworkStatusSchema = z.object({
  online: z.boolean(),
  effectiveType: z.enum(['slow-2g', '2g', '3g', '4g', 'unknown']).optional(),
  rtt: z.number().optional(),
  downlink: z.number().optional(),
});

export type NetworkStatus = z.infer<typeof NetworkStatusSchema>;

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Validation helper functions
 */

export function validateWatchlistResponse(data: unknown): WatchlistResponse {
  return WatchlistResponseSchema.parse(data);
}

export function validateBatchSyncRequest(data: unknown): BatchSyncRequest {
  return BatchSyncRequestSchema.parse(data);
}

export function validateBatchSyncResponse(data: unknown): BatchSyncResponse {
  return BatchSyncResponseSchema.parse(data);
}

export function validateMovieCache(data: unknown): MovieCache {
  return MovieCacheSchema.parse(data);
}

/**
 * Safe validation (returns null on error instead of throwing)
 */

export function safeValidateWatchlistResponse(data: unknown): WatchlistResponse | null {
  const result = WatchlistResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeValidateBatchSyncResponse(data: unknown): BatchSyncResponse | null {
  const result = BatchSyncResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}
