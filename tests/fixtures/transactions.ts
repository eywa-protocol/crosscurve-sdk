/**
 * @fileoverview Transaction test fixtures
 */

import type { TransactionStatus } from '../../src/types/transaction.js';

/**
 * Pending transaction status
 */
export const pendingStatus: TransactionStatus = {
  status: 'pending',
  inconsistency: false,
  source: {
    status: 'pending',
  },
  destination: {
    status: 'pending',
  },
};

/**
 * In-progress transaction (source confirmed, destination pending)
 */
export const inProgressStatus: TransactionStatus = {
  status: 'pending',
  inconsistency: false,
  source: {
    status: 'completed',
    txHash: '0x' + 'a'.repeat(64),
  },
  destination: {
    status: 'pending',
  },
};

/**
 * Completed transaction status
 */
export const completedStatus: TransactionStatus = {
  status: 'completed',
  inconsistency: false,
  source: {
    status: 'completed',
    txHash: '0x' + 'a'.repeat(64),
  },
  destination: {
    status: 'completed',
    txHash: '0x' + 'b'.repeat(64),
  },
};

/**
 * Failed transaction status
 */
export const failedStatus: TransactionStatus = {
  status: 'failed',
  inconsistency: false,
  source: {
    status: 'completed',
    txHash: '0x' + 'a'.repeat(64),
  },
  destination: {
    status: 'failed',
  },
};

/**
 * Reverted transaction status
 */
export const revertedStatus: TransactionStatus = {
  status: 'reverted',
  inconsistency: false,
  source: {
    status: 'failed',
  },
  destination: {
    status: 'pending',
  },
};

/**
 * Canceled transaction status
 */
export const canceledStatus: TransactionStatus = {
  status: 'canceled',
  inconsistency: false,
  source: {
    status: 'canceled',
  },
  destination: {
    status: 'pending',
  },
};

/**
 * Inconsistency status with recovery available
 */
export const inconsistencyStatus: TransactionStatus = {
  status: 'failed',
  inconsistency: true,
  source: {
    status: 'completed',
    txHash: '0x' + 'a'.repeat(64),
  },
  destination: {
    status: 'failed',
  },
  recovery: {
    available: true,
    type: 'inconsistency',
  },
};

/**
 * Status with warning
 */
export const statusWithWarning: TransactionStatus = {
  status: 'pending',
  inconsistency: false,
  source: {
    status: 'pending',
  },
  destination: {
    status: 'pending',
  },
  warning: {
    type: 'inconsistency_slippage',
    message: 'Using 1% slippage for inconsistency resolution',
  },
};

/**
 * Same-chain transaction status (no destination tracking needed)
 */
export const sameChainStatus: TransactionStatus = {
  status: 'completed',
  inconsistency: false,
  source: {
    status: 'completed',
    txHash: '0x' + 'a'.repeat(64),
  },
  destination: {
    status: 'completed',
    txHash: '0x' + 'a'.repeat(64), // Same as source for same-chain
  },
};
