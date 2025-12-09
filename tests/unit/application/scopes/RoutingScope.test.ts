/**
 * Unit tests for RoutingScope (Tier 2 API)
 *
 * @implements PRD Section 3.2 US-4 - Custom Route Selection
 * @implements PRD Section 5.1 - Tier 2 Flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoutingScope } from '../../../../src/application/scopes/RoutingScope.js';
import type { IApiClient } from '../../../../src/domain/interfaces/index.js';
import type { RoutingScanRequest } from '../../../../src/types/api/index.js';
import { createMockApiClient } from '../../../mocks/MockApiClient.js';
import { crossChainQuote, rubicQuote, bungeeQuote } from '../../../fixtures/quotes.js';

describe('RoutingScope', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let scope: RoutingScope;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    scope = new RoutingScope(mockApiClient as IApiClient);
  });

  describe('scan', () => {
    it('should call apiClient.scanRoutes with request', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      const request: RoutingScanRequest = {
        params: {
          tokenIn: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          amountIn: '1000000000',
          chainIdIn: 42161,
          tokenOut: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
          chainIdOut: 10,
        },
        slippage: 0.5,
        from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
      };

      const routes = await scope.scan(request);

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(request);
      expect(routes).toEqual([crossChainQuote]);
    });

    it('should return multiple routes', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote, rubicQuote, bungeeQuote]);

      const request: RoutingScanRequest = {
        params: {
          tokenIn: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          amountIn: '1000000000',
          chainIdIn: 42161,
          tokenOut: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
          chainIdOut: 10,
        },
        slippage: 0.5,
      };

      const routes = await scope.scan(request);

      expect(routes).toHaveLength(3);
      expect(routes[0]).toBe(crossChainQuote);
      expect(routes[1]).toBe(rubicQuote);
      expect(routes[2]).toBe(bungeeQuote);
    });

    it('should return empty array when no routes found', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([]);

      const request: RoutingScanRequest = {
        params: {
          tokenIn: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          amountIn: '1000000000',
          chainIdIn: 42161,
          tokenOut: '0x0000000000000000000000000000000000000000',
          chainIdOut: 999999,
        },
        slippage: 0.5,
      };

      const routes = await scope.scan(request);

      expect(routes).toEqual([]);
    });

    it('should pass optional parameters', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      const request: RoutingScanRequest = {
        params: {
          tokenIn: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          amountIn: '1000000000',
          chainIdIn: 42161,
          tokenOut: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
          chainIdOut: 10,
        },
        slippage: 1.0,
        from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
        providers: ['rubic', 'bungee'],
        feeFromAmount: true,
        feeToken: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      };

      await scope.scan(request);

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(request);
    });

    it('should propagate API errors', async () => {
      mockApiClient.scanRoutes.mockRejectedValue(new Error('API Error'));

      const request: RoutingScanRequest = {
        params: {
          tokenIn: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          amountIn: '1000000000',
          chainIdIn: 42161,
          tokenOut: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
          chainIdOut: 10,
        },
        slippage: 0.5,
      };

      await expect(scope.scan(request)).rejects.toThrow('API Error');
    });
  });
});
