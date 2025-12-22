/**
 * @fileoverview Transaction endpoint unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransaction, getTransaction } from '../../../../../src/infrastructure/api/endpoints/transaction.js';
import type { HttpClient } from '../../../../../src/infrastructure/api/client/index.js';
import type { TxCreateRequest, TxCreateResponse, TransactionGetResponse } from '../../../../../src/types/api/index.js';

describe('transaction endpoints', () => {
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;
  });

  describe('createTransaction', () => {
    it('should call POST /tx/create with request', async () => {
      const request: TxCreateRequest = {
        from: '0x1234567890123456789012345678901234567890',
        recipient: '0x0987654321098765432109876543210987654321',
        routing: {
          route: [],
          amountIn: '1000000000',
          amountOut: '999000000',
          deliveryFee: { amount: '100000', usd: 0.1 },
          txs: [],
          signature: 'mock-signature',
        },
        buildCalldata: true,
      };

      const mockResponse: TxCreateResponse = {
        to: '0xContractAddress',
        value: '0',
        data: '0x1234abcd',
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await createTransaction(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/tx/create', request);
      expect(result).toEqual(mockResponse);
    });

    it('should pass permit signature when provided', async () => {
      const request: TxCreateRequest = {
        from: '0x1234567890123456789012345678901234567890',
        recipient: '0x0987654321098765432109876543210987654321',
        routing: {
          route: [],
          amountIn: '1000000000',
          amountOut: '999000000',
          deliveryFee: { amount: '100000', usd: 0.1 },
          txs: [],
          signature: 'mock-signature',
        },
        permit: {
          v: 27,
          r: '0xabc',
          s: '0xdef',
          deadline: 1700000000,
        },
      };

      vi.mocked(mockClient.post).mockResolvedValue({ to: '0x', value: '0' });

      await createTransaction(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/tx/create', expect.objectContaining({
        permit: expect.objectContaining({
          v: 27,
          r: '0xabc',
          s: '0xdef',
        }),
      }));
    });
  });

  describe('getTransaction', () => {
    it('should call GET /transaction/{requestId}', async () => {
      const requestId = '0xrequest123';

      const mockResponse: TransactionGetResponse = {
        status: 'completed',
        inconsistency: false,
        source: {
          chainId: 42161,
          transactionHash: '0xsource',
          from: '0x1234',
          events: [],
          status: 'completed',
        },
        oracle: {
          relayChainId: 1,
          requestId: '0xrequest123',
          status: 'completed',
          height: 1000,
          epoch: 1,
          time: 1700000000,
        },
        destination: {
          chainId: 10,
          transactionHash: '0xdest',
          events: [],
          emergency: false,
          status: 'completed',
          bridgeState: {},
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await getTransaction(mockClient, requestId);

      expect(mockClient.get).toHaveBeenCalledWith('/transaction/0xrequest123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle in-progress transactions', async () => {
      const mockResponse: TransactionGetResponse = {
        status: 'in progress',
        inconsistency: false,
        source: {
          chainId: 42161,
          transactionHash: '0xsource',
          from: '0x1234',
          events: [],
          status: 'completed',
        },
        oracle: {
          relayChainId: 1,
          requestId: '0xrequest123',
          status: 'in progress',
          height: null,
          epoch: null,
          time: null,
        },
        destination: {
          chainId: 10,
          transactionHash: null,
          events: [],
          emergency: false,
          status: 'pending',
          bridgeState: {},
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await getTransaction(mockClient, '0xrequest');

      expect(result.status).toBe('in progress');
      expect(result.destination.transactionHash).toBeNull();
    });
  });
});
