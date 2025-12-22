/**
 * @fileoverview Search endpoint unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTransactions } from '../../../../../src/infrastructure/api/endpoints/search.js';
import type { HttpClient } from '../../../../../src/infrastructure/api/client/index.js';
import type { SearchResponse } from '../../../../../src/types/api/index.js';

describe('search endpoints', () => {
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;
  });

  describe('searchTransactions', () => {
    it('should call GET /search with query parameter', async () => {
      const query = '0x1234567890123456789012345678901234567890';

      const mockResponse: SearchResponse = {
        transactions: [
          {
            requestId: '0xrequest1',
            status: 'completed',
            sourceChainId: 42161,
            destinationChainId: 10,
            sourceTransactionHash: '0xsource1',
          },
        ],
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await searchTransactions(mockClient, query);

      expect(mockClient.get).toHaveBeenCalledWith('/search', { search: query });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty results', async () => {
      const mockResponse: SearchResponse = {
        transactions: [],
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await searchTransactions(mockClient, 'nonexistent');

      expect(result.transactions).toHaveLength(0);
    });

    it('should search by transaction hash', async () => {
      const txHash = '0xabc123def456';

      const mockResponse: SearchResponse = {
        transactions: [
          {
            requestId: '0xrequest',
            status: 'in progress',
            sourceChainId: 1,
            destinationChainId: 137,
            sourceTransactionHash: txHash,
          },
        ],
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await searchTransactions(mockClient, txHash);

      expect(mockClient.get).toHaveBeenCalledWith('/search', { search: txHash });
      expect(result.transactions[0].sourceTransactionHash).toBe(txHash);
    });

    it('should search by address', async () => {
      const address = '0x1234567890123456789012345678901234567890';

      const mockResponse: SearchResponse = {
        transactions: [
          {
            requestId: '0xreq1',
            status: 'completed',
            sourceChainId: 42161,
            destinationChainId: 10,
            sourceTransactionHash: '0xtx1',
          },
          {
            requestId: '0xreq2',
            status: 'failed',
            sourceChainId: 42161,
            destinationChainId: 1,
            sourceTransactionHash: '0xtx2',
          },
        ],
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await searchTransactions(mockClient, address);

      expect(result.transactions).toHaveLength(2);
    });

    it('should search by request ID', async () => {
      const requestId = '0xrequestid123';

      const mockResponse: SearchResponse = {
        transactions: [
          {
            requestId,
            status: 'completed',
            sourceChainId: 56,
            destinationChainId: 42161,
            sourceTransactionHash: '0xtx',
          },
        ],
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await searchTransactions(mockClient, requestId);

      expect(result.transactions[0].requestId).toBe(requestId);
    });
  });
});
