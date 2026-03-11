/**
 * @fileoverview SDK configuration validation and defaults
 */

import type {
  CrossCurveConfig,
  SDKConfig,
  PollingConfig,
  HttpConfig,
  CacheConfig,
  SecurityConfig,
} from '../types/config.js';

/**
 * Default API base URL (staging)
 */
const DEFAULT_BASE_URL = 'https://api.crosscurve.fi';

/**
 * Default polling configuration for CrossCurve transactions
 */
const DEFAULT_POLLING: PollingConfig = {
  initialInterval: 10000,     // 10 seconds
  backoffMultiplier: 1.5,
  maxInterval: 60000,         // 60 seconds
  timeout: 900000,            // 15 minutes
};

/**
 * Default polling configuration for external bridges (Rubic, Bungee)
 */
const DEFAULT_BRIDGE_POLLING: PollingConfig = {
  initialInterval: 15000,     // 15 seconds
  backoffMultiplier: 1.3,
  maxInterval: 60000,         // 60 seconds
  timeout: 1800000,           // 30 minutes
};

/**
 * Default HTTP client configuration
 */
const DEFAULT_HTTP: HttpConfig = {
  timeout: 90000,             // 90 seconds
  retryMaxTime: 90000,        // 90 seconds
  retryInitialDelay: 1000,    // 1 second
  retryBackoffMultiplier: 2,
};

/**
 * Default cache configuration
 */
const DEFAULT_CACHE: CacheConfig = {
  ttlMs: 600000,              // 10 minutes
};

/**
 * Default security configuration
 */
const DEFAULT_SECURITY: SecurityConfig = {
  allowedHosts: ['api.crosscurve.fi'],
  enforceHttps: true,
};

/**
 * Default permit deadline in seconds
 */
const DEFAULT_PERMIT_DEADLINE_SECONDS = 3600; // 1 hour

/**
 * Apply defaults to user configuration
 */
export function applyConfigDefaults(config?: Partial<CrossCurveConfig>): SDKConfig {
  return {
    apiKey: config?.apiKey,
    baseUrl: config?.baseUrl ?? DEFAULT_BASE_URL,
    maxSlippage: config?.maxSlippage,
    approvalMode: config?.approvalMode ?? 'exact',
    warnings: {
      inconsistencyResolution: config?.warnings?.inconsistencyResolution ?? true,
    },
    polling: {
      ...DEFAULT_POLLING,
      ...config?.polling,
    },
    bridgePolling: {
      ...DEFAULT_BRIDGE_POLLING,
      ...config?.bridgePolling,
    },
    http: {
      ...DEFAULT_HTTP,
      ...config?.http,
    },
    cache: {
      ...DEFAULT_CACHE,
      ...config?.cache,
    },
    security: {
      allowedHosts: config?.security?.allowedHosts ?? DEFAULT_SECURITY.allowedHosts,
      enforceHttps: config?.security?.enforceHttps ?? DEFAULT_SECURITY.enforceHttps,
    },
    permitDeadlineSeconds: config?.permit?.deadlineSeconds ?? config?.permitDeadlineSeconds ?? DEFAULT_PERMIT_DEADLINE_SECONDS,
    permit: {
      enabled: config?.permit?.enabled ?? false,
      deadlineSeconds: config?.permit?.deadlineSeconds ?? config?.permitDeadlineSeconds ?? DEFAULT_PERMIT_DEADLINE_SECONDS,
    },
    feeShareBps: config?.feeShareBps,
  };
}

/**
 * Validate SDK configuration
 */
export function validateConfig(config: SDKConfig): void {
  if (config.baseUrl && !isValidUrl(config.baseUrl)) {
    throw new Error('Invalid baseUrl in configuration');
  }

  if (config.maxSlippage !== undefined) {
    if (config.maxSlippage < 0 || config.maxSlippage > 100) {
      throw new Error('maxSlippage must be between 0 and 100');
    }
  }

  if (config.feeShareBps !== undefined) {
    if (config.feeShareBps < 0 || config.feeShareBps > 10000) {
      throw new Error('feeShareBps must be between 0 and 10000');
    }
  }

  if (config.approvalMode !== 'exact' && config.approvalMode !== 'unlimited') {
    throw new Error('approvalMode must be either "exact" or "unlimited"');
  }

  // Validate polling config
  validatePollingConfig(config.polling, 'polling');
  validatePollingConfig(config.bridgePolling, 'bridgePolling');

  // Validate HTTP config
  validateHttpConfig(config.http);

  // Validate cache config
  if (config.cache.ttlMs <= 0) {
    throw new Error('cache.ttlMs must be positive');
  }

  // Validate permit deadline
  if (config.permitDeadlineSeconds <= 0) {
    throw new Error('permitDeadlineSeconds must be positive');
  }

  if (config.permit.deadlineSeconds <= 0) {
    throw new Error('permit.deadlineSeconds must be positive');
  }

  // Validate security config
  if (config.security.allowedHosts.length === 0) {
    throw new Error('security.allowedHosts must contain at least one host');
  }
}

/**
 * Validate polling configuration values
 */
function validatePollingConfig(config: PollingConfig, name: string): void {
  if (config.initialInterval <= 0) {
    throw new Error(`${name}.initialInterval must be positive`);
  }
  if (config.backoffMultiplier <= 0) {
    throw new Error(`${name}.backoffMultiplier must be positive`);
  }
  if (config.maxInterval <= 0) {
    throw new Error(`${name}.maxInterval must be positive`);
  }
  if (config.timeout <= 0) {
    throw new Error(`${name}.timeout must be positive`);
  }
  if (config.maxInterval < config.initialInterval) {
    throw new Error(`${name}.maxInterval must be >= initialInterval`);
  }
}

/**
 * Validate HTTP configuration values
 */
function validateHttpConfig(config: HttpConfig): void {
  if (config.timeout <= 0) {
    throw new Error('http.timeout must be positive');
  }
  if (config.retryMaxTime <= 0) {
    throw new Error('http.retryMaxTime must be positive');
  }
  if (config.retryInitialDelay <= 0) {
    throw new Error('http.retryInitialDelay must be positive');
  }
  if (config.retryBackoffMultiplier <= 0) {
    throw new Error('http.retryBackoffMultiplier must be positive');
  }
}

/**
 * Check if string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
