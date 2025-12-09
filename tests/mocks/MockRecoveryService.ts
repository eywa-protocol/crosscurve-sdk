/**
 * @fileoverview Mock implementation of IRecoveryService for testing
 */

import { vi } from 'vitest';
import type { IRecoveryService } from '../../src/domain/interfaces/index.js';
import type { ExecuteResult, RecoveryOptions } from '../../src/types/index.js';

/**
 * Creates a mock IRecoveryService with all methods mocked
 */
export function createMockRecoveryService(): IRecoveryService & {
  recover: ReturnType<typeof vi.fn>;
} {
  return {
    recover: vi
      .fn<[string, RecoveryOptions], Promise<ExecuteResult>>()
      .mockResolvedValue({
        transactionHash: '0x' + 'r'.repeat(64),
        requestId: '0x' + 's'.repeat(64),
        status: {
          status: 'completed',
          inconsistency: false,
          source: { status: 'completed', txHash: '0x' + 'r'.repeat(64) },
          destination: { status: 'completed', txHash: '0x' + 't'.repeat(64) },
        },
      }),
  };
}
