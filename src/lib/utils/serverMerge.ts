/**
 * Server Echo Merging Utilities
 * 
 * Deep merge server responses with optimistic state.
 * NEVER replace React components.
 * NEVER lose animation state.
 * NEVER lose scroll position.
 * NEVER flicker.
 * 
 * Maintains stable React keys and smooth transitions.
 */

import type { Review } from '@/types/review';

/**
 * Deep merge options
 */
interface MergeOptions {
  preserveOptimisticId?: boolean; // Keep client-generated ID temporarily
  preserveAnimationState?: boolean; // Maintain animation/transition state
  mergeStrategy?: 'server-wins' | 'client-wins' | 'smart'; // Default: smart
}

const DEFAULT_MERGE_OPTIONS: Required<MergeOptions> = {
  preserveOptimisticId: false,
  preserveAnimationState: true,
  mergeStrategy: 'smart',
};

/**
 * Fields that should ALWAYS come from server
 */
const SERVER_AUTHORITY_FIELDS: (keyof Review)[] = [
  'id', // Server-generated ID
  'metadata', // Timestamps, edit count
  'moderation', // Moderation status
  'votes', // Vote counts (server calculated)
];

/**
 * Fields that can be kept from client temporarily
 */
const CLIENT_TEMPORARY_FIELDS = [
  '_optimisticId', // Client ID for tracking
  '_animationKey', // Animation tracking
  '_scrollAnchor', // Scroll position tracking
];

/**
 * Deep merge server review with optimistic review
 * 
 * @param optimisticReview - Client-side optimistic review
 * @param serverReview - Server response
 * @param options - Merge options
 * @returns Merged review with stable React key
 */
export function mergeServerEcho(
  optimisticReview: Review & Record<string, any>,
  serverReview: Review,
  options: MergeOptions = {}
): Review & Record<string, any> {
  const opts = { ...DEFAULT_MERGE_OPTIONS, ...options };

  // Start with server data as base
  const merged: Review & Record<string, any> = { ...serverReview };

  // Preserve optimistic ID for React key stability
  if (opts.preserveOptimisticId && optimisticReview.id) {
    merged._optimisticId = optimisticReview.id;
    merged._migrationKey = `${optimisticReview.id}->${serverReview.id}`;
  }

  // Preserve animation state
  if (opts.preserveAnimationState) {
    CLIENT_TEMPORARY_FIELDS.forEach((field) => {
      if (optimisticReview[field] !== undefined) {
        merged[field] = optimisticReview[field];
      }
    });
  }

  // Smart merge strategy
  if (opts.mergeStrategy === 'smart') {
    // Server wins for authority fields
    SERVER_AUTHORITY_FIELDS.forEach((field) => {
      merged[field] = serverReview[field];
    });

    // Deep merge nested objects
    merged.author = deepMerge(optimisticReview.author, serverReview.author);
    merged.votes = deepMerge(optimisticReview.votes, serverReview.votes);
    merged.metadata = deepMerge(optimisticReview.metadata, serverReview.metadata);
    merged.moderation = deepMerge(optimisticReview.moderation, serverReview.moderation);
  }

  return merged;
}

/**
 * Deep merge two objects
 * Server values win on conflicts
 */
function deepMerge<T extends Record<string, any>>(client: T, server: T): T {
  const result = { ...server };

  // Add any client-only fields that aren't in server response
  for (const key in client) {
    if (!(key in server) && key.startsWith('_')) {
      // Preserve internal tracking fields
      result[key] = client[key];
    }
  }

  return result;
}

/**
 * Batch merge multiple reviews
 * Used for list updates
 */
export function batchMergeServerEcho(
  optimisticReviews: (Review & Record<string, any>)[],
  serverReviews: Review[],
  options: MergeOptions = {}
): (Review & Record<string, any>)[] {
  // Create lookup map for optimistic reviews
  const optimisticMap = new Map<string, Review & Record<string, any>>();
  
  optimisticReviews.forEach((review) => {
    // Try multiple keys: optimistic ID, idempotency key
    optimisticMap.set(review.id, review);
    if (review.idempotencyKey) {
      optimisticMap.set(review.idempotencyKey, review);
    }
  });

  // Merge server reviews with optimistic counterparts
  return serverReviews.map((serverReview) => {
    // Find matching optimistic review
    const optimisticReview = 
      optimisticMap.get(serverReview.id) ||
      optimisticMap.get(serverReview.idempotencyKey) ||
      null;

    if (optimisticReview) {
      return mergeServerEcho(optimisticReview, serverReview, options);
    }

    // No optimistic version, return server review as-is
    return serverReview;
  });
}

/**
 * Generate stable React key for merged review
 * Prevents component unmount/remount
 */
export function getStableReactKey(review: Review & Record<string, any>): string {
  // Use optimistic ID if available (during migration)
  if (review._optimisticId) {
    return review._optimisticId;
  }

  // Otherwise use server ID
  return review.id;
}

/**
 * Check if review is in migration state
 * (optimistic -> server ID transition)
 */
