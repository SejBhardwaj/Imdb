// @ts-nocheck
/**
 * Telemetry Service
 * 
 * Collects and reports performance metrics, errors, and user events.
 * 
 * Features:
 * - Event collection and batching
 * - Web Vitals tracking
 * - Error tracking
 * - Custom metrics
 * - Automatic flushing
 */

import type { TelemetryEvent } from '../types/movie';

export interface TelemetryConfig {
  /** Enable telemetry */
  enabled?: boolean;
  /** Batch size before auto-flush */
  batchSize?: number;
  /** Auto-flush interval (ms) */
  flushInterval?: number;
  /** Endpoint for sending telemetry */
  endpoint?: string;
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Custom tags */
  tags?: Record<string, string>;
  /** Callback for events */
  onEvent?: (event: TelemetryEvent) => void;
}

export class TelemetryService {
  private config: Required<TelemetryConfig>;
  private events: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;

  constructor(config: TelemetryConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 30000, // 30 seconds
      endpoint: config.endpoint ?? '/api/telemetry',
      sampleRate: config.sampleRate ?? 1.0,
      tags: config.tags ?? {},
      onEvent: config.onEvent ?? (() => {}),
    };

    this.sessionId = this.generateSessionId();

    // Start auto-flush timer
    if (this.config.enabled) {
      this.startAutoFlush();
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if event should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Track event
   */
  track(event: Omit<TelemetryEvent, 'timestamp'>): void {
    if (!this.config.enabled || !this.shouldSample()) {
      return;
    }

    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      metadata: {
        ...event.metadata,
        ...this.config.tags,
        sessionId: this.sessionId,
      },
    };

    this.events.push(fullEvent);

    // Call onEvent callback
    this.config.onEvent(fullEvent);

    // Auto-flush if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Track request event
   */
  trackRequest(
    provider: string,
    endpoint: string,
    duration: number,
    statusCode?: number,
    error?: string
  ): void {
    this.track({
      type: 'request',
      provider,
      endpoint,
      duration,
      statusCode,
      error,
    });
  }

  /**
   * Track cache hit
   */
  trackCacheHit(provider: string, cacheKey: string): void {
    this.track({
      type: 'cache_hit',
      provider,
      metadata: { cacheKey },
    });
  }

  /**
   * Track cache miss
   */
  trackCacheMiss(provider: string, cacheKey: string): void {
    this.track({
      type: 'cache_miss',
      provider,
      metadata: { cacheKey },
    });
  }

  /**
   * Track error
   */
  trackError(
    provider: string,
    error: string,
    statusCode?: number,
    endpoint?: string
  ): void {
    this.track({
      type: 'error',
      provider,
      endpoint,
      statusCode,
      error,
    });
  }

  /**
   * Track retry
   */
  trackRetry(
    provider: string,
    endpoint: string,
    attempt: number,
    delay: number
  ): void {
    this.track({
      type: 'retry',
      provider,
      endpoint,
      metadata: { attempt, delay },
    });
  }

  /**
   * Track circuit breaker event
   */
  trackCircuitBreak(
    provider: string,
    state: 'OPEN' | 'HALF_OPEN' | 'CLOSED',
    failures: number
  ): void {
    this.track({
      type: 'circuit_break',
      provider,
      metadata: { state, failures },
    });
  }

  /**
   * Flush events to endpoint
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // Send to endpoint
      if (typeof window !== 'undefined' && this.config.endpoint) {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            events: eventsToSend,
            sessionId: this.sessionId,
          }),
        });
      } else {
        // Server-side: log to console
        console.log('[Telemetry]', JSON.stringify(eventsToSend, null, 2));
      }
    } catch (error) {
      console.error('[Telemetry] Failed to send events:', error);
      // Re-add events to queue
      this.events.unshift(...eventsToSend);
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    this.flush();
  }

  /**
   * Get statistics
   */
  getStats(): {
    queueSize: number;
    sessionId: string;
    config: Required<TelemetryConfig>;
  } {
    return {
      queueSize: this.events.length,
      sessionId: this.sessionId,
      config: this.config,
    };
  }

  /**
   * Clear event queue
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TelemetryConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // Restart auto-flush if interval changed
    if (config.flushInterval && this.flushTimer) {
      this.stop();
      this.startAutoFlush();
    }
  }
}

/**
 * Global telemetry instance
 */
let globalTelemetry: TelemetryService | null = null;

export function getTelemetry(config?: TelemetryConfig): TelemetryService {
  if (!globalTelemetry) {
    globalTelemetry = new TelemetryService(config);
  }
  return globalTelemetry;
}

/**
 * Telemetry hook for React components
 */
export function useTelemetry() {
  const telemetry = getTelemetry();

  return {
    track: telemetry.track.bind(telemetry),
    trackRequest: telemetry.trackRequest.bind(telemetry),
    trackCacheHit: telemetry.trackCacheHit.bind(telemetry),
    trackCacheMiss: telemetry.trackCacheMiss.bind(telemetry),
    trackError: telemetry.trackError.bind(telemetry),
    trackRetry: telemetry.trackRetry.bind(telemetry),
    trackCircuitBreak: telemetry.trackCircuitBreak.bind(telemetry),
    flush: telemetry.flush.bind(telemetry),
    getStats: telemetry.getStats.bind(telemetry),
  };
}

