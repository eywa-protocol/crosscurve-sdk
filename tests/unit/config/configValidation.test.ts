/**
 * @fileoverview Tests for configuration validation and defaults
 */

import { describe, it, expect } from 'vitest';
import { applyConfigDefaults, validateConfig } from '../../../src/config/validation.js';
import type { CrossCurveConfig } from '../../../src/types/config.js';

describe('Config Validation', () => {
  describe('applyConfigDefaults', () => {
    it('should apply defaults when no config provided', () => {
      const config = applyConfigDefaults();

      expect(config.baseUrl).toBe('https://api.crosscurve.fi');
      expect(config.approvalMode).toBe('exact');
      expect(config.warnings.inconsistencyResolution).toBe(true);
      expect(config.polling.initialInterval).toBe(10000);
      expect(config.polling.backoffMultiplier).toBe(1.5);
      expect(config.polling.maxInterval).toBe(60000);
      expect(config.polling.timeout).toBe(900000);
      expect(config.bridgePolling.initialInterval).toBe(15000);
      expect(config.bridgePolling.timeout).toBe(1800000);
      expect(config.http.timeout).toBe(90000);
      expect(config.http.retryMaxTime).toBe(90000);
      expect(config.cache.ttlMs).toBe(600000);
      expect(config.security.enforceHttps).toBe(true);
      expect(config.security.allowedHosts).toContain('api.crosscurve.fi');
      expect(config.permitDeadlineSeconds).toBe(3600);
    });

    it('should merge user config with defaults', () => {
      const userConfig: Partial<CrossCurveConfig> = {
        apiKey: 'my-api-key',
        approvalMode: 'unlimited',
        polling: {
          initialInterval: 5000,
        },
        http: {
          timeout: 60000,
        },
        security: {
          allowedHosts: ['custom-host.example.com'],
        },
      };

      const config = applyConfigDefaults(userConfig);

      expect(config.apiKey).toBe('my-api-key');
      expect(config.approvalMode).toBe('unlimited');
      expect(config.polling.initialInterval).toBe(5000);
      expect(config.polling.backoffMultiplier).toBe(1.5); // Default preserved
      expect(config.http.timeout).toBe(60000);
      expect(config.http.retryMaxTime).toBe(90000); // Default preserved
      expect(config.security.allowedHosts).toEqual(['custom-host.example.com']);
    });
  });

  describe('validateConfig', () => {
    it('should pass valid configuration', () => {
      const config = applyConfigDefaults();
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject invalid baseUrl', () => {
      const config = applyConfigDefaults({ baseUrl: 'not-a-url' });
      expect(() => validateConfig(config)).toThrow('Invalid baseUrl');
    });

    it('should reject invalid maxSlippage (negative)', () => {
      const config = applyConfigDefaults({ maxSlippage: -1 });
      expect(() => validateConfig(config)).toThrow('maxSlippage must be between 0 and 100');
    });

    it('should reject invalid maxSlippage (over 100)', () => {
      const config = applyConfigDefaults({ maxSlippage: 101 });
      expect(() => validateConfig(config)).toThrow('maxSlippage must be between 0 and 100');
    });

    it('should reject invalid approvalMode', () => {
      const config = applyConfigDefaults();
      (config as any).approvalMode = 'invalid';
      expect(() => validateConfig(config)).toThrow('approvalMode must be either');
    });

    it('should reject non-positive polling interval', () => {
      const config = applyConfigDefaults({ polling: { initialInterval: 0 } });
      expect(() => validateConfig(config)).toThrow('polling.initialInterval must be positive');
    });

    it('should reject maxInterval less than initialInterval', () => {
      const config = applyConfigDefaults({
        polling: { initialInterval: 10000, maxInterval: 5000 },
      });
      expect(() => validateConfig(config)).toThrow('polling.maxInterval must be >= initialInterval');
    });

    it('should reject non-positive http timeout', () => {
      const config = applyConfigDefaults({ http: { timeout: 0 } });
      expect(() => validateConfig(config)).toThrow('http.timeout must be positive');
    });

    it('should reject non-positive cache TTL', () => {
      const config = applyConfigDefaults({ cache: { ttlMs: 0 } });
      expect(() => validateConfig(config)).toThrow('cache.ttlMs must be positive');
    });

    it('should reject non-positive permit deadline', () => {
      const config = applyConfigDefaults({ permitDeadlineSeconds: 0 });
      expect(() => validateConfig(config)).toThrow('permitDeadlineSeconds must be positive');
    });

    it('should reject empty allowedHosts', () => {
      const config = applyConfigDefaults({ security: { allowedHosts: [] } });
      expect(() => validateConfig(config)).toThrow('security.allowedHosts must contain at least one host');
    });
  });

  describe('polling config validation', () => {
    it('should validate bridgePolling separately', () => {
      const config = applyConfigDefaults({
        bridgePolling: { initialInterval: 0 },
      });
      expect(() => validateConfig(config)).toThrow('bridgePolling.initialInterval must be positive');
    });

    it('should reject non-positive backoff multiplier', () => {
      const config = applyConfigDefaults({
        polling: { backoffMultiplier: 0 },
      });
      expect(() => validateConfig(config)).toThrow('polling.backoffMultiplier must be positive');
    });

    it('should reject non-positive timeout', () => {
      const config = applyConfigDefaults({
        polling: { timeout: 0 },
      });
      expect(() => validateConfig(config)).toThrow('polling.timeout must be positive');
    });
  });

  describe('http config validation', () => {
    it('should reject non-positive retryMaxTime', () => {
      const config = applyConfigDefaults({
        http: { retryMaxTime: 0 },
      });
      expect(() => validateConfig(config)).toThrow('http.retryMaxTime must be positive');
    });

    it('should reject non-positive retryInitialDelay', () => {
      const config = applyConfigDefaults({
        http: { retryInitialDelay: 0 },
      });
      expect(() => validateConfig(config)).toThrow('http.retryInitialDelay must be positive');
    });

    it('should reject non-positive retryBackoffMultiplier', () => {
      const config = applyConfigDefaults({
        http: { retryBackoffMultiplier: 0 },
      });
      expect(() => validateConfig(config)).toThrow('http.retryBackoffMultiplier must be positive');
    });
  });
});
