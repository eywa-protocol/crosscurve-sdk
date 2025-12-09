/**
 * @fileoverview SDK configuration validation and defaults
 */

import type { CrossCurveConfig, SDKConfig } from '../types/config.js';

/**
 * Default API base URL (production)
 */
const DEFAULT_BASE_URL = 'https://api.crosscurve.io';

/**
 * Apply defaults to user configuration
 */
export function applyConfigDefaults(config?: Partial<CrossCurveConfig>): SDKConfig {
  return {
    apiKey: config?.apiKey,
    baseUrl: config?.baseUrl ?? DEFAULT_BASE_URL,
    maxSlippage: config?.maxSlippage,
    warnings: {
      inconsistencyResolution: config?.warnings?.inconsistencyResolution ?? true,
    },
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