export function isInMigration(review: Review & Record<string, any>): boolean {
  return !!(review._optimisticId && review._migrationKey);
}

/**
 * Complete migration (cleanup temporary fields)
 * Call after transition animations complete
 */
export function completeMigration(
  review: Review & Record<string, any>
): Review {
  const cleaned = { ...review };

  // Remove temporary tracking fields
  CLIENT_TEMPORARY_FIELDS.forEach((field) => {
    delete cleaned[field];
  });

  delete cleaned._optimisticId;
  delete cleaned._migrationKey;

  return cleaned as Review;
}

/**
 * Merge vote updates without DOM replacement
 */
export function mergeVoteUpdate(
  currentReview: Review,
  voteUpdate: { upvotes: number; downvotes: number; wilsonScore: number }
): Review {
  return {
    ...currentReview,
    votes: {
      ...currentReview.votes,
      ...voteUpdate,
    },
    // Preserve React key and animation state
    _lastVoteUpdate: Date.now(),
  } as Review;
}

/**
 * Merge moderation updates
 */
export function mergeModerationUpdate(
  currentReview: Review,
  moderationUpdate: Partial<Review['moderation']>
): Review {
  return {
    ...currentReview,
    moderation: {
      ...currentReview.moderation,
      ...moderationUpdate,
    },
  };
}

/**
 * Merge metadata updates (timestamps, edit count)
 */
export function mergeMetadataUpdate(
  currentReview: Review,
  metadataUpdate: Partial<Review['metadata']>
): Review {
  return {
    ...currentReview,
    metadata: {
      ...currentReview.metadata,
      ...metadataUpdate,
    },
  };
}

/**
 * Smart diff - detect what actually changed
 * Used to minimize re-renders
 */
export function detectChanges(
  previous: Review,
  updated: Review
): {
  hasChanges: boolean;
  changedFields: string[];
  requiresRerender: boolean;
} {
  const changedFields: string[] = [];
  let requiresRerender = false;

  // Check top-level fields
  const topLevelFields: (keyof Review)[] = [
    'rating',
    'title',
    'content',
    'status',
  ];

  topLevelFields.forEach((field) => {
    if (previous[field] !== updated[field]) {
      changedFields.push(field);
      requiresRerender = true;
    }
  });

  // Check votes (only if counts changed)
  if (
    previous.votes.upvotes !== updated.votes.upvotes ||
    previous.votes.downvotes !== updated.votes.downvotes ||
    previous.votes.wilsonScore !== updated.votes.wilsonScore
  ) {
    changedFields.push('votes');
    // Vote changes don't require full rerender
  }

  // Check moderation
  if (
    previous.moderation.isFlagged !== updated.moderation.isFlagged ||
    previous.moderation.flagCount !== updated.moderation.flagCount
  ) {
    changedFields.push('moderation');
    requiresRerender = true;
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    requiresRerender,
  };
}

/**
 * Create transition metadata for smooth animations
 */
export function createTransitionMetadata(
  from: Review,
  to: Review
): {
  animationType: 'none' | 'fade' | 'slide' | 'morph';
  duration: number;
  preservePosition: boolean;
} {
  const changes = detectChanges(from, to);

  // No changes - no animation
  if (!changes.hasChanges) {
    return {
      animationType: 'none',
      duration: 0,
      preservePosition: true,
    };
  }

  // Vote-only changes - quick fade
  if (changes.changedFields.length === 1 && changes.changedFields[0] === 'votes') {
    return {
      animationType: 'fade',
      duration: 200,
      preservePosition: true,
    };
  }

  // Content changes - morph animation
  if (changes.changedFields.includes('content') || changes.changedFields.includes('title')) {
    return {
      animationType: 'morph',
      duration: 400,
      preservePosition: true,
    };
  }

  // Default - subtle fade
  return {
    animationType: 'fade',
    duration: 300,
    preservePosition: true,
  };
}

/**
 * Example usage in React components:
 * 
 * ```typescript
 * const [reviews, setReviews] = useState<Review[]>([]);
 * 
 * // When server response arrives
 * const handleServerResponse = (optimisticId: string, serverReview: Review) => {
 *   setReviews(prevReviews => 
 *     prevReviews.map(review => {
 *       if (review.id === optimisticId) {
 *         // Merge without replacing component
 *         return mergeServerEcho(review, serverReview, {
 *           preserveOptimisticId: true,
 *           preserveAnimationState: true,
 *         });
 *       }
 *       return review;
 *     })
 *   );
 * 
 *   // Schedule cleanup after animation
 *   setTimeout(() => {
 *     setReviews(prevReviews =>
 *       prevReviews.map(review =>
 *         review.id === optimisticId ? completeMigration(review) : review
 *       )
 *     );
 *   }, 500);
 * };
 * 
 * // React component
 * <AnimatePresence>
 *   {reviews.map(review => (
 *     <ReviewCard
 *       key={getStableReactKey(review)}  // Stable key prevents unmount
 *       review={review}
 *     />
 *   ))}
 * </AnimatePresence>
 * ```
 */
