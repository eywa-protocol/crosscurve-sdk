/**
 * @fileoverview Insufficient balance error class
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when user has insufficient token balance
 */
export class InsufficientBalanceError extends BaseError {
  readonly code = 'INSUFFICIENT_BALANCE';

  constructor(
    message: string,
    public readonly required: string,
    public readonly available: string
  ) {
    super(message);
    this.name = 'InsufficientBalanceError';
    Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
  }
}
