/**
 * Reviews API Route
 * 
 * POST /api/reviews - Create review (with idempotency + rate limiting)
 * GET /api/reviews?movieId=123 - Get reviews
 */

import { NextRequest, NextResponse } from 'next/server';
import { createReviewSchema, reviewQuerySchema } from '@/lib/validation/reviewSchemas';
import { v4 as uuidv4 } from 'uuid';
import { createIdempotencyMiddleware } from '@/lib/middleware/idempotency';
import { createRateLimitMiddleware, RateLimitOperation } from '@/lib/middleware/rateLimiter';

// Create middleware
const idempotencyMiddleware = createIdempotencyMiddleware({
  headerName: 'Idempotency-Key',
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
});

const createReviewRateLimiter = createRateLimitMiddleware(RateLimitOperation.CREATE_REVIEW);
const viewReviewsRateLimiter = createRateLimitMiddleware(RateLimitOperation.VIEW_REVIEWS);

/**
 * POST - Create review
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting first
  return createReviewRateLimiter(request, async (req) => {
    // Then apply idempotency
    return idempotencyMiddleware(req, async (idempotentReq) => {
      try {
        // Parse and validate
        const body = await idempotentReq.json();
        const validated = createReviewSchema.parse(body);

        // Mock auth (replace with real auth)
        const userId = idempotentReq.headers.get('x-user-id') || 'user-1';
        const displayName = idempotentReq.headers.get('x-user-name') || 'Anonymous';

        // Get idempotency key from header
        const idempotencyKey = idempotentReq.headers.get('Idempotency-Key') || validated.idempotencyKey;

        // Mock review creation (replace with Firestore)
        const review = {
          id: uuidv4(),
          ...validated,
          userId,
          author: {
            uid: userId,
            displayName,
          },
          status: 'published',
          votes: { upvotes: 0, downvotes: 0, wilsonScore: 0 },
          moderation: { flagCount: 0, isFlagged: false },
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            publishedAt: Date.now(),
            editCount: 0,
            wordCount: validated.content.split(/\s+/).length,
          },
          idempotencyKey,
        };

        console.log('[API] Review created:', review.id, 'Idempotency:', idempotencyKey);

        return NextResponse.json(review);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return NextResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          );
        }

        console.error('[API] Error creating review:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    });
  });
}

/**
 * GET - Get reviews
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  return viewReviewsRateLimiter(request, async (req) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const query = {
        movieId: Number(searchParams.get('movieId')),
        sort: (searchParams.get('sort') as any) || 'helpful',
        page: Number(searchParams.get('page')) || 1,
        pageSize: Number(searchParams.get('pageSize')) || 20,
      };

      const validated = reviewQuerySchema.parse(query);

      // Mock reviews (replace with Firestore query)
      const mockReviews = [];

      return NextResponse.json({
        reviews: mockReviews,
        pagination: {
          total: 0,
          page: validated.page,
          pageSize: validated.pageSize,
          hasMore: false,
        },
        sort: validated.sort,
      });
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
  });
}
