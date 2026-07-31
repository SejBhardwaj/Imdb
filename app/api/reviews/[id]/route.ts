/**
 * Single Review API Routes
 * 
 * PATCH /api/reviews/[id] - Update review
 * DELETE /api/reviews/[id] - Delete review
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateReviewSchema, deleteReviewSchema } from '@/lib/validation/reviewSchemas';
import { broadcastReviewEdit, broadcastReviewDelete } from '../sse/route';

/**
 * PATCH - Update review
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = updateReviewSchema.parse({
      ...body,
      reviewId: params.id,
    });

    // Mock auth
    const userId = request.headers.get('x-user-id') || 'user-1';

    // TODO: Verify user owns this review

    // Mock update (replace with Firestore)
    const updatedReview = {
      id: params.id,
      ...validated,
      userId,
      metadata: {
        updatedAt: Date.now(),
        editCount: 1,
      },
    };

    // Broadcast update via SSE (if movieId is provided)
    if ('movieId' in validated && typeof validated.movieId === 'number') {
      broadcastReviewEdit(validated.movieId, updatedReview);
    }

    return NextResponse.json(updatedReview);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete review
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validated = deleteReviewSchema.parse({ reviewId: params.id });

    // Mock auth
    const userId = request.headers.get('x-user-id') || 'user-1';

    // TODO: Verify user owns this review

    // TODO: Soft delete in Firestore
    const movieId = 0; // Get from database

    // Broadcast deletion via SSE
    broadcastReviewDelete(movieId, params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
