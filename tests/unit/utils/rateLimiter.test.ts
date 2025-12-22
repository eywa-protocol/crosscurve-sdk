/**
 * @fileoverview Tests for RateLimiter utility with circuit breaker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, CircuitBreakerError, type RateLimiterConfig } from '../../../src/utils/rateLimiter.js';

describe('RateLimiter', () => {
  const defaultConfig: RateLimiterConfig = {
    requestsPerSecond: 10,
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 1000,
  };

  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(defaultConfig, 'test-service');
    vi.useFakeTimers();
  });

  describe('rate limiting', () => {
    it('should allow immediate first request', async () => {
      await expect(limiter.acquire()).resolves.toBeUndefined();
    });

    it('should enforce minimum interval between requests', async () => {
      await limiter.acquire();
      const startTime = Date.now();

      // Second acquire should wait
      const acquirePromise = limiter.acquire();

      // Advance time to allow the acquire to complete
      await vi.advanceTimersByTimeAsync(100);

      await acquirePromise;
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('circuit breaker', () => {
    it('should start in closed state', () => {
      expect(limiter.getCircuitState()).toBe('closed');
      expect(limiter.isCircuitOpen()).toBe(false);
    });

    it('should open after threshold failures', () => {
      limiter.recordFailure();
      limiter.recordFailure();
      expect(limiter.getCircuitState()).toBe('closed');

      limiter.recordFailure(); // Threshold = 3
      expect(limiter.getCircuitState()).toBe('open');
      expect(limiter.isCircuitOpen()).toBe(true);
    });

    it('should throw CircuitBreakerError when open', async () => {
      // Open the circuit
      for (let i = 0; i < defaultConfig.circuitBreakerThreshold; i++) {
        limiter.recordFailure();
      }

      await expect(limiter.acquire()).rejects.toThrow(CircuitBreakerError);
    });

    it('should transition to half-open after reset time', () => {
      // Open the circuit
      for (let i = 0; i < defaultConfig.circuitBreakerThreshold; i++) {
        limiter.recordFailure();
      }
      expect(limiter.getCircuitState()).toBe('open');

      // Advance time past reset period
      vi.advanceTimersByTime(defaultConfig.circuitBreakerResetMs + 1);

      expect(limiter.getCircuitState()).toBe('half-open');
    });

    it('should close circuit on success after half-open', () => {
      // Open the circuit
      for (let i = 0; i < defaultConfig.circuitBreakerThreshold; i++) {
        limiter.recordFailure();
      }

      // Advance to half-open
      vi.advanceTimersByTime(defaultConfig.circuitBreakerResetMs + 1);
      expect(limiter.getCircuitState()).toBe('half-open');

      // Record success
      limiter.recordSuccess();
      expect(limiter.getCircuitState()).toBe('closed');
    });

    it('should reset failure count on success', () => {
      limiter.recordFailure();
      limiter.recordFailure();
      expect(limiter.getFailureCount()).toBe(2);

      limiter.recordSuccess();
      expect(limiter.getFailureCount()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      // Create some state
      limiter.recordFailure();
      limiter.recordFailure();
      limiter.recordFailure();
      expect(limiter.isCircuitOpen()).toBe(true);

      // Reset
      limiter.reset();

      expect(limiter.getCircuitState()).toBe('closed');
      expect(limiter.isCircuitOpen()).toBe(false);
      expect(limiter.getFailureCount()).toBe(0);
    });
  });

  describe('CircuitBreakerError', () => {
    it('should include service name and reset time', async () => {
      // Open the circuit
      for (let i = 0; i < defaultConfig.circuitBreakerThreshold; i++) {
        limiter.recordFailure();
      }

      try {
        await limiter.acquire();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerError);
        expect((error as CircuitBreakerError).service).toBe('test-service');
        expect((error as CircuitBreakerError).resetMs).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
