/**
 * Request Tracing
 * 
 * Distributed tracing for API requests and data layer operations.
 * 
 * Features:
 * - Request duration tracking
 * - Error traces
 * - Retry tracking
 * - Circuit breaker events
 * - Cache hit/miss tracking
 */

import { getTelemetry } from './TelemetryService';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  attributes: Record<string, any>;
}

export interface SpanOptions {
  name: string;
  attributes?: Record<string, any>;
  parentSpan?: TraceContext;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new trace context
 */
export function createTrace(name: string, attributes: Record<string, any> = {}): TraceContext {
  return {
    traceId: generateId(),
    spanId: generateId(),
    startTime: Date.now(),
    attributes: {
      name,
      ...attributes,
    },
  };
}

/**
 * Create a child span
 */
export function createSpan(options: SpanOptions): TraceContext {
  const parentSpan = options.parentSpan;

  return {
    traceId: parentSpan?.traceId || generateId(),
    spanId: generateId(),
    parentSpanId: parentSpan?.spanId,
    startTime: Date.now(),
    attributes: {
      name: options.name,
      ...options.attributes,
    },
  };
}

/**
 * End a trace/span and report telemetry
 */
export function endTrace(context: TraceContext, error?: Error): void {
  const duration = Date.now() - context.startTime;
  const telemetry = getTelemetry();

  telemetry.track({
    type: 'request',
    provider: 'tracing',
    endpoint: context.attributes.name,
    duration,
    statusCode: error ? 500 : 200,
    error: error?.message,
    metadata: {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      ...context.attributes,
    },
  });
}

/**
 * Trace decorator for async functions
 */
export function trace(name: string, attributes: Record<string, any> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = createTrace(name, {
        ...attributes,
        method: propertyKey,
        class: target.constructor.name,
      });

      try {
        const result = await originalMethod.apply(this, args);
        endTrace(context);
        return result;
      } catch (error) {
        endTrace(context, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Trace a function execution
 */
export async function traceExecution<T>(
  name: string,
  fn: (context: TraceContext) => Promise<T>,
  attributes: Record<string, any> = {}
): Promise<T> {
  const context = createTrace(name, attributes);

  try {
    const result = await fn(context);
    endTrace(context);
    return result;
  } catch (error) {
    endTrace(context, error as Error);
    throw error;
  }
}

/**
 * Track API request
 */
export function trackApiRequest(
  provider: string,
  endpoint: string,
  duration: number,
  options: {
    statusCode?: number;
    method?: string;
    cached?: boolean;
    retries?: number;
    error?: string;
  } = {}
): void {
  const telemetry = getTelemetry();

  telemetry.track({
    type: 'request',
    provider,
    endpoint,
    duration,
    statusCode: options.statusCode,
    error: options.error,
    metadata: {
      method: options.method || 'GET',
      cached: options.cached || false,
      retries: options.retries || 0,
    },
  });
}

/**
 * Track cache operation
 */
export function trackCacheOperation(
  operation: 'get' | 'set' | 'delete' | 'invalidate',
  key: string,
  hit: boolean,
  duration: number
): void {
  const telemetry = getTelemetry();

  telemetry.track({
    type: hit ? 'cache_hit' : 'cache_miss',
    provider: 'cache',
    endpoint: operation,
    duration,
    metadata: {
      key,
      operation,
    },
  });
}

/**
 * Track retry attempt
 */
export function trackRetryAttempt(
  provider: string,
  endpoint: string,
  attempt: number,
  delay: number,
  reason: string
): void {
  const telemetry = getTelemetry();

  telemetry.track({
    type: 'retry',
    provider,
    endpoint,
    metadata: {
      attempt,
      delay,
      reason,
    },
  });
}

/**
 * Track circuit breaker state change
 */
export function trackCircuitBreakerState(
  provider: string,
  oldState: string,
  newState: string,
  failures: number,
  successes: number
): void {
  const telemetry = getTelemetry();

  telemetry.track({
    type: 'circuit_break',
    provider,
    metadata: {
      oldState,
      newState,
      failures,
      successes,
      timestamp: Date.now(),
    },
  });
}

/**
 * Track rate limit event
 */
export function trackRateLimit(
  provider: string,
  endpoint: string,
  retryAfter: number,
  tokensAvailable: number
): void {
  const telemetry = getTelemetry();

  telemetry.track({
    type: 'error',
    provider,
    endpoint,
    statusCode: 429,
    error: 'Rate limit exceeded',
    metadata: {
      retryAfter,
      tokensAvailable,
    },
  });
}

/**
 * Track query performance
 */
export function trackQuery(
  queryKey: string,
  duration: number,
  options: {
    cached?: boolean;
    stale?: boolean;
    backgroundRefetch?: boolean;
    error?: string;
  } = {}
): void {
  const telemetry = getTelemetry();

  telemetry.track({
    type: options.error ? 'error' : 'request',
    provider: 'react-query',
    endpoint: queryKey,
    duration,
    error: options.error,
    metadata: {
      cached: options.cached,
      stale: options.stale,
      backgroundRefetch: options.backgroundRefetch,
    },
  });
}

/**
 * Tracing utilities for repository
 */
export class RepositoryTracer {
  constructor(private repositoryName: string) {}

  async traceMethod<T>(
    methodName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return traceExecution(
      `${this.repositoryName}.${methodName}`,
      async () => fn(),
      metadata
    );
  }

  trackCacheAccess(operation: string, key: string, hit: boolean, duration: number): void {
    trackCacheOperation(operation as any, key, hit, duration);
  }

  trackProviderCall(
    provider: string,
    method: string,
    duration: number,
    error?: Error
  ): void {
    trackApiRequest(provider, method, duration, {
      error: error?.message,
      statusCode: error ? 500 : 200,
    });
  }
}

/**
 * Create a repository tracer
 */
export function createRepositoryTracer(name: string): RepositoryTracer {
  return new RepositoryTracer(name);
}
