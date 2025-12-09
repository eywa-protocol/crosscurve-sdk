/**
 * @fileoverview SDK configuration types
 * @implements PRD Section 6.2 - SDK Config
 * @implements SDK_OVERVIEW.md Section 4 - SDK Config
 */

/**
 * Token approval mode
 * - 'exact': Approve only the exact amount needed (recommended for security)
 * - 'unlimited': Approve unlimited amount (MAX_UINT256)
 */
export type ApprovalMode = 'exact' | 'unlimited';

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
  /** Token approval mode: 'exact' (default) or 'unlimited' */
  approvalMode?: ApprovalMode;
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
  approvalMode: ApprovalMode;
  warnings: {
    inconsistencyResolution: boolean;
  };
}
