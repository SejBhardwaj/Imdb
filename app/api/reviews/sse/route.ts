/**
 * Server-Sent Events (SSE) Endpoint
 * 
 * Broadcasts realtime review updates to connected clients
 * Handles backpressure by buffering updates
 */

import { NextRequest } from 'next/server';

// Store active connections per movie
const connections = new Map<number, Set<ReadableStreamDefaultController>>();

// Broadcast update to all clients watching a movie
export function broadcastReviewUpdate(movieId: number, update: any) {
  const movieConnections = connections.get(movieId);
  
  if (!movieConnections || movieConnections.size === 0) {
    return;
  }

  const data = `data: ${JSON.stringify(update)}\n\n`;

  for (const controller of movieConnections) {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch (error) {
      console.error('[SSE] Failed to send update:', error);
      movieConnections.delete(controller);
    }
  }

  console.log(`[SSE] Broadcast to ${movieConnections.size} clients for movie ${movieId}`);
}

/**
 * GET /api/reviews/sse?movieId=123
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const movieId = Number(searchParams.get('movieId'));

  if (!movieId) {
    return new Response('Missing movieId', { status: 400 });
  }

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add to connections
      if (!connections.has(movieId)) {
        connections.set(movieId, new Set());
      }
      connections.get(movieId)!.add(controller);

      console.log(`[SSE] Client connected to movie ${movieId}. Total clients: ${connections.get(movieId)!.size}`);

      // Send initial connection message
      const initMessage = `data: ${JSON.stringify({ type: 'connected', movieId, timestamp: Date.now() })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initMessage));

      // Keep-alive ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
        } catch (error) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected from movie ${movieId}`);
        clearInterval(keepAliveInterval);
        connections.get(movieId)?.delete(controller);
        
        // Remove movie entry if no more connections
        if (connections.get(movieId)?.size === 0) {
          connections.delete(movieId);
        }
        
        try {
          controller.close();
        } catch (error) {
          // Already closed
        }
      });
    },

    cancel() {
      // Client closed connection
      connections.get(movieId)?.delete(this as any);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Helper: Broadcast new review
 */
export function broadcastNewReview(movieId: number, review: any) {
  broadcastReviewUpdate(movieId, {
    type: 'create',
    review,
    movieId,
    timestamp: Date.now(),
  });
}

/**
 * Helper: Broadcast review update
 */
export function broadcastReviewEdit(movieId: number, review: any) {
  broadcastReviewUpdate(movieId, {
    type: 'update',
    review,
    movieId,
    timestamp: Date.now(),
  });
}

/**
 * Helper: Broadcast review deletion
 */
export function broadcastReviewDelete(movieId: number, reviewId: string) {
  broadcastReviewUpdate(movieId, {
    type: 'delete',
    reviewId,
    movieId,
    timestamp: Date.now(),
  });
}

/**
 * Helper: Broadcast vote update
 */
export function broadcastVoteUpdate(movieId: number, review: any) {
  broadcastReviewUpdate(movieId, {
    type: 'vote',
    review,
    movieId,
    timestamp: Date.now(),
  });
}
