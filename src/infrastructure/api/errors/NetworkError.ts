/**
 * @fileoverview Network-specific error class
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
