/**
 * @fileoverview Configuration error class
 */

import { BaseError } from './BaseError.js';

/**
 * Error thrown when SDK configuration is invalid
 */
export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(`Configuration error in '${field}': ${message}`);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
