/**
 * @fileoverview HTTP retry logic with exponential backoff
 */

import { NetworkError } from '../errors/index.js';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum total time for retries in milliseconds */
  maxTotalTime: number;
  /** Initial delay between retries in milliseconds */
  initialDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 * PRD: HTTP retries until 1.5 minutes total elapsed
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxTotalTime: 90000, // 1.5 minutes
  initialDelay: 1000, // 1 second
  backoffMultiplier: 2,
};

/**
 * Retry handler with exponential backoff
 */
export class RetryHandler {
  constructor(private readonly config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    let delay = this.config.initialDelay;
    let lastError: Error | undefined;

    while (Date.now() - startTime < this.config.maxTotalTime) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryableError(error)) {
          throw error;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed + delay >= this.config.maxTotalTime) {
          break;
        }

        await this.sleep(delay);
        delay *= this.config.backoffMultiplier;
      }
    }

    throw new NetworkError(
      `Request failed after ${this.config.maxTotalTime}ms: ${lastError?.message}`,
      lastError
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
        return true;
      }
    }

    if (typeof error === 'object' && error !== null) {
      const httpError = error as { status?: number };
      if (httpError.status === 429 || httpError.status === 503 || (httpError.status && httpError.status >= 500)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
