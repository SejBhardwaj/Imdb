/**
 * Review Restore API Route
 * 
 * POST /api/reviews/[id]/restore - Restore soft-deleted review
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitMiddleware, RateLimitOperation } from '@/lib/middleware/rateLimiter';

const restoreRateLimiter = createRateLimitMiddleware(RateLimitOperation.EDIT_REVIEW);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return restoreRateLimiter(request, async (req) => {
    try {
      const reviewId = params.id;

      // Mock auth (replace with real auth)
      const userId = req.headers.get('x-user-id') || 'user-1';

      // Mock: Get review from database
      // In production, query Firestore
      const review = {
        id: reviewId,
        userId: 'user-1', // Mock owner
        status: 'deleted',
        metadata: {
          deletedAt: Date.now() - 3000, // Deleted 3 seconds ago
          restoreDeadline: Date.now() + 2000, // 2 seconds remaining
        },
      };

      // Check if review exists
      if (!review) {
        return NextResponse.json(
          { error: 'Review not found' },
          { status: 404 }
        );
      }

      // Check if review is deleted
      if (review.status !== 'deleted') {
        return NextResponse.json(
          { error: 'Review is not deleted' },
          { status: 400 }
        );
      }

      // Check ownership
      if (review.userId !== userId) {
        return NextResponse.json(
          { error: 'Not authorized to restore this review' },
          { status: 403 }
        );
      }

      // Check if restore deadline passed
      if (
        review.metadata.restoreDeadline &&
        Date.now() > review.metadata.restoreDeadline
      ) {
        return NextResponse.json(
          {
            error: 'Restore deadline has passed',
            message: 'Review cannot be restored after the deadline',
          },
          { status: 410 } // Gone
        );
      }

      // Mock: Restore review in database
      const restoredReview = {
        ...review,
        status: 'published',
        metadata: {
          ...review.metadata,
          deletedAt: undefined,
          deletedBy: undefined,
          restoreDeadline: undefined,
          updatedAt: Date.now(),
        },
      };

      // In production:
      // await db.collection('reviews').doc(reviewId).update({
      //   status: 'published',
      //   'metadata.deletedAt': FieldValue.delete(),
      //   'metadata.deletedBy': FieldValue.delete(),
      //   'metadata.restoreDeadline': FieldValue.delete(),
      //   'metadata.updatedAt': FieldValue.serverTimestamp(),
      // });

      console.log('[API] Review restored:', reviewId);

      return NextResponse.json({
        success: true,
        review: restoredReview,
        message: 'Review restored successfully',
      });
    } catch (error: any) {
      console.error('[API] Error restoring review:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * GET - Check if review can be restored
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id;

    // Mock: Get review from database
    const review = {
      id: reviewId,
      status: 'deleted',
      metadata: {
        deletedAt: Date.now() - 3000,
        restoreDeadline: Date.now() + 2000,
      },
    };

    if (!review) {
      return NextResponse.json(
        { canRestore: false, reason: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.status !== 'deleted') {
      return NextResponse.json({
        canRestore: false,
        reason: 'Review is not deleted',
      });
    }

    const now = Date.now();
    const canRestore =
      !review.metadata.restoreDeadline ||
      now <= review.metadata.restoreDeadline;

    const timeRemaining = review.metadata.restoreDeadline
      ? Math.max(0, review.metadata.restoreDeadline - now)
      : 0;

    return NextResponse.json({
      canRestore,
      timeRemaining,
      deadline: review.metadata.restoreDeadline,
      reason: canRestore ? null : 'Restore deadline has passed',
    });
  } catch (error: any) {
    console.error('[API] Error checking restore status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
