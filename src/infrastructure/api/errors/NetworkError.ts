/**
 * @fileoverview Network-specific error class
 * @implements PRD Section 7.9 - Error Handling
 */

import { ApiError } from './ApiError.js';

/**
 * Error thrown for network-related failures
 */
export class NetworkError extends ApiError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
