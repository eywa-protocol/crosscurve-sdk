/**
 * @fileoverview Validation error class
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown for validation failures
 */
export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
