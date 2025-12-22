/**
 * @fileoverview Inconsistency endpoint unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInconsistencyParams, createInconsistency } from '../../../../../src/infrastructure/api/endpoints/inconsistency.js';
import type { HttpClient } from '../../../../../src/infrastructure/api/client/index.js';
import type {
  InconsistencyGetResponse,
  InconsistencyCreateRequest,
  InconsistencyCreateResponse,
} from '../../../../../src/types/api/index.js';

describe('inconsistency endpoints', () => {
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;
  });

  describe('getInconsistencyParams', () => {
    it('should call GET /inconsistency/{requestId}', async () => {
      const requestId = '0xrequest123';

      const mockResponse: InconsistencyGetResponse = {
        params: {
          tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          amountIn: '500000000',
          chainIdIn: 42161,
          tokenOut: '0x0000000000000000000000000000000000000000',
          chainIdOut: 10,
        },
        signature: 'mock-signature',
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await getInconsistencyParams(mockClient, requestId);

      expect(mockClient.get).toHaveBeenCalledWith('/inconsistency/0xrequest123');
      expect(result).toEqual(mockResponse);
    });

    it('should return params for inconsistency resolution', async () => {
      const mockResponse: InconsistencyGetResponse = {
        params: {
          tokenIn: '0xTokenIn',
          amountIn: '1000000',
          chainIdIn: 1,
          tokenOut: '0xTokenOut',
          chainIdOut: 137,
        },
        signature: 'sig123',
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await getInconsistencyParams(mockClient, '0xtest');

      expect(result.params.tokenIn).toBe('0xTokenIn');
      expect(result.params.chainIdIn).toBe(1);
      expect(result.params.chainIdOut).toBe(137);
    });
  });

  describe('createInconsistency', () => {
    it('should call POST /inconsistency with request', async () => {
      const request: InconsistencyCreateRequest = {
        requestId: '0xrequest456',
        signature: '0xsignature789',
        routing: {
          route: [],
          amountIn: '500000000',
          amountOut: '499000000',
          deliveryFee: { amount: '50000', usd: 0.05 },
          txs: [],
          signature: 'routing-sig',
        },
      };

      const mockResponse: InconsistencyCreateResponse = {
        to: '0xContractAddress',
        value: '0',
        data: '0xinconsistencyCalldata',
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await createInconsistency(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/inconsistency', request);
      expect(result).toEqual(mockResponse);
    });

    it('should pass permit signature when provided', async () => {
      const request: InconsistencyCreateRequest = {
        requestId: '0xrequest456',
        signature: '0xsignature789',
        routing: {
          route: [],
          amountIn: '500000000',
          amountOut: '499000000',
          deliveryFee: { amount: '50000', usd: 0.05 },
          txs: [],
          signature: 'routing-sig',
        },
        permit: {
          v: 28,
          r: '0xr123',
          s: '0xs456',
          deadline: 1700000000,
        },
      };

      vi.mocked(mockClient.post).mockResolvedValue({ to: '0x', value: '0' });

      await createInconsistency(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/inconsistency', expect.objectContaining({
        permit: expect.objectContaining({
          v: 28,
          deadline: 1700000000,
        }),
      }));
    });

    it('should return response with abi and args', async () => {
      const request: InconsistencyCreateRequest = {
        requestId: '0xrequest',
        signature: '0xsig',
        routing: {
          route: [],
          amountIn: '100',
          amountOut: '99',
          deliveryFee: { amount: '1', usd: 0.001 },
          txs: [],
          signature: 'sig',
        },
      };

      const mockResponse: InconsistencyCreateResponse = {
        to: '0xContract',
        value: '1000',
        abi: 'resolveInconsistency(bytes32,bytes,tuple)',
        args: ['0xrequest', '0xsig', { route: [] }],
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await createInconsistency(mockClient, request);

      expect(result.abi).toBe('resolveInconsistency(bytes32,bytes,tuple)');
      expect(result.args).toHaveLength(3);
    });
  });
});
