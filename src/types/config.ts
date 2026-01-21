/**
 * @fileoverview SDK configuration types
 */

/**
 * Token approval mode
 * - 'exact': Approve only the exact amount needed (recommended for security)
 * - 'unlimited': Approve unlimited amount (MAX_UINT256)
 */
export type ApprovalMode = 'exact' | 'unlimited';

/**
 * Polling configuration for status tracking
 */
export interface PollingConfig {
  /** Initial polling interval in milliseconds */
  initialInterval: number;
  /** Backoff multiplier for increasing interval */
  backoffMultiplier: number;
  /** Maximum polling interval in milliseconds */
  maxInterval: number;
  /** Total timeout for polling in milliseconds */
  timeout: number;
}

/**
 * HTTP client configuration
 */
export interface HttpConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum total time for retries in milliseconds */
  retryMaxTime: number;
  /** Initial delay between retries in milliseconds */
  retryInitialDelay: number;
  /** Backoff multiplier for retry delays */
  retryBackoffMultiplier: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Time-to-live for cached data in milliseconds */
  ttlMs: number;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Allowed API hosts (for request validation) */
  allowedHosts: string[];
  /** Enforce HTTPS for API requests (default: true) */
  enforceHttps: boolean;
}

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
  /** Polling configuration for CrossCurve transaction tracking */
  polling?: Partial<PollingConfig>;
  /** Polling configuration for external bridges (Rubic, Bungee) */
  bridgePolling?: Partial<PollingConfig>;
  /** HTTP client configuration */
  http?: Partial<HttpConfig>;
  /** Cache configuration */
  cache?: Partial<CacheConfig>;
  /** Security configuration */
  security?: Partial<SecurityConfig>;
  /** Permit signature deadline in seconds (default: 3600 = 1 hour) */
  permitDeadlineSeconds?: number;
  /** Fee share in basis points (0-10000) for partner commission */
  feeShareBps?: number;
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
  polling: PollingConfig;
  bridgePolling: PollingConfig;
  http: HttpConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  permitDeadlineSeconds: number;
  feeShareBps: number | undefined;
}

/**
 * SDK dependency injection interface for testability
 * Allows injecting custom implementations of internal services
 */
export interface SDKDependencies {
  /** Custom cache implementation */
  cache?: import('../domain/interfaces/index.js').ICache;
  /** Custom API client implementation */
  apiClient?: import('../domain/interfaces/index.js').IApiClient;
  /** Custom bridge trackers */
  bridgeTrackers?: import('../domain/interfaces/index.js').IBridgeTracker[];
}
