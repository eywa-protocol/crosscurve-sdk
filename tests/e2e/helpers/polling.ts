export interface PollOptions {
  /** Polling interval in ms (default: 15000) */
  interval?: number;
  /** Total timeout in ms (default: 300000 = 5 min) */
  timeout?: number;
  /** Label for error messages */
  label?: string;
}

/**
 * Poll a function until predicate returns true or timeout
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options: PollOptions = {},
): Promise<T> {
  const interval = options.interval ?? 15_000;
  const timeout = options.timeout ?? 300_000;
  const label = options.label ?? 'pollUntil';
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const result = await fn();
    if (predicate(result)) return result;
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`${label}: timeout after ${timeout}ms`);
}
