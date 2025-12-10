/**
 * @fileoverview RetryHandler unit tests
 * Tests retry logic with exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryHandler } from '../../../../../src/infrastructure/api/client/RetryHandler.js';
import { NetworkError } from '../../../../../src/infrastructure/api/errors/index.js';

describe('RetryHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    it('should return result on first success', async () => {
      const handler = new RetryHandler();
      const fn = vi.fn().mockResolvedValue('success');

      const result = await handler.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable network error', async () => {
      const handler = new RetryHandler({
        maxTotalTime: 10000,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const promise = handler.execute(fn);

      // Advance past first retry delay
      await vi.advanceTimersByTimeAsync(150);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 status', async () => {
      const handler = new RetryHandler({
        maxTotalTime: 10000,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const fn = vi.fn()
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValueOnce('success');

      const promise = handler.execute(fn);
      await vi.advanceTimersByTimeAsync(150);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 status', async () => {
      const handler = new RetryHandler({
        maxTotalTime: 10000,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const fn = vi.fn()
        .mockRejectedValueOnce({ status: 503, message: 'Service unavailable' })
        .mockResolvedValueOnce('success');

      const promise = handler.execute(fn);
      await vi.advanceTimersByTimeAsync(150);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx status', async () => {
      const handler = new RetryHandler({
        maxTotalTime: 10000,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const fn = vi.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Internal error' })
        .mockResolvedValueOnce('success');

      const promise = handler.execute(fn);
      await vi.advanceTimersByTimeAsync(150);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 4xx errors (except 429)', async () => {
      const handler = new RetryHandler({
        maxTotalTime: 10000,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const error = { status: 400, message: 'Bad request' };
      const fn = vi.fn().mockRejectedValue(error);

      await expect(handler.execute(fn)).rejects.toEqual(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw NetworkError after max total time', async () => {
      // Use real timers for this test since RetryHandler relies on Date.now()
      vi.useRealTimers();

      const handler = new RetryHandler({
        maxTotalTime: 250,
        initialDelay: 50,
        backoffMultiplier: 2,
      });

      const fn = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(handler.execute(fn)).rejects.toThrow(NetworkError);
      // Should have retried multiple times
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should apply exponential backoff', async () => {
      const handler = new RetryHandler({
        maxTotalTime: 10000,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const promise = handler.execute(fn);

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(fn).toHaveBeenCalledTimes(2);

      // Second retry after 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);
      expect(fn).toHaveBeenCalledTimes(3);

      // Third retry after 400ms (200 * 2)
      await vi.advanceTimersByTimeAsync(400);
      expect(fn).toHaveBeenCalledTimes(4);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should retry on timeout errors', async () => {
      const handler = new RetryHandler({
        maxTotalTime: 10000,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce('success');

      const promise = handler.execute(fn);
      await vi.advanceTimersByTimeAsync(150);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on fetch errors', async () => {
      const handler = new RetryHandler({
        maxTotalTime: 10000,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce('success');

      const promise = handler.execute(fn);
      await vi.advanceTimersByTimeAsync(150);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('configuration', () => {
    it('should use default config when not provided', async () => {
      const handler = new RetryHandler();
      const fn = vi.fn().mockResolvedValue('success');

      const result = await handler.execute(fn);

      expect(result).toBe('success');
    });

    it('should respect custom maxTotalTime', async () => {
      // Use real timers for this test since RetryHandler relies on Date.now()
      vi.useRealTimers();

      const handler = new RetryHandler({
        maxTotalTime: 150,
        initialDelay: 50,
        backoffMultiplier: 2,
      });

      const fn = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(handler.execute(fn)).rejects.toThrow(NetworkError);
      // Should only retry a couple times due to short maxTotalTime
      expect(fn.mock.calls.length).toBeLessThanOrEqual(3);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });
});
