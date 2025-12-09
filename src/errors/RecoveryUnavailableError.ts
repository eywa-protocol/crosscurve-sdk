/**
 * @fileoverview Recovery unavailable error class
 * @implements PRD Appendix C - Error Classes
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when recovery is not available for a transaction
 */
export class RecoveryUnavailableError extends BaseError {
  readonly code = 'RECOVERY_UNAVAILABLE';

  constructor(
    message: string,
    public readonly requestId: string,
    public readonly reason?: string
  ) {
    super(message);
    this.name = 'RecoveryUnavailableError';
    Object.setPrototypeOf(this, RecoveryUnavailableError.prototype);
  }
}
