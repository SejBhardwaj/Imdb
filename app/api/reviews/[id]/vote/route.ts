/**
 * Review Vote API Route
 * 
 * POST /api/reviews/[id]/vote - Vote on review
 */

import { NextRequest, NextResponse } from 'next/server';
import { voteReviewSchema } from '@/lib/validation/reviewSchemas';
import { calculateWilsonScore } from '@/lib/utils/wilsonScore';
import { broadcastVoteUpdate } from '../../sse/route';

// Idempotency store (use Redis in production)
const processedVotes = new Map<string, { timestamp: number; result: any }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST - Vote on review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = voteReviewSchema.parse({
      ...body,
      reviewId: params.id,
    });

    // Mock auth
    const userId = request.headers.get('x-user-id') || 'user-1';

    // Check idempotency
    const idempotencyKey = validated.idempotencyKey;
    if (processedVotes.has(idempotencyKey)) {
      const cached = processedVotes.get(idempotencyKey)!;
      
      // Return cached result if within TTL
      if (Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
        console.log('[Vote API] Returning cached result for idempotency key:', idempotencyKey);
        return NextResponse.json(cached.result);
      } else {
        processedVotes.delete(idempotencyKey);
      }
    }

    // TODO: Get review from Firestore
    // For now, mock the vote update
    const mockReview = {
      id: params.id,
      votes: {
        upvotes: 10,
        downvotes: 2,
        wilsonScore: 0,
      },
    };

    // Update votes based on vote type
    if (validated.voteType === 'upvote') {
      mockReview.votes.upvotes++;
    } else if (validated.voteType === 'downvote') {
      mockReview.votes.downvotes++;
    }

    // Recalculate Wilson score
    mockReview.votes.wilsonScore = calculateWilsonScore({
      upvotes: mockReview.votes.upvotes,
      downvotes: mockReview.votes.downvotes,
    });

    // TODO: Update in Firestore
    // TODO: Update user vote record

    // Cache result for idempotency
    processedVotes.set(idempotencyKey, {
      timestamp: Date.now(),
      result: mockReview,
    });

    // Broadcast vote update via SSE
    const movieId = 0; // Get from database
    broadcastVoteUpdate(movieId, mockReview);

    return NextResponse.json(mockReview);
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
 * Cleanup expired idempotency keys (run periodically)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of processedVotes.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      processedVotes.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean every hour
