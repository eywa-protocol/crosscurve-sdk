/**
 * Unit tests for polling utilities
 *
 * Tests exponential backoff, timeout, and polling logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { poll, pollWithCallback } from '../../../src/utils/polling.js';

describe('polling utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('poll', () => {
    it('should return result when shouldContinue returns false', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'completed' });

      const shouldContinue = (result: { status: string }) => result.status === 'pending';

      const promise = poll(fn, shouldContinue, { initialInterval: 1000 });

      // First call
      await vi.advanceTimersByTimeAsync(0);
      expect(fn).toHaveBeenCalledTimes(1);

      // Wait for interval and second call
      await vi.advanceTimersByTimeAsync(1000);
      expect(fn).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result).toEqual({ status: 'completed' });
    });

    it('should apply exponential backoff', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'completed' });

      const shouldContinue = (result: { status: string }) => result.status === 'pending';

      const promise = poll(fn, shouldContinue, {
        initialInterval: 1000,
        backoffMultiplier: 1.5,
        maxInterval: 60000,
        timeout: 100000,
      });

      // First call (immediate)
      await vi.advanceTimersByTimeAsync(0);
      expect(fn).toHaveBeenCalledTimes(1);

      // Second call after 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(fn).toHaveBeenCalledTimes(2);

      // Third call after 1500ms (1000 * 1.5)
      await vi.advanceTimersByTimeAsync(1500);
      expect(fn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toEqual({ status: 'completed' });
    });

    it('should respect maxInterval cap', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'completed' });

      const shouldContinue = (result: { status: string }) => result.status === 'pending';

      const promise = poll(fn, shouldContinue, {
        initialInterval: 50000,
        backoffMultiplier: 2,
        maxInterval: 60000,
        timeout: 200000,
      });

      // First call
      await vi.advanceTimersByTimeAsync(0);
      expect(fn).toHaveBeenCalledTimes(1);

      // Second call after 50000ms (capped at maxInterval)
      await vi.advanceTimersByTimeAsync(50000);
      expect(fn).toHaveBeenCalledTimes(2);

      // Third call after 60000ms (maxInterval, not 100000ms)
      await vi.advanceTimersByTimeAsync(60000);
      expect(fn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toEqual({ status: 'completed' });
    });

    it('should throw timeout error after timeout period', async () => {
      vi.useRealTimers(); // Use real timers for timeout test

      const fn = vi.fn().mockResolvedValue({ status: 'pending' });
      const shouldContinue = (result: { status: string }) => result.status === 'pending';

      const promise = poll(fn, shouldContinue, {
        initialInterval: 100,
        backoffMultiplier: 1.5,
        maxInterval: 60000,
        timeout: 500, // Short timeout for test
      });

      await expect(promise).rejects.toThrow('Polling timeout after 500ms');

      vi.useFakeTimers(); // Restore fake timers
    });

    it('should handle null results and continue polling', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ status: 'completed' });

      const shouldContinue = (result: { status: string }) => result.status === 'pending';

      const promise = poll(fn, shouldContinue, { initialInterval: 1000, timeout: 10000 });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1500);

      const result = await promise;
      expect(result).toEqual({ status: 'completed' });
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use default config when not provided', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'completed' });

      const shouldContinue = (result: { status: string }) => result.status === 'pending';

      const promise = poll(fn, shouldContinue);

      await vi.advanceTimersByTimeAsync(0);
      expect(fn).toHaveBeenCalledTimes(1);

      // Default initial interval is 10000ms
      await vi.advanceTimersByTimeAsync(10000);
      expect(fn).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result).toEqual({ status: 'completed' });
    });

    it('should handle partial config override', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'completed' });

      const shouldContinue = (result: { status: string }) => result.status === 'pending';

      const promise = poll(fn, shouldContinue, { initialInterval: 2000 });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result).toEqual({ status: 'completed' });
    });

    it('should handle errors thrown by polling function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Network error'));
      const shouldContinue = () => true;

      const promise = poll(fn, shouldContinue, { initialInterval: 1000 });

      await expect(promise).rejects.toThrow('Network error');
    });
  });

  describe('pollWithCallback', () => {
    it('should call callback for each intermediate result', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 'pending', progress: 25 })
        .mockResolvedValueOnce({ status: 'pending', progress: 50 })
        .mockResolvedValueOnce({ status: 'pending', progress: 75 })
        .mockResolvedValueOnce({ status: 'completed', progress: 100 });

      const shouldContinue = (result: { status: string }) => result.status === 'pending';
      const onUpdate = vi.fn();

      const promise = pollWithCallback(fn, shouldContinue, onUpdate, {
        initialInterval: 1000,
        timeout: 20000,
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(onUpdate).toHaveBeenCalledWith({ status: 'pending', progress: 25 });

      await vi.advanceTimersByTimeAsync(1000);
      expect(onUpdate).toHaveBeenCalledWith({ status: 'pending', progress: 50 });

      await vi.advanceTimersByTimeAsync(1500);
      expect(onUpdate).toHaveBeenCalledWith({ status: 'pending', progress: 75 });

      await vi.advanceTimersByTimeAsync(2250);
      expect(onUpdate).toHaveBeenCalledWith({ status: 'completed', progress: 100 });

      const result = await promise;
      expect(result).toEqual({ status: 'completed', progress: 100 });
      expect(onUpdate).toHaveBeenCalledTimes(4);
    });

    it('should apply exponential backoff with callbacks', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ value: 1 })
        .mockResolvedValueOnce({ value: 2 })
        .mockResolvedValueOnce({ value: 3 });

      const shouldContinue = (result: { value: number }) => result.value < 3;
      const onUpdate = vi.fn();

      const promise = pollWithCallback(fn, shouldContinue, onUpdate, {
        initialInterval: 1000,
        backoffMultiplier: 2,
        maxInterval: 60000,
        timeout: 50000,
      });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000); // 1000ms (1 * 1000)
      await vi.advanceTimersByTimeAsync(2000); // 2000ms (2 * 1000)

      const result = await promise;
      expect(result).toEqual({ value: 3 });
      expect(onUpdate).toHaveBeenCalledTimes(3);
    });

    it('should not call callback for null/undefined results', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ status: 'completed' });

      const shouldContinue = (result: { status: string }) => result.status !== 'completed';
      const onUpdate = vi.fn();

      const promise = pollWithCallback(fn, shouldContinue, onUpdate, {
        initialInterval: 1000,
        timeout: 10000,
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(onUpdate).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      expect(onUpdate).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1500);
      expect(onUpdate).toHaveBeenCalledWith({ status: 'completed' });
      expect(onUpdate).toHaveBeenCalledTimes(1);

      await promise;
    });

    it('should throw timeout error with callbacks', async () => {
      vi.useRealTimers(); // Use real timers for timeout test

      const fn = vi.fn().mockResolvedValue({ status: 'pending' });
      const shouldContinue = (result: { status: string }) => result.status === 'pending';
      const onUpdate = vi.fn();

      const promise = pollWithCallback(fn, shouldContinue, onUpdate, {
        initialInterval: 100,
        backoffMultiplier: 1.5,
        maxInterval: 60000,
        timeout: 500, // Short timeout for test
      });

      await expect(promise).rejects.toThrow('Polling timeout after 500ms');
      expect(onUpdate).toHaveBeenCalled();

      vi.useFakeTimers(); // Restore fake timers
    });

    it('should track callback invocations', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 'pending', progress: 50 })
        .mockResolvedValueOnce({ status: 'completed', progress: 100 });

      const shouldContinue = (result: { status: string }) => result.status === 'pending';
      const onUpdate = vi.fn();

      const promise = pollWithCallback(fn, shouldContinue, onUpdate, {
        initialInterval: 1000,
        timeout: 10000,
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(onUpdate).toHaveBeenCalledWith({ status: 'pending', progress: 50 });

      await vi.advanceTimersByTimeAsync(1000);
      expect(onUpdate).toHaveBeenCalledWith({ status: 'completed', progress: 100 });

      const result = await promise;
      expect(result).toEqual({ status: 'completed', progress: 100 });
      expect(onUpdate).toHaveBeenCalledTimes(2);
    });
  });
});
