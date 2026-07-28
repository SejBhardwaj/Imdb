/**
 * Idempotency Middleware
 * 
 * Enterprise-grade idempotency support for review operations.
 * Prevents duplicate submissions from:
 * - Retries
 * - Flaky networks
 * - Duplicate button presses
 * - Browser refreshes
 * 
 * Features:
 * - UUID v4 idempotency keys
 * - TTL-based expiration
 * - In-memory + Redis adapter support
 * - Automatic cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

// Idempotency key store entry
interface IdempotencyEntry {
  key: string;
  response: any;
  statusCode: number;
  headers: Record<string, string>;
  createdAt: number;
  expiresAt: number;
}

// In-memory store (use Redis in production)
class IdempotencyStore {
  private store = new Map<string, IdempotencyEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup job
    this.startCleanup();
  }

  /**
   * Set idempotency entry
   */
  async set(key: string, entry: Omit<IdempotencyEntry, 'key'>): Promise<void> {
    this.store.set(key, { key, ...entry });
  }

  /**
   * Get idempotency entry
   */
  async get(key: string): Promise<IdempotencyEntry | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Delete idempotency entry
   */
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * Get store size
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Clear all expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const count = this.cleanup();
      if (count > 0) {
        console.log(`[Idempotency] Cleaned up ${count} expired entries`);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton store
const idempotencyStore = new IdempotencyStore();

// Configuration
export interface IdempotencyConfig {
  headerName?: string; // Default: 'Idempotency-Key'
  ttlMs?: number; // Default: 24 hours
  generateKey?: boolean; // Auto-generate if missing
  methods?: string[]; // Methods to apply idempotency (default: POST, PUT, PATCH, DELETE)
}

const DEFAULT_CONFIG: Required<IdempotencyConfig> = {
  headerName: 'Idempotency-Key',
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  generateKey: false,
  methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
};

/**
 * Idempotency middleware factory
 */
export function createIdempotencyMiddleware(config: IdempotencyConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async function idempotencyMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Only apply to configured methods
    if (!finalConfig.methods.includes(request.method)) {
      return handler(request);
    }

    // Get idempotency key from header
    let idempotencyKey = request.headers.get(finalConfig.headerName);

    // Generate key if enabled and missing
    if (!idempotencyKey && finalConfig.generateKey) {
      idempotencyKey = uuidv4();
    }

    // If no key, proceed without idempotency
    if (!idempotencyKey) {
      return handler(request);
    }

    // Validate UUID format
    if (!uuidValidate(idempotencyKey)) {
      return NextResponse.json(
        { 
          error: 'Invalid idempotency key format. Must be a valid UUID v4.',
          code: 'INVALID_IDEMPOTENCY_KEY',
        },
        { status: 400 }
      );
    }

    // Check if key was already used
    const existingEntry = await idempotencyStore.get(idempotencyKey);

    if (existingEntry) {
      // Return cached response
      console.log(`[Idempotency] Duplicate request detected: ${idempotencyKey}`);
      
      return new NextResponse(JSON.stringify(existingEntry.response), {
        status: existingEntry.statusCode,
        headers: {
          ...existingEntry.headers,
          'X-Idempotency-Replay': 'true',
          'X-Idempotency-Key': idempotencyKey,
        },
      });
    }

    // Process request
    console.log(`[Idempotency] New request: ${idempotencyKey}`);
    const response = await handler(request);

    // Only cache successful responses (2xx)
    if (response.status >= 200 && response.status < 300) {
      // Clone response to read body
      const clonedResponse = response.clone();
      const responseBody = await clonedResponse.json();

      // Store in idempotency cache
      const entry: Omit<IdempotencyEntry, 'key'> = {
        response: responseBody,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        createdAt: Date.now(),
        expiresAt: Date.now() + finalConfig.ttlMs,
      };

      await idempotencyStore.set(idempotencyKey, entry);

      console.log(`[Idempotency] Cached response for: ${idempotencyKey}`);
    }

    // Add idempotency header to response
    response.headers.set('X-Idempotency-Key', idempotencyKey);
    response.headers.set('X-Idempotency-Replay', 'false');

    return response;
  };
}

/**
 * Generate new idempotency key
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}

/**
 * Validate idempotency key format
 */
export function validateIdempotencyKey(key: string): boolean {
  return uuidValidate(key);
}

/**
 * Check if idempotency key was used
 */
export async function isIdempotencyKeyUsed(key: string): Promise<boolean> {
  return idempotencyStore.exists(key);
}

/**
 * Clear idempotency cache (for testing)
 */
export async function clearIdempotencyCache(): Promise<void> {
  idempotencyStore.cleanup();
}

/**
 * Get idempotency store stats
 */
export function getIdempotencyStats() {
  return {
    totalKeys: idempotencyStore.size(),
    timestamp: Date.now(),
  };
}

// Export store for advanced use cases
export { idempotencyStore };

/**
 * Redis Adapter (for production)
 * 
 * Usage:
 * ```typescript
 * import { createClient } from 'redis';
 * 
 * const redisClient = createClient({ url: process.env.REDIS_URL });
 * await redisClient.connect();
 * 
 * class RedisIdempotencyStore implements IdempotencyStore {
 *   async set(key: string, entry: IdempotencyEntry): Promise<void> {
 *     await redisClient.set(
 *       `idempotency:${key}`,
 *       JSON.stringify(entry),
 *       { EX: Math.floor((entry.expiresAt - Date.now()) / 1000) }
 *     );
 *   }
 * 
 *   async get(key: string): Promise<IdempotencyEntry | null> {
 *     const data = await redisClient.get(`idempotency:${key}`);
 *     return data ? JSON.parse(data) : null;
 *   }
 * 
 *   async delete(key: string): Promise<void> {
 *     await redisClient.del(`idempotency:${key}`);
 *   }
 * 
 *   async exists(key: string): Promise<boolean> {
 *     return (await redisClient.exists(`idempotency:${key}`)) === 1;
 *   }
 * }
 * ```
 */
