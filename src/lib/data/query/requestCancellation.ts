/**
 * Request Cancellation with AbortController
 * 
 * Cancels in-flight requests when they're no longer needed.
 * Essential for search (cancel old queries) and navigation.
 * 
 * Use Cases:
 * - Search: User types "avatar" → 5 requests → cancel first 4
 * - Navigation: User clicks movie → navigates away → cancel fetch
 * - Component unmount: Clean up pending requests
 */

/**
 * Request cancellation manager
 */
export class RequestCancellationManager {
  private controllers = new Map<string, AbortController>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Create or reuse AbortController for request key
   * Cancels previous request with same key
   */
  getController(key: string): AbortController {
    // Cancel existing request with same key
    this.cancel(key);

    // Create new controller
    const controller = new AbortController();
    this.controllers.set(key, controller);

    return controller;
  }

  /**
   * Cancel request by key
   */
  cancel(key: string, reason?: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort(reason || `Request cancelled: ${key}`);
      this.controllers.delete(key);
    }

    // Clear timeout if exists
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  /**
   * Cancel all requests matching pattern
   */
  cancelPattern(pattern: RegExp, reason?: string): void {
    for (const [key] of this.controllers) {
      if (pattern.test(key)) {
        this.cancel(key, reason);
      }
    }
  }

  /**
   * Cancel all requests
   */
  cancelAll(reason?: string): void {
    for (const [key] of this.controllers) {
      this.cancel(key, reason);
    }
  }

  /**
   * Set timeout for request
   */
  setTimeout(key: string, ms: number, callback: () => void): void {
    const timeout = setTimeout(() => {
      this.cancel(key, 'Request timeout');
      callback();
    }, ms);

    this.timeouts.set(key, timeout);
  }

  /**
   * Check if request is cancelled
   */
  isCancelled(key: string): boolean {
    const controller = this.controllers.get(key);
    return controller ? controller.signal.aborted : false;
  }

  /**
   * Get signal for request
   */
  getSignal(key: string): AbortSignal | undefined {
    return this.controllers.get(key)?.signal;
  }

  /**
   * Clean up completed request
   */
  cleanup(key: string): void {
    this.controllers.delete(key);
    
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      activeRequests: this.controllers.size,
      activeTimeouts: this.timeouts.size,
      keys: Array.from(this.controllers.keys()),
    };
  }
}

/**
 * Global cancellation manager instance
 */
export const requestCancellation = new RequestCancellationManager();

/**
 * React hook for request cancellation
 */
export function useCancellableRequest(key: string) {
  const controller = requestCancellation.getController(key);

  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    // @ts-ignore - React useEffect equivalent
    const cleanup = () => requestCancellation.cancel(key);
    return { controller, cleanup };
  }

  return { controller, cleanup: () => {} };
}

/**
 * Fetch wrapper with automatic cancellation
 */
export async function cancellableFetch<T>(
  key: string,
  url: string,
  options?: RequestInit
): Promise<T> {
  const controller = requestCancellation.getController(key);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    requestCancellation.cleanup(key);
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request cancelled: ${key}`);
    }
    requestCancellation.cleanup(key);
    throw error;
  }
}

/**
 * Axios wrapper with automatic cancellation
 */
export function createCancellableAxiosConfig(key: string) {
  const controller = requestCancellation.getController(key);

  return {
    signal: controller.signal,
    onError: (error: any) => {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log(`Request cancelled: ${key}`);
      }
      requestCancellation.cleanup(key);
    },
    onSuccess: () => {
      requestCancellation.cleanup(key);
    },
  };
}

/**
 * Debounced cancellation for search
 */
export class DebouncedCancellation {
  private timeoutId: NodeJS.Timeout | null = null;
  private keyPrefix: string;

  constructor(keyPrefix: string) {
    this.keyPrefix = keyPrefix;
  }

  /**
   * Execute function after debounce, cancelling previous
   */
  execute<T>(
    searchTerm: string,
    fn: (signal: AbortSignal) => Promise<T>,
    delayMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Cancel previous search
      const previousKey = `${this.keyPrefix}:${searchTerm}`;
      requestCancellation.cancelPattern(
        new RegExp(`^${this.keyPrefix}:`),
        'New search started'
      );

      // Clear previous timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      // Set new timeout
      this.timeoutId = setTimeout(async () => {
        const controller = requestCancellation.getController(previousKey);

        try {
          const result = await fn(controller.signal);
          requestCancellation.cleanup(previousKey);
          resolve(result);
        } catch (error: any) {
          if (error.name === 'AbortError' || error.message?.includes('cancelled')) {
            reject(new Error('Search cancelled'));
          } else {
            requestCancellation.cleanup(previousKey);
            reject(error);
          }
        }
      }, delayMs);
    });
  }

  /**
   * Cancel current debounced operation
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    requestCancellation.cancelPattern(new RegExp(`^${this.keyPrefix}:`));
  }
}

/**
 * Priority-based cancellation
 * Higher priority requests can cancel lower priority ones
 */
export enum RequestPriority {
  CRITICAL = 0,  // Hero content, above-the-fold
  HIGH = 1,      // Visible content
  MEDIUM = 2,    // Below-the-fold
  LOW = 3,       // Prefetch, analytics
  BACKGROUND = 4, // Non-urgent
}

export class PriorityRequestManager {
  private requests = new Map<string, { priority: RequestPriority; controller: AbortController }>();

  /**
   * Create request with priority
   */
  createRequest(key: string, priority: RequestPriority): AbortController {
    const existing = this.requests.get(key);

    // If existing request has higher or equal priority, keep it
    if (existing && existing.priority <= priority) {
      return existing.controller;
    }

    // Cancel existing lower priority request
    if (existing) {
      existing.controller.abort(`Superseded by higher priority request`);
    }

    // Create new request
    const controller = new AbortController();
    this.requests.set(key, { priority, controller });

    return controller;
  }

  /**
   * Cancel all requests with lower priority
   */
  cancelLowerPriority(threshold: RequestPriority): void {
    for (const [key, { priority, controller }] of this.requests) {
      if (priority > threshold) {
        controller.abort('Cancelled by higher priority request');
        this.requests.delete(key);
      }
    }
  }

  /**
   * Cleanup completed request
   */
  cleanup(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Get active request count by priority
   */
  getStats() {
    const byPriority: Record<RequestPriority, number> = {
      [RequestPriority.CRITICAL]: 0,
      [RequestPriority.HIGH]: 0,
      [RequestPriority.MEDIUM]: 0,
      [RequestPriority.LOW]: 0,
      [RequestPriority.BACKGROUND]: 0,
    };

    for (const { priority } of this.requests.values()) {
      byPriority[priority]++;
    }

    return {
      total: this.requests.size,
      byPriority,
    };
  }
}

/**
 * Global priority manager
 */
export const priorityRequests = new PriorityRequestManager();
