/**
 * @fileoverview Transaction execution and status types
 * @implements PRD Section 6.5 - ExecuteOptions
 * @implements PRD Section 6.7 - ExecuteResult
 * @implements PRD Section 6.8 - TransactionStatus
 * @implements SDK_OVERVIEW.md Section 4 - Transaction Types
 */

import type { ChainSigner } from './signer.js';
import type { RouteProviderValue } from '../constants/providers.js';

/**
 * Options for tracking a transaction
 */
export interface TrackingOptions {
  /** Provider used for the transaction */
  provider?: RouteProviderValue;
  /** Bridge-specific identifier (e.g., rubicId) */
  bridgeId?: string;
}

/**
 * Options for executing a quote
 */
export interface ExecuteOptions {
  /** Signer to use for transaction */
  signer: ChainSigner;
  /** Recipient address (defaults to signer address) */
  recipient?: string;
  /** Enable automatic recovery handling */
  autoRecover?: boolean;
  /** Callback for status updates */
  onStatusChange?: (status: TransactionStatus) => void;
  /** Use direct RPC for same-chain swaps */
  directRpcFallback?: boolean;
  /** Gas limit override */
  gasLimit?: bigint | string;
  /** Gas price for legacy transactions */
  gasPrice?: bigint | string;
  /** Max fee per gas for EIP-1559 transactions */
  maxFeePerGas?: bigint | string;
  /** Max priority fee per gas for EIP-1559 transactions */
  maxPriorityFeePerGas?: bigint | string;
  /** Transaction nonce override */
  nonce?: number;
}

/**
 * Result of executing a quote
 */
export interface ExecuteResult {
  /** Source chain transaction hash */
  transactionHash: string;
  /** Request ID for tracking (undefined for external bridges and same-chain swaps) */
  requestId?: string;
  /** Route provider used (cross-curve, rubic, bungee) */
  provider: RouteProviderValue;
  /** Bridge-specific identifier (e.g., rubicId for Rubic tracking) */
  bridgeId?: string;
  /** Final status (present if autoRecover: true) */
  status?: TransactionStatus;
}

/**
 * Warning information during transaction processing
 */
export interface TransactionWarning {
  /** Warning type */
  type: 'inconsistency_slippage' | 'price_change' | 'insufficient_balance';
  /** Human-readable warning message */
  message: string;
}

/**
 * Recovery information for failed transactions
 */
export interface RecoveryInfo {
  /** Type of recovery needed */
  type: 'emergency' | 'retry' | 'inconsistency';
  /** Whether recovery is available */
  available: boolean;
}

/**
 * Transaction status from API
 */
export interface TransactionStatus {
  /** Overall transaction status */
  status: 'in progress' | 'completed' | 'failed' | 'reverted' | 'retry' | 'canceled';
  /** Whether inconsistency detected */
  inconsistency: boolean;
  /** Source chain information */
  source: {
    /** Source chain ID */
    chainId: number;
    /** Source transaction hash */
    transactionHash: string;
    /** Sender address */
    from: string;
    /** Transaction events */
    events: any[];
    /** Source transaction status */
    status: 'pending' | 'completed' | 'failed';
  };
  /** Oracle/relay information */
  oracle: {
    /** Relay chain ID */
    relayChainId: number;
    /** Request ID */
    requestId: string;
    /** Oracle status */
    status: 'in progress' | 'completed';
    /** Block height */
    height: number | null;
    /** Epoch number */
    epoch: number | null;
    /** Timestamp */
    time: number | null;
  };
  /** Destination chain information */
  destination: {
    /** Destination chain ID */
    chainId: number;
    /** Destination transaction hash (null if not yet executed) */
    transactionHash: string | null;
    /** Transaction events */
    events: any[];
    /** Emergency withdrawal available */
    emergency: boolean;
    /** Destination transaction status */
    status: 'pending' | 'in progress' | 'completed' | 'failed' | 'retry';
    /** Bridge-specific state data */
    bridgeState: Record<string, { txHash?: string | null }>;
  };
  /** Additional data from API */
  data: any;
  /** SDK-computed recovery information */
  recovery?: RecoveryInfo;
  /** SDK-generated warnings */
  warning?: TransactionWarning;
}
