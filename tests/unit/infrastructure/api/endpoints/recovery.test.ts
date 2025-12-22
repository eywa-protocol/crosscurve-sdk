/**
 * @fileoverview Recovery endpoint unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmergencyTransaction, createRetryTransaction } from '../../../../../src/infrastructure/api/endpoints/recovery.js';
import type { HttpClient } from '../../../../../src/infrastructure/api/client/index.js';
import type { TxCreateEmergencyRequest, TxCreateRetryRequest, TxCreateResponse } from '../../../../../src/types/api/index.js';

describe('recovery endpoints', () => {
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;
  });

  describe('createEmergencyTransaction', () => {
    it('should call POST /tx/create/emergency with request', async () => {
      const request: TxCreateEmergencyRequest = {
        requestId: '0xrequest123',
        signature: '0xsignature456',
      };

      const mockResponse: TxCreateResponse = {
        to: '0xContractAddress',
        value: '1000000000000000000',
        data: '0xemergencyCalldata',
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await createEmergencyTransaction(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/tx/create/emergency', request);
      expect(result).toEqual(mockResponse);
    });

    it('should return response with abi and args when buildCalldata is false', async () => {
      const request: TxCreateEmergencyRequest = {
        requestId: '0xrequest123',
        signature: '0xsignature456',
      };

      const mockResponse: TxCreateResponse = {
        to: '0xContractAddress',
        value: '0',
        abi: 'emergencyWithdraw(bytes32,bytes)',
        args: ['0xrequest123', '0xsignature456'],
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await createEmergencyTransaction(mockClient, request);

      expect(result.abi).toBe('emergencyWithdraw(bytes32,bytes)');
      expect(result.args).toHaveLength(2);
    });
  });

  describe('createRetryTransaction', () => {
    it('should call POST /tx/create/retry with request', async () => {
      const request: TxCreateRetryRequest = {
        requestId: '0xrequest789',
        signature: '0xsignatureabc',
      };

      const mockResponse: TxCreateResponse = {
        to: '0xContractAddress',
        value: '0',
        data: '0xretryCalldata',
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await createRetryTransaction(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/tx/create/retry', request);
      expect(result).toEqual(mockResponse);
    });

    it('should handle response without data field', async () => {
      const request: TxCreateRetryRequest = {
        requestId: '0xrequest789',
        signature: '0xsignatureabc',
      };

      const mockResponse: TxCreateResponse = {
        to: '0xContractAddress',
        value: '500000000000000000',
        abi: 'retry(bytes32,bytes)',
        args: ['0xrequest789', '0xsignatureabc'],
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await createRetryTransaction(mockClient, request);

      expect(result.data).toBeUndefined();
      expect(result.abi).toBeDefined();
    });
  });
});
