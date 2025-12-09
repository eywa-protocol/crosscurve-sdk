/**
 * @fileoverview Exponential backoff polling utility
 */

/**
 * Polling configuration
 */
export interface PollingConfig {
  /** Initial polling interval in milliseconds */
  initialInterval: number;
  /** Backoff multiplier (1.5 = +50%) */
  backoffMultiplier: number;
  /** Maximum polling interval */
  maxInterval: number;
  /** Timeout in milliseconds */
  timeout: number;
}

/**
 * Default polling configuration
 * PRD: 10s initial, +50% backoff
 */
const DEFAULT_POLLING_CONFIG: PollingConfig = {
  initialInterval: 10000, // 10 seconds
  backoffMultiplier: 1.5, // +50%
  maxInterval: 60000, // 1 minute max
  timeout: 900000, // 15 minutes
};

/**
 * Poll a function until it returns a truthy value or timeout
 */
export async function poll<T>(
  fn: () => Promise<T | null | undefined>,
  shouldContinue: (result: T) => boolean,
  config: Partial<PollingConfig> = {}
): Promise<T> {
  const {
    initialInterval,
    backoffMultiplier,
    maxInterval,
    timeout,
  } = { ...DEFAULT_POLLING_CONFIG, ...config };

  const startTime = Date.now();
  let interval = initialInterval;

  while (true) {
    const result = await fn();

    if (result && !shouldContinue(result)) {
      return result;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed >= timeout) {
      throw new Error(`Polling timeout after ${timeout}ms`);
    }

    const nextInterval = Math.min(interval, maxInterval);
    await new Promise((resolve) => setTimeout(resolve, nextInterval));

    interval = Math.floor(interval * backoffMultiplier);
  }
}

/**
 * Poll with callback for intermediate results
 */
export async function pollWithCallback<T>(
  fn: () => Promise<T | null | undefined>,
  shouldContinue: (result: T) => boolean,
  onUpdate: (result: T) => void,
  config: Partial<PollingConfig> = {}
): Promise<T> {
  const {
    initialInterval,
    backoffMultiplier,
    maxInterval,
    timeout,
  } = { ...DEFAULT_POLLING_CONFIG, ...config };

  const startTime = Date.now();
  let interval = initialInterval;

  while (true) {
    const result = await fn();

    if (result) {
      onUpdate(result);

      if (!shouldContinue(result)) {
        return result;
      }
    }

    const elapsed = Date.now() - startTime;
    if (elapsed >= timeout) {
      throw new Error(`Polling timeout after ${timeout}ms`);
    }

    const nextInterval = Math.min(interval, maxInterval);
    await new Promise((resolve) => setTimeout(resolve, nextInterval));

    interval = Math.floor(interval * backoffMultiplier);
  }
}
