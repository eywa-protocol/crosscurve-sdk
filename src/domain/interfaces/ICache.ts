/**
 * @fileoverview Cache port (interface)
 * @layer domain - Interface segregation principle
 */

/**
 * Cache interface for temporary data storage
 * Implemented by infrastructure/cache/MemoryCache
 */
export interface ICache {
  /**
   * Get value from cache
   * @returns value if exists and not expired, undefined otherwise
   */
  get<T>(key: string): T | undefined;

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to store
   * @param ttlMs Time to live in milliseconds
   */
  set<T>(key: string, value: T, ttlMs: number): void;

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean;

  /**
   * Delete key from cache
   */
  delete(key: string): void;

  /**
   * Clear all cache entries
   */
  clear(): void;
}
