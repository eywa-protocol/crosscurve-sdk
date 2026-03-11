/**
 * Unit tests for TxScope (Tier 2 API)
 *
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TxScope } from '../../../../src/application/scopes/TxScope.js';
import type { IApiClient } from '../../../../src/domain/interfaces/index.js';
import type { TxCreateRequest, TxCreateResponse } from '../../../../src/types/api/index.js';
import type { CalldataOnlyResponse } from '../../../../src/types/transaction.js';
import { createMockApiClient } from '../../../mocks/MockApiClient.js';
import { crossChainQuote } from '../../../fixtures/quotes.js';

describe('TxScope', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let scope: TxScope;

  const mockTxResponse: TxCreateResponse = {
    to: '0x3335733c454805df6a77f825f266e136FB4a3333',
    value: '0',
    data: '0xe1fcde8e0000000000000000000000000000000000000000000000000000000000000001',
  };

  const testRequestId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const testSignature =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    scope = new TxScope(mockApiClient as IApiClient);
  });

  describe('create', () => {
    it('should call apiClient.createTransaction with request', async () => {
      mockApiClient.createTransaction.mockResolvedValue(mockTxResponse);

      const request: TxCreateRequest = {
        from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        recipient: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        routing: crossChainQuote,
        buildCalldata: false,
      };

      const response = await scope.create(request);

      expect(mockApiClient.createTransaction).toHaveBeenCalledWith(request);
      expect(response).toBe(mockTxResponse);
    });

    it('should pass permit data when provided', async () => {
      mockApiClient.createTransaction.mockResolvedValue(mockTxResponse);

      const request: TxCreateRequest = {
        from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        recipient: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        routing: crossChainQuote,
        permit: {
          v: 27,
          r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          s: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        },
      };

      await scope.create(request);

      expect(mockApiClient.createTransaction).toHaveBeenCalledWith(request);
    });

    it('should return response with abi/args when buildCalldata is false', async () => {
      const responseWithAbi: TxCreateResponse = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        value: '0',
        abi: 'executeOperation(address,uint256,bytes)',
        args: ['0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', '1000000000', '0x'],
      };
      mockApiClient.createTransaction.mockResolvedValue(responseWithAbi);

      const request: TxCreateRequest = {
        from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        recipient: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        routing: crossChainQuote,
        buildCalldata: false,
      };

      const response = await scope.create(request);

      expect(response.abi).toBe('executeOperation(address,uint256,bytes)');
      expect(response.args).toBeDefined();
      expect(response.data).toBeUndefined();
    });

    it('should return response with data when buildCalldata is true', async () => {
      mockApiClient.createTransaction.mockResolvedValue(mockTxResponse);

      const request: TxCreateRequest = {
        from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        recipient: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        routing: crossChainQuote,
        buildCalldata: true,
      };

      const response = await scope.create(request);

      expect(response.data).toBeDefined();
      expect(response.abi).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.createTransaction.mockRejectedValue(new Error('Invalid routing'));

      const request: TxCreateRequest = {
        from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        recipient: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        routing: crossChainQuote,
      };

      await expect(scope.create(request)).rejects.toThrow('Invalid routing');
    });
  });

  describe('createCalldata', () => {
    it('sends calldataOnly:true and returns CalldataOnlyResponse', async () => {
      const response: CalldataOnlyResponse = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0xabcdef',
        value: '0',
        chainId: 42161,
        feeToken: '0x1234567890123456789012345678901234567890',
        executionPrice: '1000',
      };
      mockApiClient.createCalldataOnly.mockResolvedValue(response);

      const result = await scope.createCalldata({
        from: '0x1234567890123456789012345678901234567890',
        recipient: '0x1234567890123456789012345678901234567890',
        routing: {} as any,
      });

      expect(result.chainId).toBe(42161);
      expect(result.executionPrice).toBe('1000');
    });
  });

  describe('createEmergency', () => {
    it('should call apiClient.createEmergencyTransaction with requestId and signature', async () => {
      mockApiClient.createEmergencyTransaction.mockResolvedValue(mockTxResponse);

      const response = await scope.createEmergency(testRequestId, testSignature);

      expect(mockApiClient.createEmergencyTransaction).toHaveBeenCalledWith({
        requestId: testRequestId,
        signature: testSignature,
      });
      expect(response).toBe(mockTxResponse);
    });

    it('should return transaction data for emergency withdrawal', async () => {
      const emergencyResponse: TxCreateResponse = {
        to: '0xEmergencyContract',
        value: '0',
        data: '0xemergencyWithdraw...',
      };
      mockApiClient.createEmergencyTransaction.mockResolvedValue(emergencyResponse);

      const response = await scope.createEmergency(testRequestId, testSignature);

      expect(response.to).toBe('0xEmergencyContract');
      expect(response.data).toContain('emergencyWithdraw');
    });

    it('should propagate API errors for emergency', async () => {
      mockApiClient.createEmergencyTransaction.mockRejectedValue(
        new Error('Emergency not available')
      );

      await expect(scope.createEmergency(testRequestId, testSignature)).rejects.toThrow(
        'Emergency not available'
      );
    });

    it('should handle invalid requestId', async () => {
      mockApiClient.createEmergencyTransaction.mockRejectedValue(
        new Error('Request ID not found')
      );

      await expect(
        scope.createEmergency('invalid-request-id', testSignature)
      ).rejects.toThrow('Request ID not found');
    });
  });

  describe('createRetry', () => {
    it('should call apiClient.createRetryTransaction with requestId and signature', async () => {
      mockApiClient.createRetryTransaction.mockResolvedValue(mockTxResponse);

      const response = await scope.createRetry(testRequestId, testSignature);

      expect(mockApiClient.createRetryTransaction).toHaveBeenCalledWith({
        requestId: testRequestId,
        signature: testSignature,
      });
      expect(response).toBe(mockTxResponse);
    });

    it('should return transaction data for retry', async () => {
      const retryResponse: TxCreateResponse = {
        to: '0xRetryContract',
        value: '1000000000000000',
        data: '0xretryOperation...',
      };
      mockApiClient.createRetryTransaction.mockResolvedValue(retryResponse);

      const response = await scope.createRetry(testRequestId, testSignature);

      expect(response.to).toBe('0xRetryContract');
      expect(response.value).toBe('1000000000000000');
    });

    it('should propagate API errors for retry', async () => {
      mockApiClient.createRetryTransaction.mockRejectedValue(new Error('Retry not available'));

      await expect(scope.createRetry(testRequestId, testSignature)).rejects.toThrow(
        'Retry not available'
      );
    });

    it('should handle transaction not in retry state', async () => {
      mockApiClient.createRetryTransaction.mockRejectedValue(
        new Error('Transaction not eligible for retry')
      );

      await expect(scope.createRetry(testRequestId, testSignature)).rejects.toThrow(
        'Transaction not eligible for retry'
      );
    });
  });
});
