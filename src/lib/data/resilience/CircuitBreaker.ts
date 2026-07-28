/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by stopping requests to failing services.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests rejected immediately
 * - HALF_OPEN: Testing if service recovered
 * 
 * Flow:
 * CLOSED → (failures exceed threshold) → OPEN
 * OPEN → (after timeout) → HALF_OPEN
 * HALF_OPEN → (test success) → CLOSED
 * HALF_OPEN → (test failure) → OPEN
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes in half-open to close
  timeout: number; // Time in ms before attempting recovery
  monitoringPeriod: number; // Time window for counting failures
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
}

export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public nextAttemptTime: number
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private failureTimestamps: number[] = [];

  private readonly config: CircuitBreakerConfig;
  private readonly onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;

  constructor(
    config: Partial<CircuitBreakerConfig> = {},
    onStateChange?: (oldState: CircuitState, newState: CircuitState) => void
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000, // 60 seconds
      monitoringPeriod: config.monitoringPeriod ?? 120000, // 2 minutes
    };
    this.onStateChange = onStateChange;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should attempt recovery
    this.checkRecovery();

    // If circuit is open, reject immediately
    if (this.state === CircuitState.OPEN) {
      const waitTime = this.nextAttemptTime ? this.nextAttemptTime - Date.now() : 0;
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN. Service unavailable. Retry in ${Math.ceil(waitTime / 1000)}s`,
        this.nextAttemptTime!
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record successful execution
   */
  private recordSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();

    // If in HALF_OPEN and reached success threshold, close circuit
    if (
      this.state === CircuitState.HALF_OPEN &&
      this.consecutiveSuccesses >= this.config.successThreshold
    ) {
      this.setState(CircuitState.CLOSED);
      this.reset();
    }
  }

  /**
   * Record failed execution
   */
  private recordFailure(): void {
    const now = Date.now();
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = now;
    this.failureTimestamps.push(now);

    // Clean old failure timestamps outside monitoring period
    this.failureTimestamps = this.failureTimestamps.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod
    );

    // If in HALF_OPEN, any failure reopens circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN);
      this.nextAttemptTime = now + this.config.timeout;
      return;
    }

    // If in CLOSED and failures exceed threshold, open circuit
    if (
      this.state === CircuitState.CLOSED &&
      this.failureTimestamps.length >= this.config.failureThreshold
    ) {
      this.setState(CircuitState.OPEN);
      this.nextAttemptTime = now + this.config.timeout;
    }
  }

  /**
   * Check if circuit should attempt recovery
   */
  private checkRecovery(): void {
    if (
      this.state === CircuitState.OPEN &&
      this.nextAttemptTime &&
      Date.now() >= this.nextAttemptTime
    ) {
      this.setState(CircuitState.HALF_OPEN);
      this.consecutiveSuccesses = 0;
    }
  }

  /**
   * Change circuit state
   */
  private setState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (oldState !== newState && this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
  }

  /**
   * Reset circuit breaker statistics
   */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    this.failureTimestamps = [];
  }

  /**
   * Force circuit to specific state
   */
  forceState(state: CircuitState): void {
    this.setState(state);
    if (state === CircuitState.CLOSED) {
      this.reset();
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    this.checkRecovery();
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Check if circuit is allowing requests
   */
  isAllowingRequests(): boolean {
    this.checkRecovery();
    return this.state !== CircuitState.OPEN;
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000, // 1 minute
 *   monitoringPeriod: 120000, // 2 minutes
 * }, (oldState, newState) => {
 *   console.log(`Circuit breaker: ${oldState} → ${newState}`);
 * });
 * 
 * try {
 *   const result = await breaker.execute(() => fetchMovie(550));
 *   console.log('Success:', result);
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     console.log('Circuit open, service unavailable');
 *   } else {
 *     console.log('Request failed:', error);
 *   }
 * }
 * ```
 */
