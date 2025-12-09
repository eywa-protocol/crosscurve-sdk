/**
 * @fileoverview RecoveryService unit tests
 * @implements PRD Section 3.2 US-2 - Manual Recovery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecoveryService } from '../../../../src/application/services/RecoveryService.js';
import type { IApiClient, ITrackingService, IApprovalService } from '../../../../src/domain/interfaces/index.js';
import { createMockApiClient, mockResponses } from '../../../mocks/MockApiClient.js';
import { createMockTrackingService } from '../../../mocks/MockTrackingService.js';
import { createMockApprovalService } from '../../../mocks/MockApprovalService.js';
import { createMockSigner, TEST_ADDRESS } from '../../../mocks/MockSigner.js';
import { RouteProvider } from '../../../../src/constants/providers.js';
import type { TransactionStatus } from '../../../../src/types/index.js';

describe('RecoveryService', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let mockTrackingService: ReturnType<typeof createMockTrackingService>;
  let mockApprovalService: ReturnType<typeof createMockApprovalService>;
  let service: RecoveryService;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    mockTrackingService = createMockTrackingService();
    mockApprovalService = createMockApprovalService();
    service = new RecoveryService(
      mockApiClient as IApiClient,
      mockTrackingService as ITrackingService,
      mockApprovalService as IApprovalService,
      'exact'
    );
  });

  describe('recover', () => {
    it('should throw when no recovery is available', async () => {
      const mockSigner = createMockSigner();
      mockTrackingService.getTransactionStatus.mockResolvedValue({
        status: 'completed',
        inconsistency: false,
        source: { status: 'completed' },
        destination: { status: 'completed' },
        recovery: undefined,
      } as TransactionStatus);

      await expect(
        service.recover('0x' + 'a'.repeat(64), { signer: mockSigner })
      ).rejects.toThrow('No recovery available');
    });

    it('should throw when recovery.available is false', async () => {
      const mockSigner = createMockSigner();
      mockTrackingService.getTransactionStatus.mockResolvedValue({
        status: 'failed',
        inconsistency: false,
        source: { status: 'completed' },
        destination: { status: 'failed' },
        recovery: { available: false, type: 'emergency' },
      } as TransactionStatus);

      await expect(
        service.recover('0x' + 'a'.repeat(64), { signer: mockSigner })
      ).rejects.toThrow('No recovery available');
    });
  });

  describe('emergency recovery', () => {
    const emergencyStatus: TransactionStatus = {
      status: 'failed',
      inconsistency: false,
      source: { status: 'completed', txHash: '0xsource' },
      destination: { status: 'failed', emergency: true },
      recovery: { available: true, type: 'emergency' },
    };

    beforeEach(() => {
      mockTrackingService.getTransactionStatus.mockResolvedValue(emergencyStatus);
      mockApiClient.createEmergencyTransaction.mockResolvedValue(mockResponses.createTransaction);
    });

    it('should execute emergency recovery successfully', async () => {
      const mockSigner = createMockSigner();
      const requestId = '0x' + 'b'.repeat(64);

      const result = await service.recover(requestId, { signer: mockSigner });

      expect(mockApiClient.createEmergencyTransaction).toHaveBeenCalledWith({
        requestId,
        signature: expect.any(String),
      });
      expect(result.transactionHash).toBeDefined();
      expect(result.requestId).toBe(requestId);
      expect(result.provider).toBe(RouteProvider.CROSS_CURVE);
    });

    it('should sign message for emergency recovery', async () => {
      const mockSigner = createMockSigner();

      await service.recover('0x' + 'c'.repeat(64), { signer: mockSigner });

      expect(mockSigner.signMessage).toHaveBeenCalled();
    });

    it('should pass gas options to transaction', async () => {
      const mockSigner = createMockSigner();
      const gasOptions = {
        gasLimit: BigInt(500000),
        maxFeePerGas: BigInt(50000000000),
      };

      await service.recover('0x' + 'd'.repeat(64), {
        signer: mockSigner,
        ...gasOptions,
      });

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining(gasOptions)
      );
    });
  });

  describe('retry recovery', () => {
    const retryStatus: TransactionStatus = {
      status: 'failed',
      inconsistency: false,
      source: { status: 'completed', txHash: '0xsource' },
      destination: { status: 'retry' },
      recovery: { available: true, type: 'retry' },
    };

    beforeEach(() => {
      mockTrackingService.getTransactionStatus.mockResolvedValue(retryStatus);
      mockApiClient.createRetryTransaction.mockResolvedValue(mockResponses.createTransaction);
    });

    it('should execute retry recovery successfully', async () => {
      const mockSigner = createMockSigner();
      const requestId = '0x' + 'e'.repeat(64);

      const result = await service.recover(requestId, { signer: mockSigner });

      expect(mockApiClient.createRetryTransaction).toHaveBeenCalledWith({
        requestId,
        signature: expect.any(String),
      });
      expect(result.transactionHash).toBeDefined();
      expect(result.provider).toBe(RouteProvider.CROSS_CURVE);
    });
  });

  describe('inconsistency recovery', () => {
    const inconsistencyStatus: TransactionStatus = {
      status: 'failed',
      inconsistency: true,
      source: { status: 'completed', txHash: '0xsource' },
      destination: { status: 'failed' },
      recovery: { available: true, type: 'inconsistency' },
    };

    const inconsistencyParams = {
      params: {
        tokenIn: '0x' + '1'.repeat(40),
        amountIn: '500000000',
        chainIdIn: 42161,
        tokenOut: '0x' + '2'.repeat(40),
        chainIdOut: 10,
      },
    };

    beforeEach(() => {
      mockTrackingService.getTransactionStatus.mockResolvedValue(inconsistencyStatus);
      mockApiClient.getInconsistencyParams.mockResolvedValue(inconsistencyParams);
      mockApiClient.scanRoutes.mockResolvedValue([mockResponses.scanRoutes.routes[0] as any]);
      mockApiClient.createInconsistency.mockResolvedValue(mockResponses.createTransaction);
    });

    it('should require slippage for inconsistency resolution', async () => {
      const mockSigner = createMockSigner();

      await expect(
        service.recover('0x' + 'f'.repeat(64), { signer: mockSigner })
      ).rejects.toThrow('Slippage is required for inconsistency resolution');
    });

    it('should execute inconsistency recovery with slippage', async () => {
      const mockSigner = createMockSigner();
      const requestId = '0x' + 'f'.repeat(64);

      const result = await service.recover(requestId, {
        signer: mockSigner,
        slippage: 1.0,
      });

      expect(mockApiClient.getInconsistencyParams).toHaveBeenCalledWith(requestId);
      expect(mockApiClient.scanRoutes).toHaveBeenCalled();
      expect(mockApiClient.createInconsistency).toHaveBeenCalledWith({
        requestId,
        signature: expect.any(String),
        routing: expect.any(Object),
      });
      expect(result.transactionHash).toBeDefined();
    });

    it('should get new route for remaining amount', async () => {
      const mockSigner = createMockSigner();

      await service.recover('0x' + 'g'.repeat(64), {
        signer: mockSigner,
        slippage: 0.5,
      });

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith({
        params: inconsistencyParams.params,
        slippage: 0.5,
        from: TEST_ADDRESS,
      });
    });

    it('should emit warning with slippage info', async () => {
      const mockSigner = createMockSigner();
      const onStatusChange = vi.fn();

      await service.recover('0x' + 'h'.repeat(64), {
        signer: mockSigner,
        slippage: 1.5,
        onStatusChange,
      });

      expect(onStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          warning: expect.objectContaining({
            type: 'inconsistency_slippage',
            message: expect.stringContaining('1.5%'),
          }),
        })
      );
    });

    it('should throw when no routes available for resolution', async () => {
      const mockSigner = createMockSigner();
      mockApiClient.scanRoutes.mockResolvedValue([]);

      await expect(
        service.recover('0x' + 'i'.repeat(64), {
          signer: mockSigner,
          slippage: 0.5,
        })
      ).rejects.toThrow('No routes available for inconsistency resolution');
    });
  });

  describe('unknown recovery type', () => {
    it('should throw on unknown recovery type', async () => {
      const mockSigner = createMockSigner();
      mockTrackingService.getTransactionStatus.mockResolvedValue({
        status: 'failed',
        inconsistency: false,
        source: { status: 'completed' },
        destination: { status: 'failed' },
        recovery: { available: true, type: 'unknown_type' as any },
      } as TransactionStatus);

      await expect(
        service.recover('0x' + 'j'.repeat(64), { signer: mockSigner })
      ).rejects.toThrow('Unknown recovery type');
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      const mockSigner = createMockSigner();
      mockTrackingService.getTransactionStatus.mockResolvedValue({
        status: 'failed',
        inconsistency: false,
        source: { status: 'completed' },
        destination: { status: 'failed', emergency: true },
        recovery: { available: true, type: 'emergency' },
      } as TransactionStatus);
      mockApiClient.createEmergencyTransaction.mockRejectedValue(new Error('API Error'));

      await expect(
        service.recover('0x' + 'k'.repeat(64), { signer: mockSigner })
      ).rejects.toThrow('API Error');
    });

    it('should propagate transaction errors', async () => {
      const mockSigner = createMockSigner();
      mockTrackingService.getTransactionStatus.mockResolvedValue({
        status: 'failed',
        inconsistency: false,
        source: { status: 'completed' },
        destination: { status: 'failed', emergency: true },
        recovery: { available: true, type: 'emergency' },
      } as TransactionStatus);
      mockApiClient.createEmergencyTransaction.mockResolvedValue(mockResponses.createTransaction);
      mockSigner.sendTransaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        service.recover('0x' + 'l'.repeat(64), { signer: mockSigner })
      ).rejects.toThrow('Transaction failed');
    });
  });
});
