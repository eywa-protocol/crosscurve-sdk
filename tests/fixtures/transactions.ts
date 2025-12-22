/**
 * @fileoverview Transaction test fixtures
 */

import type { TransactionStatus } from '../../src/types/transaction.js';

/**
 * Base oracle info for test fixtures
 */
const baseOracle = {
  relayChainId: 43114,
  requestId: '0x' + 'f'.repeat(64),
  status: 'in progress' as const,
  height: null,
  epoch: null,
  time: null,
};

/**
 * Pending transaction status
 */
export const pendingStatus: TransactionStatus = {
  status: 'in progress',
  inconsistency: false,
  source: {
    chainId: 42161,
    transactionHash: '',
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'pending',
  },
  oracle: baseOracle,
  destination: {
    chainId: 10,
    transactionHash: null,
    events: [],
    emergency: false,
    status: 'pending',
    bridgeState: {},
  },
};

/**
 * In-progress transaction (source confirmed, destination pending)
 */
export const inProgressStatus: TransactionStatus = {
  status: 'in progress',
  inconsistency: false,
  source: {
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'completed',
  },
  oracle: baseOracle,
  destination: {
    chainId: 10,
    transactionHash: null,
    events: [],
    emergency: false,
    status: 'pending',
    bridgeState: {},
  },
};

/**
 * Completed transaction status
 */
export const completedStatus: TransactionStatus = {
  status: 'completed',
  inconsistency: false,
  source: {
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'completed',
  },
  oracle: { ...baseOracle, status: 'completed' as const },
  destination: {
    chainId: 10,
    transactionHash: '0x' + 'b'.repeat(64),
    events: [],
    emergency: false,
    status: 'completed',
    bridgeState: {},
  },
};

/**
 * Failed transaction status
 */
export const failedStatus: TransactionStatus = {
  status: 'failed',
  inconsistency: false,
  source: {
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'completed',
  },
  oracle: baseOracle,
  destination: {
    chainId: 10,
    transactionHash: null,
    events: [],
    emergency: false,
    status: 'failed',
    bridgeState: {},
  },
};

/**
 * Reverted transaction status
 */
export const revertedStatus: TransactionStatus = {
  status: 'reverted',
  inconsistency: false,
  source: {
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'failed',
  },
  oracle: baseOracle,
  destination: {
    chainId: 10,
    transactionHash: null,
    events: [],
    emergency: false,
    status: 'pending',
    bridgeState: {},
  },
};

/**
 * Canceled transaction status
 */
export const canceledStatus: TransactionStatus = {
  status: 'canceled',
  inconsistency: false,
  source: {
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'completed',
  },
  oracle: baseOracle,
  destination: {
    chainId: 10,
    transactionHash: null,
    events: [],
    emergency: false,
    status: 'pending',
    bridgeState: {},
  },
};

/**
 * Inconsistency status with recovery available
 */
export const inconsistencyStatus: TransactionStatus = {
  status: 'failed',
  inconsistency: true,
  source: {
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'completed',
  },
  oracle: baseOracle,
  destination: {
    chainId: 10,
    transactionHash: null,
    events: [],
    emergency: false,
    status: 'failed',
    bridgeState: {},
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
  status: 'in progress',
  inconsistency: false,
  source: {
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'pending',
  },
  oracle: baseOracle,
  destination: {
    chainId: 10,
    transactionHash: null,
    events: [],
    emergency: false,
    status: 'pending',
    bridgeState: {},
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
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
    events: [],
    status: 'completed',
  },
  oracle: { ...baseOracle, status: 'completed' as const },
  destination: {
    chainId: 42161,
    transactionHash: '0x' + 'a'.repeat(64),
    events: [],
    emergency: false,
    status: 'completed',
    bridgeState: {},
  },
};
