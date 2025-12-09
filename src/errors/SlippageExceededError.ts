/**
 * @fileoverview Slippage exceeded error class
 * @implements PRD Appendix C - Error Classes
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when slippage exceeds configured maximum
 */
export class SlippageExceededError extends BaseError {
  readonly code = 'SLIPPAGE_EXCEEDED';

  constructor(
    message: string,
    public readonly requested: number,
    public readonly maximum: number
  ) {
    super(message);
    this.name = 'SlippageExceededError';
    Object.setPrototypeOf(this, SlippageExceededError.prototype);
  }
}
