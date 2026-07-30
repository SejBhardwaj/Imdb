/**
 * Web Vitals Tracking
 * 
 * Tracks Core Web Vitals and other performance metrics.
 * 
 * Metrics:
 * - LCP (Largest Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - INP (Interaction to Next Paint)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 */

import { getTelemetry } from './TelemetryService';

export interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Rating thresholds for Web Vitals
 */
const THRESHOLDS = {
  LCP: {
    good: 2500,
    poor: 4000,
  },
  FCP: {
    good: 1800,
    poor: 3000,
  },
  CLS: {
    good: 0.1,
    poor: 0.25,
  },
  INP: {
    good: 200,
    poor: 500,
  },
  TTFB: {
    good: 800,
    poor: 1800,
  },
};

/**
 * Get rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report Web Vital to telemetry
 */
function reportWebVital(metric: WebVital): void {
  const telemetry = getTelemetry();

  telemetry.track({
    type: 'request', // Using request type for now
    provider: 'web-vitals',
    endpoint: metric.name,
    duration: metric.value,
    metadata: {
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    },
  });

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
    });
  }
}

/**
 * Initialize Web Vitals tracking
 * 
 * Must be called client-side
 */
export async function initWebVitals(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Dynamic import to avoid bundling in server
    const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import('web-vitals');

    // Track LCP
    onLCP((metric) => {
      reportWebVital({
        name: 'LCP',
        value: metric.value,
        rating: getRating('LCP', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Track CLS
    onCLS((metric) => {
      reportWebVital({
        name: 'CLS',
        value: metric.value,
        rating: getRating('CLS', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Track INP
    onINP((metric) => {
      reportWebVital({
        name: 'INP',
        value: metric.value,
        rating: getRating('INP', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Track FCP
    onFCP((metric) => {
      reportWebVital({
        name: 'FCP',
        value: metric.value,
        rating: getRating('FCP', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Track TTFB
    onTTFB((metric) => {
      reportWebVital({
        name: 'TTFB',
        value: metric.value,
        rating: getRating('TTFB', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });
  } catch (error) {
    console.error('[Web Vitals] Failed to initialize:', error);
  }
}

/**
 * Track custom performance metric
 */
export function trackPerformance(name: string, value: number, metadata?: Record<string, any>): void {
  const telemetry = getTelemetry();

  telemetry.track({
    type: 'request',
    provider: 'performance',
    endpoint: name,
    duration: value,
    metadata,
  });
}

/**
 * Measure execution time
 */
export async function measure<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    trackPerformance(name, duration, {
      ...metadata,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    trackPerformance(name, duration, {
      ...metadata,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Performance observer for long tasks
 */
export function observeLongTasks(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          // Long task threshold: 50ms
          trackPerformance('long-task', entry.duration, {
            name: entry.name,
            startTime: entry.startTime,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    console.error('[Performance Observer] Failed to observe long tasks:', error);
  }
}

/**
 * Track resource loading
 */
export function trackResourceTiming(): void {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return;
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  resources.forEach((resource) => {
    // Only track significant resources
    if (resource.duration > 100) {
      trackPerformance('resource-load', resource.duration, {
        name: resource.name,
        type: resource.initiatorType,
        size: resource.transferSize,
        cached: resource.transferSize === 0,
      });
    }
  });
}

/**
 * React component for Web Vitals tracking
 */
export function WebVitalsReporter() {
  if (typeof window !== 'undefined') {
    // Initialize on mount
    initWebVitals();

    // Observe long tasks
    observeLongTasks();

    // Track resource timing on load
    if (document.readyState === 'complete') {
      trackResourceTiming();
    } else {
      window.addEventListener('load', trackResourceTiming);
    }
  }

  return null;
}
