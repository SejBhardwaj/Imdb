/**
 * Enterprise Circuit Breaker
 * 
 * Protects unhealthy providers from request overload
 */

import { CircuitBreakerOpenError, type CircuitBreakerConfig } from '@/types/movie';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Provider unhealthy, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes in half-open
  timeout: 60000, // 60 seconds before half-open
  halfOpenMaxAttempts: 3, // Max test requests in half-open
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  private config: CircuitBreakerConfig;
  private readonly name: string;

  // Callbacks
  private onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
  private onOpen?: () => void;
  private onClose?: () => void;
  private onHalfOpen?: () => void;

  constructor(
    name: string,
    config: Partial<CircuitBreakerConfig> = {},
    callbacks?: {
      onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
      onOpen?: () => void;
      onClose?: () => void;
      onHalfOpen?: () => void;
    }
  ) {
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
    
    if (callbacks) {
      this.onStateChange = callbacks.onStateChange;
      this.onOpen = callbacks.onOpen;
      this.onClose = callbacks.onClose;
      this.onHalfOpen = callbacks.onHalfOpen;
    }
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, traceId?: string): Promise<T> {
    // Check if circuit should transition to half-open
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    // Reject if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError(this.name, traceId);
    }

    // Reject if too many half-open attempts
    if (this.state === CircuitState.HALF_OPEN && this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
      this.transitionTo(CircuitState.OPEN);
      throw new CircuitBreakerOpenError(this.name, traceId);
    }

    // Track half-open attempts
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record successful request
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      // Transition to closed after enough successes
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Record failed request
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediately open on failure in half-open
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      // Open after threshold failures
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.timeout;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    
    if (oldState === newState) {
      return;
    }

    this.state = newState;

    // Reset counters based on new state
    switch (newState) {
      case CircuitState.CLOSED:
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenAttempts = 0;
        this.onClose?.();
        break;

      case CircuitState.OPEN:
        this.successCount = 0;
        this.halfOpenAttempts = 0;
        this.onOpen?.();
        break;

      case CircuitState.HALF_OPEN:
        this.successCount = 0;
        this.halfOpenAttempts = 0;
        this.onHalfOpen?.();
        break;
    }

    // Notify state change
    this.onStateChange?.(oldState, newState);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit health stats
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenAttempts: this.halfOpenAttempts,
      timeSinceLastFailure: Date.now() - this.lastFailureTime,
    };
  }

  /**
   * Manually reset circuit
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Manually trip circuit
   */
  trip(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }
}

/**
 * Circuit Breaker Registry - manages multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create circuit breaker
   */
  get(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
    callbacks?: {
      onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
      onOpen?: () => void;
      onClose?: () => void;
      onHalfOpen?: () => void;
    }
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config, callbacks));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all breakers
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Get breaker stats
   */
  getStats() {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    
    return stats;
  }

  /**
   * Reset all breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

/**
 * Global circuit breaker registry
 */
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
