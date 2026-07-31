/**
 * Theme Sync SSE Endpoint
 * 
 * Server-Sent Events for real-time cross-device theme synchronization
 * Keeps all user devices in sync when theme changes
 */

import { NextRequest } from 'next/server';

// Store active connections per user
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * SSE endpoint for theme updates
 */
export async function GET(request: NextRequest) {
  // Get user ID from auth
  const userId = request.headers.get('x-user-id');
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add connection to user's set
      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }
      connections.get(userId)!.add(controller);

      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        userId,
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch (error) {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        connections.get(userId)?.delete(controller);
        if (connections.get(userId)?.size === 0) {
          connections.delete(userId);
        }
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Broadcast theme update to all user's connected devices
 */
export function broadcastThemeUpdate(
  userId: string,
  preferences: any,
  sourceDeviceId?: string
) {
  const userConnections = connections.get(userId);
  
  if (!userConnections || userConnections.size === 0) {
    return;
  }

  const message = `data: ${JSON.stringify({
    type: 'theme_update',
    userId,
    preferences,
    sourceDeviceId,
    timestamp: Date.now(),
  })}\n\n`;

  const encoded = new TextEncoder().encode(message);

  // Send to all connected devices except source
  for (const controller of userConnections) {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      // Connection closed, remove it
      userConnections.delete(controller);
    }
  }
}

// Make broadcaster globally available
if (typeof global !== 'undefined') {
  (global as any).themeUpdateBroadcaster = {
    send: broadcastThemeUpdate,
  };
}
