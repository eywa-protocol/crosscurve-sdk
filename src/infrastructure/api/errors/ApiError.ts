/**
 * @fileoverview Base API error class
 * @implements PRD Section 7.9 - Error Handling
 */

/**
 * Base error class for API-related errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
