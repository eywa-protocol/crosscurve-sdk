/**
 * @fileoverview Transaction execution and status types
 */

import type { ChainSigner } from './signer.js';
import type { RouteProviderValue } from '../constants/providers.js';

/**
 * Blockchain transaction log event
 */
export interface TransactionEvent {
  /** Event name or signature */
  eventName?: string;
  /** Event topics (indexed parameters) */
  topics?: string[];
  /** Event data (non-indexed parameters) */
  data?: string;
  /** Log index in block */
  logIndex?: number;
  /** Transaction hash this event belongs to */
  transactionHash?: string;
  /** Block number where event was emitted */
  blockNumber?: number;
  /** Decoded event arguments (if available) */
  args?: Record<string, unknown>;
}

/**
 * Additional transaction metadata from API
 */
export interface TransactionMetadata {
  /** Timestamp of transaction */
  timestamp?: number;
  /** Gas used */
  gasUsed?: string;
  /** Effective gas price */
  effectiveGasPrice?: string;
  /** Additional provider-specific data */
  [key: string]: unknown;
}

/**
 * Options for tracking a transaction
 */
export interface TrackingOptions {
  /** Provider used for the transaction */
  provider?: RouteProviderValue;
  /** Bridge-specific identifier (e.g., rubicId) */
  bridgeId?: string;
  /** Source chain ID */
  chainId?: number;
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
    events: TransactionEvent[];
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
    events: TransactionEvent[];
    /** Emergency withdrawal available */
    emergency: boolean;
    /** Destination transaction status */
    status: 'pending' | 'in progress' | 'completed' | 'failed' | 'retry';
    /** Bridge-specific state data */
    bridgeState: Record<string, { txHash?: string | null }>;
  };
  /** Additional metadata from API */
  data?: TransactionMetadata;
  /** SDK-computed recovery information */
  recovery?: RecoveryInfo;
  /** SDK-generated warnings */
  warning?: TransactionWarning;
}

/**
 * Response from calldataOnly transaction creation mode
 * Returns raw calldata for integrators who manage their own tx submission
 */
export interface CalldataOnlyResponse {
  to: string;
  data: string;
  value: string;
  chainId: number;
  feeToken: string;
  executionPrice: string;
}

/**
 * Parameters for registering an external transaction for tracking
 */
export interface SubmitExternalParams {
  txHash: string;
  provider: 'rubic' | 'bungee';
  fromChainId: number;
  toChainId: number;
  sender: string;
}

/**
 * Response from external transaction registration
 */
export interface SubmitExternalResponse {
  requestId: string;
}
