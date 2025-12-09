/**
 * @fileoverview Validation error class
 * @implements PRD Section 7.9 - Error Handling
 */

import { ApiError } from './ApiError.js';

/**
 * Error thrown for validation failures
 */
export class ValidationError extends ApiError {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
