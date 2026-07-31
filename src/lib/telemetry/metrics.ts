/**
 * Telemetry Metrics Collection
 * 
 * Tracks API requests, cache performance, errors, and latency
 */

import type { TelemetryEvent, PerformanceMetrics } from '@/types/movie';

class MetricsCollector {
  private events: TelemetryEvent[] = [];
  private maxEvents: number = 1000;
  private latencies: number[] = [];
  private maxLatencies: number = 500;

  // Counters
  private counters: Map<string, number> = new Map();

  /**
   * Record telemetry event
   */
  recordEvent(event: TelemetryEvent): void {
    this.events.push(event);

    // Track latency
    if (event.duration !== undefined) {
      this.latencies.push(event.duration);
      
      if (this.latencies.length > this.maxLatencies) {
        this.latencies.shift();
      }
    }

    // Increment counters
    this.incrementCounter(`${event.type}_total`);
    this.incrementCounter(`${event.provider}_${event.type}`);
    
    if (event.success) {
      this.incrementCounter(`${event.type}_success`);
    } else {
      this.incrementCounter(`${event.type}_error`);
    }

    // Trim events if needed
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Increment counter
   */
  private incrementCounter(key: string): void {
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  /**
   * Get counter value
   */
  getCounter(key: string): number {
    return this.counters.get(key) || 0;
  }

  /**
   * Get all events
   */
  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: TelemetryEvent['type']): TelemetryEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get events by provider
   */
  getEventsByProvider(provider: string): TelemetryEvent[] {
    return this.events.filter((e) => e.provider === provider);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const requestCount = this.getCounter('request_total');
    const errorCount = this.getCounter('request_error');
    const retryCount = this.getCounter('retry_total');
    
    const cacheHits = this.getCounter('cache_hit_total');
    const cacheMisses = this.getCounter('cache_miss_total');
    const cacheTotal = cacheHits + cacheMisses;
    const cacheHitRate = cacheTotal > 0 ? (cacheHits / cacheTotal) * 100 : 0;

    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    
    return {
      requestCount,
      errorCount,
      retryCount,
      cacheHitRate,
      averageLatency: this.calculateAverage(this.latencies),
      p50Latency: this.calculatePercentile(sortedLatencies, 50),
      p95Latency: this.calculatePercentile(sortedLatencies, 95),
      p99Latency: this.calculatePercentile(sortedLatencies, 99),
    };
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)] || 0;
  }

  /**
   * Get metrics by provider
   */
  getProviderMetrics(provider: string) {
    const events = this.getEventsByProvider(provider);
    const requests = events.filter((e) => e.type === 'request');
    const errors = requests.filter((e) => !e.success);
    const latencies = requests.filter((e) => e.duration).map((e) => e.duration!);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);

    return {
      provider,
      requestCount: requests.length,
      errorCount: errors.length,
      errorRate: requests.length > 0 ? (errors.length / requests.length) * 100 : 0,
      averageLatency: this.calculateAverage(latencies),
      p95Latency: this.calculatePercentile(sortedLatencies, 95),
      p99Latency: this.calculatePercentile(sortedLatencies, 99),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.events = [];
    this.latencies = [];
    this.counters.clear();
  }

  /**
   * Export metrics as JSON
   */
  export() {
    return {
      performance: this.getPerformanceMetrics(),
      events: this.events,
      counters: Object.fromEntries(this.counters),
      timestamp: Date.now(),
    };
  }
}

/**
 * Global metrics collector
 */
export const metricsCollector = new MetricsCollector();

/**
 * Record API request
 */
export function recordRequest(
  provider: string,
  operation: string,
  duration: number,
  success: boolean,
  traceId?: string,
  metadata?: Record<string, unknown>
): void {
  metricsCollector.recordEvent({
    type: 'request',
    provider,
    operation,
    duration,
    success,
    timestamp: Date.now(),
    traceId,
    metadata,
  });
}

/**
 * Record cache hit
 */
export function recordCacheHit(
  provider: string,
  operation: string,
  traceId?: string
): void {
  metricsCollector.recordEvent({
    type: 'cache_hit',
    provider,
    operation,
    success: true,
    timestamp: Date.now(),
    traceId,
  });
}

/**
 * Record cache miss
 */
export function recordCacheMiss(
  provider: string,
  operation: string,
  traceId?: string
): void {
  metricsCollector.recordEvent({
    type: 'cache_miss',
    provider,
    operation,
    success: true,
    timestamp: Date.now(),
    traceId,
  });
}

/**
 * Record error
 */
export function recordError(
  provider: string,
  operation: string,
  error: Error,
  traceId?: string
): void {
  metricsCollector.recordEvent({
    type: 'error',
    provider,
    operation,
    success: false,
    timestamp: Date.now(),
    traceId,
    metadata: {
      errorName: error.name,
      errorMessage: error.message,
    },
  });
}

/**
 * Record retry attempt
 */
export function recordRetry(
  provider: string,
  operation: string,
  attempt: number,
  traceId?: string
): void {
  metricsCollector.recordEvent({
    type: 'retry',
    provider,
    operation,
    success: true,
    timestamp: Date.now(),
    traceId,
    metadata: { attempt },
  });
}

/**
 * Record circuit breaker state change
 */
export function recordCircuitBreaker(
  provider: string,
  state: string,
  traceId?: string
): void {
  metricsCollector.recordEvent({
    type: 'circuit_breaker',
    provider,
    operation: `circuit_breaker_${state}`,
    success: true,
    timestamp: Date.now(),
    traceId,
    metadata: { state },
  });
}

/**
 * Record rate limit
 */
export function recordRateLimit(
  provider: string,
  operation: string,
  queueLength: number,
  traceId?: string
): void {
  metricsCollector.recordEvent({
    type: 'rate_limit',
    provider,
    operation,
    success: true,
    timestamp: Date.now(),
    traceId,
    metadata: { queueLength },
  });
}
