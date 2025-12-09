/**
 * @fileoverview Mock implementation of IApprovalService for testing
 */

import { vi } from 'vitest';
import type { IApprovalService, ApprovalParams, ApprovalResult } from '../../src/domain/interfaces/index.js';

/**
 * Default mock approval results
 */
export const mockApprovalResults = {
  /** No approval needed (sufficient allowance or native token) */
  none: {
    needed: false,
    type: 'none' as const,
  } satisfies ApprovalResult,

  /** Permit signature was used */
  permit: {
    needed: true,
    type: 'permit' as const,
    permit: {
      v: 28,
      r: '0x' + 'a'.repeat(64),
      s: '0x' + 'b'.repeat(64),
      deadline: Math.floor(Date.now() / 1000) + 3600,
    },
  } satisfies ApprovalResult,

  /** Approve() transaction was used */
  approve: {
    needed: true,
    type: 'approve' as const,
    approvalTxHash: '0x' + 'c'.repeat(64),
  } satisfies ApprovalResult,
};

/**
 * Creates a mock IApprovalService with all methods mocked
 */
export function createMockApprovalService(): IApprovalService & {
  handleApproval: ReturnType<typeof vi.fn>;
} {
  return {
    handleApproval: vi
      .fn<[ApprovalParams], Promise<ApprovalResult>>()
      .mockResolvedValue(mockApprovalResults.none),
  };
}
