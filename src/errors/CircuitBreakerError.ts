/**
 * @fileoverview Circuit breaker error class
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends BaseError {
  constructor(
    public readonly service: string,
    public readonly resetMs: number
  ) {
    super(`Circuit breaker open for ${service}. Retry after ${resetMs}ms.`);
    this.name = 'CircuitBreakerError';
    Object.setPrototypeOf(this, CircuitBreakerError.prototype);
  }
}
