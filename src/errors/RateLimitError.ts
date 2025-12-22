/**
 * @fileoverview Rate limit error class
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends BaseError {
  constructor(
    public readonly service: string,
    public readonly retryAfterMs?: number
  ) {
    const retryInfo = retryAfterMs ? ` Retry after ${retryAfterMs}ms.` : '';
    super(`Rate limit exceeded for ${service}.${retryInfo}`);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
