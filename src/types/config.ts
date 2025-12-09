/**
 * @fileoverview SDK configuration types
 * @implements PRD Section 6.2 - SDK Config
 * @implements SDK_OVERVIEW.md Section 4 - SDK Config
 */

/**
 * SDK configuration options
 */
export interface CrossCurveConfig {
  /** API key for fee sharing and integrator revenue */
  apiKey?: string;
  /** Override API base URL (for testnet/staging) */
  baseUrl?: string;
  /** Maximum slippage threshold for validation (percentage) */
  maxSlippage?: number;
  /** Warning configuration */
  warnings?: {
    /** Emit warnings during inconsistency resolution (default: true) */
    inconsistencyResolution?: boolean;
  };
}

/**
 * Internal SDK configuration with defaults applied
 */
export interface SDKConfig {
  apiKey: string | undefined;
  baseUrl: string;
  maxSlippage: number | undefined;
  warnings: {
    inconsistencyResolution: boolean;
  };
}
