/**
 * @fileoverview Rate limiter with circuit breaker pattern
 *
 * Provides rate limiting for external API calls with circuit breaker
 * protection to prevent cascading failures.
 */

import { CircuitBreakerError } from '../errors/CircuitBreakerError.js';

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum requests per second */
  requestsPerSecond: number;
  /** Number of consecutive failures before opening circuit */
  circuitBreakerThreshold: number;
  /** Time in ms to wait before attempting half-open state */
  circuitBreakerResetMs: number;
}

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

// Re-export for backwards compatibility
export { CircuitBreakerError };

/**
 * Rate limiter with circuit breaker pattern
 *
 * Features:
 * - Token bucket rate limiting
 * - Circuit breaker to prevent cascading failures
 * - Automatic reset after cooldown period
 */
export class RateLimiter {
  private lastRequestTime = 0;
  private failureCount = 0;
  private circuitState: CircuitState = 'closed';
  private circuitOpenedAt = 0;
  private readonly minIntervalMs: number;

  constructor(
    private readonly config: RateLimiterConfig,
    private readonly serviceName: string = 'unknown'
  ) {
    this.minIntervalMs = 1000 / config.requestsPerSecond;
  }

  /**
   * Get current circuit state
   */
  getCircuitState(): CircuitState {
    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.circuitOpenedAt;
      if (elapsed >= this.config.circuitBreakerResetMs) {
        this.circuitState = 'half-open';
      }
    }
    return this.circuitState;
  }

  /**
   * Check if circuit is currently open
   */
  isCircuitOpen(): boolean {
    return this.getCircuitState() === 'open';
  }

  /**
   * Acquire permission to make a request
   * Waits if rate limit would be exceeded
   *
   * @throws CircuitBreakerError if circuit is open
   */
  async acquire(): Promise<void> {
    const state = this.getCircuitState();

    if (state === 'open') {
      const remainingMs = this.config.circuitBreakerResetMs - (Date.now() - this.circuitOpenedAt);
      throw new CircuitBreakerError(this.serviceName, Math.max(0, remainingMs));
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const waitTime = this.minIntervalMs - timeSinceLastRequest;

    if (waitTime > 0) {
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Record a successful request
   * Resets failure count and closes circuit if in half-open state
   */
  recordSuccess(): void {
    this.failureCount = 0;
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed';
    }
  }

  /**
   * Record a failed request
   * Opens circuit if failure threshold is reached
   */
  recordFailure(): void {
    this.failureCount++;

    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitState = 'open';
      this.circuitOpenedAt = Date.now();
    }
  }

  /**
   * Reset the rate limiter state
   */
  reset(): void {
    this.failureCount = 0;
    this.circuitState = 'closed';
    this.circuitOpenedAt = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
