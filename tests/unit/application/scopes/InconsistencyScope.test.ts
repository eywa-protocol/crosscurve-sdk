/**
 * Unit tests for InconsistencyScope (Tier 2 API)
 *
 * @implements PRD Section 3.2 US-8 - Inconsistency Resolution
 * @implements PRD Section 5.1 - Tier 2 Flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InconsistencyScope } from '../../../../src/application/scopes/InconsistencyScope.js';
import type { IApiClient } from '../../../../src/domain/interfaces/index.js';
import type {
  InconsistencyGetResponse,
  InconsistencyCreateRequest,
  InconsistencyCreateResponse,
} from '../../../../src/types/api/index.js';
import { createMockApiClient } from '../../../mocks/MockApiClient.js';
import { crossChainQuote } from '../../../fixtures/quotes.js';

describe('InconsistencyScope', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let scope: InconsistencyScope;

  const testRequestId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const testSignature =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

  const mockInconsistencyParams: InconsistencyGetResponse = {
    params: {
      tokenIn: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      amountIn: '950000000',
      chainIdIn: 10,
      tokenOut: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      chainIdOut: 42161,
    },
    signature: testSignature,
  };

  const mockInconsistencyResponse: InconsistencyCreateResponse = {
    to: '0x3335733c454805df6a77f825f266e136FB4a3333',
    value: '0',
    data: '0xe1fcde8e0000000000000000000000000000000000000000000000000000000000000001',
  };

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    scope = new InconsistencyScope(mockApiClient as IApiClient);
  });

  describe('getParams', () => {
    it('should call apiClient.getInconsistencyParams with requestId', async () => {
      mockApiClient.getInconsistencyParams.mockResolvedValue(mockInconsistencyParams);

      const params = await scope.getParams(testRequestId);

      expect(mockApiClient.getInconsistencyParams).toHaveBeenCalledWith(testRequestId);
      expect(params).toBe(mockInconsistencyParams);
    });

    it('should return inconsistency parameters', async () => {
      mockApiClient.getInconsistencyParams.mockResolvedValue(mockInconsistencyParams);

      const params = await scope.getParams(testRequestId);

      expect(params.params.tokenIn).toBe('0x7F5c764cBc14f9669B88837ca1490cCa17c31607');
      expect(params.params.amountIn).toBe('950000000');
      expect(params.params.chainIdIn).toBe(10);
      expect(params.params.tokenOut).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
      expect(params.params.chainIdOut).toBe(42161);
      expect(params.signature).toBe(testSignature);
    });

    it('should propagate API errors for getParams', async () => {
      mockApiClient.getInconsistencyParams.mockRejectedValue(
        new Error('Inconsistency not found')
      );

      await expect(scope.getParams('invalid-request-id')).rejects.toThrow(
        'Inconsistency not found'
      );
    });

    it('should handle request with no inconsistency', async () => {
      mockApiClient.getInconsistencyParams.mockRejectedValue(
        new Error('No inconsistency for this request')
      );

      await expect(scope.getParams(testRequestId)).rejects.toThrow(
        'No inconsistency for this request'
      );
    });
  });

  describe('create', () => {
    it('should call apiClient.createInconsistency with request', async () => {
      mockApiClient.createInconsistency.mockResolvedValue(mockInconsistencyResponse);

      const request: InconsistencyCreateRequest = {
        requestId: testRequestId,
        signature: testSignature,
        routing: crossChainQuote,
      };

      const response = await scope.create(request);

      expect(mockApiClient.createInconsistency).toHaveBeenCalledWith(request);
      expect(response).toBe(mockInconsistencyResponse);
    });

    it('should return transaction data for resolution', async () => {
      mockApiClient.createInconsistency.mockResolvedValue(mockInconsistencyResponse);

      const request: InconsistencyCreateRequest = {
        requestId: testRequestId,
        signature: testSignature,
        routing: crossChainQuote,
      };

      const response = await scope.create(request);

      expect(response.to).toBe('0x3335733c454805df6a77f825f266e136FB4a3333');
      expect(response.value).toBe('0');
      expect(response.data).toBeDefined();
    });

    it('should pass permit data when provided', async () => {
      mockApiClient.createInconsistency.mockResolvedValue(mockInconsistencyResponse);

      const request: InconsistencyCreateRequest = {
        requestId: testRequestId,
        signature: testSignature,
        routing: crossChainQuote,
        permit: {
          v: 27,
          r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          s: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          deadline: 1700000000,
        },
      };

      await scope.create(request);

      expect(mockApiClient.createInconsistency).toHaveBeenCalledWith(request);
    });

    it('should return response with abi/args format', async () => {
      const responseWithAbi: InconsistencyCreateResponse = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        value: '0',
        abi: 'resolveInconsistency(address,uint256,bytes)',
        args: ['0x7F5c764cBc14f9669B88837ca1490cCa17c31607', '950000000', '0x'],
      };
      mockApiClient.createInconsistency.mockResolvedValue(responseWithAbi);

      const request: InconsistencyCreateRequest = {
        requestId: testRequestId,
        signature: testSignature,
        routing: crossChainQuote,
      };

      const response = await scope.create(request);

      expect(response.abi).toBe('resolveInconsistency(address,uint256,bytes)');
      expect(response.args).toBeDefined();
    });

    it('should propagate API errors for create', async () => {
      mockApiClient.createInconsistency.mockRejectedValue(
        new Error('Invalid signature')
      );

      const request: InconsistencyCreateRequest = {
        requestId: testRequestId,
        signature: 'invalid-signature',
        routing: crossChainQuote,
      };

      await expect(scope.create(request)).rejects.toThrow('Invalid signature');
    });

    it('should handle invalid routing quote', async () => {
      mockApiClient.createInconsistency.mockRejectedValue(
        new Error('Invalid routing parameters')
      );

      const request: InconsistencyCreateRequest = {
        requestId: testRequestId,
        signature: testSignature,
        routing: crossChainQuote,
      };

      await expect(scope.create(request)).rejects.toThrow('Invalid routing parameters');
    });
  });

  describe('getSignatureMessage', () => {
    it('should return signature message for requestId', () => {
      const message = scope.getSignatureMessage(testRequestId);

      expect(message).toBeInstanceOf(Uint8Array);
      expect(message.length).toBeGreaterThan(0);
    });

    it('should encode message as UTF-8', () => {
      const message = scope.getSignatureMessage(testRequestId);
      const decoded = new TextDecoder().decode(message);

      expect(decoded).toContain('CrossCurve Recovery:');
      expect(decoded).toContain(testRequestId);
    });

    it('should return consistent message for same requestId', () => {
      const message1 = scope.getSignatureMessage(testRequestId);
      const message2 = scope.getSignatureMessage(testRequestId);

      expect(message1).toEqual(message2);
    });

    it('should return different messages for different requestIds', () => {
      const requestId1 = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const requestId2 = '0x2222222222222222222222222222222222222222222222222222222222222222';

      const message1 = scope.getSignatureMessage(requestId1);
      const message2 = scope.getSignatureMessage(requestId2);

      expect(message1).not.toEqual(message2);
    });

    it('should handle short requestId', () => {
      const shortRequestId = '0x123';
      const message = scope.getSignatureMessage(shortRequestId);

      const decoded = new TextDecoder().decode(message);
      expect(decoded).toContain(shortRequestId);
    });
  });
});
