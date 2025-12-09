/**
 * @fileoverview Mock implementation of ITrackingService for testing
 */

import { vi } from 'vitest';
import type { ITrackingService } from '../../src/domain/interfaces/index.js';
import type { TransactionStatus, TrackingOptions } from '../../src/types/transaction.js';

/**
 * Creates a mock ITrackingService with all methods mocked
 */
export function createMockTrackingService(): ITrackingService & {
  getTransactionStatus: ReturnType<typeof vi.fn>;
  searchTransactions: ReturnType<typeof vi.fn>;
} {
  return {
    getTransactionStatus: vi
      .fn<[string, TrackingOptions?], Promise<TransactionStatus>>()
      .mockResolvedValue({
        status: 'pending',
        inconsistency: false,
        source: { status: 'pending' },
        destination: { status: 'pending' },
      }),
    searchTransactions: vi.fn<[string], Promise<TransactionStatus[]>>().mockResolvedValue([]),
  };
}

/**
 * Default mock statuses for common test scenarios
 */
export const mockStatuses = {
  pending: {
    status: 'pending',
    inconsistency: false,
    source: { status: 'pending' },
    destination: { status: 'pending' },
  } as TransactionStatus,

  completed: {
    status: 'completed',
    inconsistency: false,
    source: {
      status: 'completed',
      txHash: '0xabc123',
    },
    destination: {
      status: 'completed',
      txHash: '0xdef456',
    },
  } as TransactionStatus,

  failed: {
    status: 'failed',
    inconsistency: false,
    source: {
      status: 'completed',
      txHash: '0xabc123',
    },
    destination: { status: 'failed' },
  } as TransactionStatus,

  inconsistent: {
    status: 'failed',
    inconsistency: true,
    source: {
      status: 'completed',
      txHash: '0xabc123',
    },
    destination: { status: 'failed' },
    recovery: {
      available: true,
      type: 'inconsistency',
    },
  } as TransactionStatus,
};
