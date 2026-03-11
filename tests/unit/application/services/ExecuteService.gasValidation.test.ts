/**
 * @fileoverview Tests for gas parameter validation in ExecuteService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecuteService } from '../../../../src/application/services/ExecuteService.js';
import { ValidationError } from '../../../../src/infrastructure/api/errors/index.js';
import type { Quote, ExecuteOptions } from '../../../../src/types/index.js';
import type { ChainSigner } from '../../../../src/types/signer.js';

// Mock dependencies
const mockApiClient = {
  scanRoutes: vi.fn(),
  createTransaction: vi.fn(),
  getTransaction: vi.fn(),
  searchTransactions: vi.fn(),
} as any;

const mockTrackingService = {
  getTransactionStatus: vi.fn(),
} as any;

const mockRecoveryService = {
  recover: vi.fn(),
} as any;

const mockApprovalService = {
  handleApproval: vi.fn(),
} as any;

const mockSigner: ChainSigner = {
  getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
  signMessage: vi.fn(),
  signTypedData: vi.fn(),
  sendTransaction: vi.fn().mockResolvedValue({
    hash: '0xabc',
    wait: vi.fn().mockResolvedValue({ status: 1, logs: [] }),
  }),
  call: vi.fn(),
};

const mockQuote: Quote = {
  amountIn: '1000000',
  amountOut: '990000',
  amountOutMin: '980000',
  route: [],
  txs: [],
  executionTime: 300,
  tags: [],
  warnings: [],
};

describe('ExecuteService gas validation', () => {
  let service: ExecuteService;
  let baseOptions: ExecuteOptions;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ExecuteService(
      mockApiClient,
      mockTrackingService,
      mockRecoveryService,
      mockApprovalService,
      'exact',
      false,
      () => '0xRouterAddress',
      undefined
    );

    baseOptions = {
      signer: mockSigner,
      autoRecover: false,
    };
  });

  describe('gasLimit validation', () => {
    it('should reject zero gasLimit', async () => {
      const options = { ...baseOptions, gasLimit: 0n };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow(ValidationError);

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('gasLimit must be positive');
    });

    it('should reject negative gasLimit', async () => {
      const options = { ...baseOptions, gasLimit: '-1' };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow(ValidationError);
    });

    it('should reject gasLimit exceeding maximum', async () => {
      const options = { ...baseOptions, gasLimit: 50000000n };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('exceeds maximum allowed');
    });
  });

  describe('gasPrice validation', () => {
    it('should reject zero gasPrice', async () => {
      const options = { ...baseOptions, gasPrice: 0n };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('gasPrice must be positive');
    });

    it('should reject gasPrice exceeding maximum', async () => {
      const options = { ...baseOptions, gasPrice: 100000000000000n }; // > 10000 gwei

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('exceeds maximum allowed');
    });
  });

  describe('maxFeePerGas validation', () => {
    it('should reject zero maxFeePerGas', async () => {
      const options = { ...baseOptions, maxFeePerGas: 0n };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('maxFeePerGas must be positive');
    });

    it('should reject maxFeePerGas exceeding maximum', async () => {
      const options = { ...baseOptions, maxFeePerGas: 100000000000000n };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('exceeds maximum allowed');
    });
  });

  describe('maxPriorityFeePerGas validation', () => {
    it('should reject zero maxPriorityFeePerGas', async () => {
      const options = { ...baseOptions, maxPriorityFeePerGas: 0n };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('maxPriorityFeePerGas must be positive');
    });

    it('should reject maxPriorityFeePerGas exceeding maximum', async () => {
      const options = { ...baseOptions, maxPriorityFeePerGas: 100000000000000n };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('exceeds maximum allowed');
    });
  });

  describe('EIP-1559 consistency', () => {
    it('should reject maxPriorityFeePerGas exceeding maxFeePerGas', async () => {
      const options = {
        ...baseOptions,
        maxFeePerGas: 100000000000n,  // 100 gwei
        maxPriorityFeePerGas: 200000000000n,  // 200 gwei
      };

      await expect(service.executeQuote(mockQuote, options))
        .rejects.toThrow('maxPriorityFeePerGas cannot exceed maxFeePerGas');
    });

    it('should allow maxPriorityFeePerGas equal to maxFeePerGas', async () => {
      mockApiClient.createTransaction.mockResolvedValue({
        to: '0xRouter',
        value: '0',
        args: [],
      });

      const options = {
        ...baseOptions,
        maxFeePerGas: 100000000000n,
        maxPriorityFeePerGas: 100000000000n,
      };

      // Should not throw on gas validation (may throw later for other reasons)
      // We just verify it gets past gas validation
      try {
        await service.executeQuote(mockQuote, options);
      } catch (error) {
        // If it throws, it should NOT be a gas validation error
        expect((error as Error).message).not.toContain('maxPriorityFeePerGas cannot exceed');
      }
    });
  });
});
