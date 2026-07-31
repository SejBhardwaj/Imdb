/**
 * Distributed Request Tracing
 * 
 * Tracks end-to-end request flow with parent-child spans
 */

import type { RequestTrace } from '@/types/movie';

/**
 * Generate unique trace ID
 */
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique span ID
 */
export function generateSpanId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Trace context for current request
 */
class TraceContext {
  private currentTrace: RequestTrace | null = null;
  private traces: Map<string, RequestTrace> = new Map();

  /**
   * Start new trace
   */
  startTrace(operation: string, provider: string, metadata?: Record<string, unknown>): RequestTrace {
    const trace: RequestTrace = {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      operation,
      provider,
      startTime: Date.now(),
      success: false,
      metadata,
      children: [],
    };

    this.currentTrace = trace;
    this.traces.set(trace.traceId, trace);

    return trace;
  }

  /**
   * Start child span
   */
  startSpan(
    operation: string,
    provider: string,
    parentTrace?: RequestTrace,
    metadata?: Record<string, unknown>
  ): RequestTrace {
    const parent = parentTrace || this.currentTrace;

    const span: RequestTrace = {
      traceId: parent?.traceId || generateTraceId(),
      spanId: generateSpanId(),
      parentSpanId: parent?.spanId,
      operation,
      provider,
      startTime: Date.now(),
      success: false,
      metadata,
      children: [],
    };

    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(span);
    } else {
      this.traces.set(span.traceId, span);
    }

    return span;
  }

  /**
   * End trace/span
   */
  endTrace(trace: RequestTrace, success: boolean, error?: Error): void {
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.success = success;

    if (error) {
      trace.error = {
        code: error.name,
        message: error.message,
        retryable: false,
        provider: trace.provider,
        status: 0,
        timestamp: Date.now(),
      };
    }

    // Clear current trace if it matches
    if (this.currentTrace?.traceId === trace.traceId && this.currentTrace?.spanId === trace.spanId) {
      this.currentTrace = null;
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): RequestTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get all traces
   */
  getAllTraces(): RequestTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Clear old traces
   */
  clearOldTraces(maxAge: number = 300000): void {
    const cutoff = Date.now() - maxAge;

    for (const [traceId, trace] of this.traces) {
      if (trace.endTime && trace.endTime < cutoff) {
        this.traces.delete(traceId);
      }
    }
  }

  /**
   * Get current trace
   */
  getCurrentTrace(): RequestTrace | null {
    return this.currentTrace;
  }
}

/**
 * Global trace context
 */
export const traceContext = new TraceContext();

/**
 * Trace decorator for async functions
 */
export function traced(operation: string, provider: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const trace = traceContext.startSpan(operation, provider);

      try {
        const result = await originalMethod.apply(this, args);
        traceContext.endTrace(trace, true);
        return result;
      } catch (error) {
        traceContext.endTrace(trace, false, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Execute function with tracing
 */
export async function withTrace<T>(
  operation: string,
  provider: string,
  fn: (trace: RequestTrace) => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const trace = traceContext.startTrace(operation, provider, metadata);

  try {
    const result = await fn(trace);
    traceContext.endTrace(trace, true);
    return result;
  } catch (error) {
    traceContext.endTrace(trace, false, error as Error);
    throw error;
  }
}

/**
 * Execute function with child span
 */
export async function withSpan<T>(
  operation: string,
  provider: string,
  fn: (span: RequestTrace) => Promise<T>,
  parentTrace?: RequestTrace,
  metadata?: Record<string, unknown>
): Promise<T> {
  const span = traceContext.startSpan(operation, provider, parentTrace, metadata);

  try {
    const result = await fn(span);
    traceContext.endTrace(span, true);
    return result;
  } catch (error) {
    traceContext.endTrace(span, false, error as Error);
    throw error;
  }
}
