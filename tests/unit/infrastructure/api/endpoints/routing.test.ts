/**
 * @fileoverview Routing endpoint unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanRoutes } from '../../../../../src/infrastructure/api/endpoints/routing.js';
import type { HttpClient } from '../../../../../src/infrastructure/api/client/index.js';
import type { RoutingScanRequest, RoutingScanResponse } from '../../../../../src/types/api/index.js';

describe('routing endpoints', () => {
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;
  });

  describe('scanRoutes', () => {
    it('should call POST /routing/scan with request', async () => {
      const request: RoutingScanRequest = {
        params: {
          tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          amountIn: '1000000000',
          chainIdIn: 42161,
          tokenOut: '0x0000000000000000000000000000000000000000',
          chainIdOut: 10,
        },
        slippage: 0.5,
        from: '0x1234567890123456789012345678901234567890',
      };

      const mockResponse: RoutingScanResponse = [
        {
          route: [],
          amountIn: '1000000000',
          amountOut: '999000000',
          deliveryFee: { amount: '100000', usd: 0.1 },
          txs: [],
          signature: 'mock-signature',
        },
      ];

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await scanRoutes(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/routing/scan', request);
      expect(result).toEqual(mockResponse);
    });

    it('should pass through provider filters', async () => {
      const request: RoutingScanRequest = {
        params: {
          tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          amountIn: '1000000000',
          chainIdIn: 42161,
          tokenOut: '0x0000000000000000000000000000000000000000',
          chainIdOut: 10,
        },
        slippage: 0.5,
        providers: ['cross-curve', 'rubic'],
      };

      vi.mocked(mockClient.post).mockResolvedValue([]);

      await scanRoutes(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/routing/scan', request);
    });

    it('should pass feeFromAmount option', async () => {
      const request: RoutingScanRequest = {
        params: {
          tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          amountIn: '1000000000',
          chainIdIn: 42161,
          tokenOut: '0x0000000000000000000000000000000000000000',
          chainIdOut: 10,
        },
        slippage: 0.5,
        feeFromAmount: true,
      };

      vi.mocked(mockClient.post).mockResolvedValue([]);

      await scanRoutes(mockClient, request);

      expect(mockClient.post).toHaveBeenCalledWith('/routing/scan', expect.objectContaining({
        feeFromAmount: true,
      }));
    });
  });
});
