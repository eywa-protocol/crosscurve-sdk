/**
 * @fileoverview Timeout error class
 * @implements PRD Appendix C - Error Classes
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends BaseError {
  readonly code = 'TIMEOUT';

  constructor(
    message: string,
    public readonly operation: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
