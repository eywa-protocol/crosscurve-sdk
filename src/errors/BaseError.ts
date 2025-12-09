/**
 * @fileoverview Base error class for all SDK errors
 * @implements PRD Section 7.9 - Error Handling
 */

/**
 * Base error class for all SDK errors
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaseError';
    Object.setPrototypeOf(this, BaseError.prototype);
  }
}
