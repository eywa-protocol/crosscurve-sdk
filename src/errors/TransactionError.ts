/**
 * @fileoverview Transaction error class
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when a transaction fails
 */
export class TransactionError extends BaseError {
  readonly code = 'TRANSACTION_ERROR';

  constructor(
    message: string,
    public readonly transactionHash?: string,
    public readonly reason?: string
  ) {
    super(message);
    this.name = 'TransactionError';
    Object.setPrototypeOf(this, TransactionError.prototype);
  }
}
