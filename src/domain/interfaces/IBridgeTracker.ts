/**
 * @fileoverview Bridge tracking interface
 * @layer domain - ZERO external dependencies
 *
 * Defines contract for external bridge tracking (Rubic, Bungee, etc.)
 * Each bridge has its own API for tracking transaction status.
 */

/**
 * Parameters for tracking a bridge transaction
 */
export interface BridgeTrackingParams {
  /** Source transaction hash */
  transactionHash: string;
  /** Bridge-specific identifier (e.g., rubicId for Rubic) */
  bridgeId?: string;
  /** Source chain ID */
  fromChainId?: number;
  /** Destination chain ID */
  toChainId?: number;
}

/**
 * Normalized bridge transaction status
 */
export interface BridgeStatus {
  /** Overall status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'refunded';
  /** Source chain transaction info */
  sourceTx?: {
    hash: string;
    status: string;
  };
  /** Destination chain transaction info */
  destinationTx?: {
    hash: string | null;
    status: string;
  };
  /** Original API response for debugging */
  raw?: unknown;
}

/**
 * Interface for external bridge tracking
 * Implementations handle specific bridge APIs (Rubic, Bungee, etc.)
 */
export interface IBridgeTracker {
  /** Provider identifier matching RouteProvider values */
  readonly provider: string;

  /**
   * Track a transaction through this bridge
   * @param params Tracking parameters including txHash and optional bridgeId
   * @returns Normalized bridge status
   */
  track(params: BridgeTrackingParams): Promise<BridgeStatus>;
}
