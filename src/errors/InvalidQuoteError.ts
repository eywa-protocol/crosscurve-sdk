/**
 * @fileoverview Invalid quote error class
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when a quote is invalid or cannot be executed
 */
export class InvalidQuoteError extends BaseError {
  readonly code = 'INVALID_QUOTE';

  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'InvalidQuoteError';
    Object.setPrototypeOf(this, InvalidQuoteError.prototype);
  }
}
