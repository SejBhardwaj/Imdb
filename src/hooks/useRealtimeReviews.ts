/**
 * useRealtimeReviews Hook
 * 
 * WebSocket/SSE live updates with backpressure handling
 * Prevents UI freeze during high-volume update bursts
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Review, RealtimeReviewUpdate } from '@/types/review';
import { reviewKeys } from './useReviews';

interface UseRealtimeReviewsOptions {
  movieId: number;
  enabled?: boolean;
  bufferSize?: number;
  flushInterval?: number;
}

/**
 * Buffer for batching updates
 */
class UpdateBuffer {
  private buffer: RealtimeReviewUpdate[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  add(update: RealtimeReviewUpdate): void {
    this.buffer.push(update);
    
    // Enforce max size (drop oldest if exceeded)
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }
  }

  flush(): RealtimeReviewUpdate[] {
    const updates = [...this.buffer];
    this.buffer = [];
    return updates;
  }

  get size(): number {
    return this.buffer.length;
  }
}

/**
 * Realtime reviews hook with backpressure
 */
export function useRealtimeReviews({
  movieId,
  enabled = true,
  bufferSize = 50,
  flushInterval = 1000, // 1 second
}: UseRealtimeReviewsOptions) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const bufferRef = useRef(new UpdateBuffer(bufferSize));
  const flushTimerRef = useRef<NodeJS.Timeout>();

  /**
   * Process buffered updates
   */
  const processUpdates = () => {
    const updates = bufferRef.current.flush();
    
    if (updates.length === 0) return;

    console.log('[Realtime] Processing', updates.length, 'updates');

    // Group updates by type
    const creates = updates.filter((u) => u.type === 'create');
    const deletes = updates.filter((u) => u.type === 'delete');
    const votes = updates.filter((u) => u.type === 'vote');

    // Batch update cache
    queryClient.setQueryData<Review[]>(
      reviewKeys.list(movieId, 'helpful'),
      (old = []) => {
        let updated = [...old];

        // Process creates
        for (const update of creates) {
          if (update.review && !updated.find((r) => r.id === update.review!.id)) {
            updated.unshift(update.review);
          }
        }

        // Process deletes
        for (const update of deletes) {
          updated = updated.filter((r) => r.id !== update.reviewId);
        }

        // Process votes (update existing reviews)
        for (const update of votes) {
          if (update.review) {
            updated = updated.map((r) =>
              r.id === update.review!.id ? update.review! : r
            );
          }
        }

        return updated;
      }
    );

    setUpdateCount((prev) => prev + updates.length);
  };

  /**
   * Setup SSE connection
   */
  useEffect(() => {
    if (!enabled || !movieId) return;

    // Create SSE connection
    const eventSource = new EventSource(`/api/reviews/sse?movieId=${movieId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[Realtime] Connected to SSE');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: RealtimeReviewUpdate = JSON.parse(event.data);
        
        // Add to buffer (backpressure handling)
        bufferRef.current.add(update);
        
        console.log('[Realtime] Update buffered:', update.type, 'Buffer size:', bufferRef.current.size);
      } catch (error) {
        console.error('[Realtime] Failed to parse update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[Realtime] SSE error:', error);
      setIsConnected(false);
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          console.log('[Realtime] Reconnecting...');
          eventSource.close();
        }
      }, 5000);
    };

    // Setup flush timer (batch processing)
    flushTimerRef.current = setInterval(() => {
      processUpdates();
    }, flushInterval);

    // Cleanup
    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
      }
      
      // Process any remaining updates before disconnect
      processUpdates();
      
      eventSource.close();
      setIsConnected(false);
      console.log('[Realtime] Disconnected from SSE');
    };
  }, [movieId, enabled, flushInterval]);

  /**
   * Manual flush (force process)
   */
  const forceFlush = () => {
    processUpdates();
  };

  return {
    isConnected,
    updateCount,
    bufferSize: bufferRef.current.size,
    forceFlush,
  };
}

/**
 * Alternative: WebSocket implementation
 * (Commented out - use SSE for simpler one-way updates)
 */
/*
export function useRealtimeReviewsWebSocket({
  movieId,
  enabled = true,
}: {
  movieId: number;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !movieId) return;

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/reviews/ws?movieId=${movieId}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const update: RealtimeReviewUpdate = JSON.parse(event.data);
      
      // Process update immediately (or buffer like SSE)
      queryClient.invalidateQueries({ queryKey: reviewKeys.list(movieId, 'helpful') });
    };

    socket.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
    };

    socket.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    return () => {
      socket.close();
    };
  }, [movieId, enabled]);

  return { isConnected };
}
*/
