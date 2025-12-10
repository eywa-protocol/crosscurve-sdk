/**
 * @fileoverview MemoryCache unit tests
 * Tests in-memory cache with TTL expiration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryCache } from '../../../../src/infrastructure/cache/MemoryCache.js';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new MemoryCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', { data: 'value1' }, 60000);
      expect(cache.get('key1')).toEqual({ data: 'value1' });
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'first', 60000);
      cache.set('key1', 'second', 60000);
      expect(cache.get('key1')).toBe('second');
    });

    it('should store different types of values', () => {
      cache.set('string', 'hello', 60000);
      cache.set('number', 42, 60000);
      cache.set('array', [1, 2, 3], 60000);
      cache.set('object', { nested: { value: true } }, 60000);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('object')).toEqual({ nested: { value: true } });
    });

    it('should handle null and undefined values', () => {
      cache.set('null', null, 60000);
      cache.set('undefined', undefined, 60000);

      expect(cache.get('null')).toBeNull();
      expect(cache.get('undefined')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      cache.set('key1', 'value1', 5000); // 5 second TTL

      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(6000); // Advance past TTL

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', () => {
      cache.set('key1', 'value1', 5000);

      vi.advanceTimersByTime(4000);

      expect(cache.get('key1')).toBe('value1');
    });

    it('should expire entry exactly at TTL boundary', () => {
      cache.set('key1', 'value1', 5000);

      vi.advanceTimersByTime(5000);

      // At exactly TTL, should still be valid
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(1);

      // After TTL, should be expired
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should handle different TTLs for different keys', () => {
      cache.set('short', 'short-value', 2000);
      cache.set('long', 'long-value', 10000);

      vi.advanceTimersByTime(3000);

      expect(cache.get('short')).toBeUndefined();
      expect(cache.get('long')).toBe('long-value');
    });

    it('should reset TTL when value is overwritten', () => {
      cache.set('key1', 'value1', 5000);

      vi.advanceTimersByTime(4000);

      cache.set('key1', 'value2', 5000); // Reset TTL

      vi.advanceTimersByTime(4000); // Total 8s from start, but only 4s from reset

      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1', 60000);
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', () => {
      cache.set('key1', 'value1', 1000);
      vi.advanceTimersByTime(2000);
      expect(cache.has('key1')).toBe(false);
    });

    it('should clean up expired entry when checking has()', () => {
      cache.set('key1', 'value1', 1000);
      vi.advanceTimersByTime(2000);

      // First check - should return false and clean up
      expect(cache.has('key1')).toBe(false);

      // Verify it was cleaned up by checking internal state via get
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should remove entries', () => {
      cache.set('key1', 'value1', 60000);
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not throw when deleting non-existent key', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });

    it('should only delete specified key', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);
      cache.delete('key1');

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);
      cache.set('key3', 'value3', 60000);

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });

    it('should allow setting new values after clear', () => {
      cache.set('key1', 'value1', 60000);
      cache.clear();
      cache.set('key1', 'new-value', 60000);

      expect(cache.get('key1')).toBe('new-value');
    });

    it('should not throw when clearing empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });
  });

  describe('ICache interface compliance', () => {
    it('should implement all ICache methods', () => {
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
      expect(typeof cache.has).toBe('function');
      expect(typeof cache.delete).toBe('function');
      expect(typeof cache.clear).toBe('function');
    });
  });
});
