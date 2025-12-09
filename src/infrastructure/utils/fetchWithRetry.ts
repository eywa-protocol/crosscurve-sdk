/**
 * @fileoverview HTTP fetch with retry logic
 * @layer infrastructure - Utility for HTTP operations
 *
 * Extracted from BungeeTracker and RubicTracker to reduce duplication
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Base backoff delay in milliseconds (multiplied by attempt number) */
  backoffMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  timeoutMs: 30000,
  backoffMs: 2000,
};

/**
 * Fetch with automatic retry on transient errors
 *
 * @param url URL to fetch
 * @param options Fetch options
 * @param config Retry configuration
 * @returns Parsed JSON response
 * @throws Last error if all retries fail
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;

      // Retry on network/timeout errors, not on HTTP errors
      const isRetryable =
        lastError.name === 'AbortError' ||
        lastError.message.includes('fetch') ||
        lastError.message.includes('network');

      if (attempt < config.maxAttempts - 1 && isRetryable) {
        await new Promise((resolve) =>
          setTimeout(resolve, config.backoffMs * (attempt + 1))
        );
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}
