/**
 * @fileoverview Recovery-related types
 */

import type { ChainSigner } from './signer.js';
import type { TransactionStatus } from './transaction.js';

/**
 * Options for recovery operations
 */
export interface RecoveryOptions {
  /** Signer to use for recovery transaction */
  signer: ChainSigner;
  /** Slippage for inconsistency resolution (uses original quote's if not provided) */
  slippage?: number;
  /** Callback for status updates during recovery */
  onStatusChange?: (status: TransactionStatus) => void;
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
 * Recovery type classification
 */
export type RecoveryType = 'emergency' | 'retry' | 'inconsistency';
