/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by stopping requests to failing services
 * 
 * States:
 * - CLOSED: Normal operation
 * - OPEN: Service is failing, reject immediately
 * - HALF_OPEN: Testing if service recovered
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Number of successes to close from half-open
  timeout: number;                // Time to wait before half-open (ms)
  monitoringPeriod: number;      // Time window to track failures (ms)
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private stats: CircuitBreakerStats = {
    failures: 0,
    successes: 0,
    lastFailureTime: null,
    lastSuccessTime: null,
  };
  
  private nextAttempt: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN. Service unavailable. Retry after ${new Date(this.nextAttempt).toISOString()}`);
      }
      
      // Move to half-open to test recovery
      this.state = 'HALF_OPEN';
      console.log('[Circuit Breaker] Moving to HALF_OPEN state');
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
   * Handle successful execution
   */
  private onSuccess(): void {
    this.stats.successes++;
    this.stats.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      if (this.stats.successes >= this.config.successThreshold) {
        this.close();
      }
    } else {
      // Reset failure count on success
      this.stats.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.stats.failures++;
    this.stats.lastFailureTime = Date.now();

    // Clean old failures outside monitoring period
    const now = Date.now();
    if (this.stats.lastFailureTime && (now - this.stats.lastFailureTime) > this.config.monitoringPeriod) {
      this.stats.failures = 1; // Reset to current failure
    }

    if (this.state === 'HALF_OPEN') {
      // Failed while testing recovery, go back to open
      this.open();
    } else if (this.stats.failures >= this.config.failureThreshold) {
      // Too many failures, open circuit
      this.open();
    }
  }

  /**
   * Open circuit (stop all requests)
   */
  private open(): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.config.timeout;
    this.stats.successes = 0;
    
    console.warn(`[Circuit Breaker] OPENED after ${this.stats.failures} failures. Will retry at ${new Date(this.nextAttempt).toISOString()}`);
  }

  /**
   * Close circuit (normal operation)
   */
  private close(): void {
    this.state = 'CLOSED';
    this.stats.failures = 0;
    this.stats.successes = 0;
    
    console.log('[Circuit Breaker] CLOSED - service recovered');
  }

  /**
   * Get current state
   */
  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  public getStats(): CircuitBreakerStats & { state: CircuitState } {
    return {
      ...this.stats,
      state: this.state,
    };
  }

  /**
   * Reset circuit breaker
   */
  public reset(): void {
    this.state = 'CLOSED';
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
    };
    this.nextAttempt = 0;
    console.log('[Circuit Breaker] Reset to CLOSED');
  }
}

/**
 * Circuit breaker instances for different services
 */
const breakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for a service
 */
export function getCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!breakers.has(serviceName)) {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,        // Open after 5 failures
      successThreshold: 2,         // Close after 2 successes in half-open
      timeout: 30000,              // Wait 30s before retry
      monitoringPeriod: 60000,    // Track failures in 60s window
      ...config,
    };

    breakers.set(serviceName, new CircuitBreaker(defaultConfig));
  }

  return breakers.get(serviceName)!;
}

/**
 * Execute with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const breaker = getCircuitBreaker(serviceName, config);
  return breaker.execute(fn);
}

export { CircuitBreaker };
export type { CircuitState, CircuitBreakerConfig, CircuitBreakerStats };
