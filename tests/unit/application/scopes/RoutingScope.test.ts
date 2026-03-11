/**
 * Unit tests for RoutingScope (Tier 2 API)
 *
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoutingScope } from '../../../../src/application/scopes/RoutingScope.js';
import type { IApiClient } from '../../../../src/domain/interfaces/index.js';
import type { RoutingScanRequest } from '../../../../src/types/api/index.js';
import type { StreamedRoute } from '../../../../src/types/index.js';
import { createMockApiClient } from '../../../mocks/MockApiClient.js';
import { crossChainQuote, createMockQuote, rubicQuote, bungeeQuote } from '../../../fixtures/quotes.js';

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

  describe('scanStream', () => {
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

    it('should yield StreamedRoute objects from NDJSON stream', async () => {
      const mockQuote = createMockQuote();
      const mockStream = async function* () {
        yield { quote: mockQuote } as StreamedRoute;
        yield { error: 'simulation failed' } as StreamedRoute;
      };
      mockApiClient.scanRoutesStream = vi.fn().mockReturnValue(mockStream());

      const results: StreamedRoute[] = [];
      for await (const item of scope.scanStream(request)) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
      expect(results[0].quote).toBeDefined();
      expect(results[0].quote).toEqual(mockQuote);
      expect(results[1].error).toBe('simulation failed');
    });

    it('should pass request and signal to apiClient', async () => {
      const controller = new AbortController();
      const mockStream = async function* () {
        // empty stream
      };
      mockApiClient.scanRoutesStream = vi.fn().mockReturnValue(mockStream());

      const results: StreamedRoute[] = [];
      for await (const item of scope.scanStream(request, controller.signal)) {
        results.push(item);
      }

      expect(mockApiClient.scanRoutesStream).toHaveBeenCalledWith(request, controller.signal);
      expect(results).toHaveLength(0);
    });

    it('should handle stream with only quotes', async () => {
      const quote1 = createMockQuote({ amountOut: '990000' });
      const quote2 = createMockQuote({ amountOut: '980000' });
      const mockStream = async function* () {
        yield { quote: quote1 } as StreamedRoute;
        yield { quote: quote2 } as StreamedRoute;
      };
      mockApiClient.scanRoutesStream = vi.fn().mockReturnValue(mockStream());

      const results: StreamedRoute[] = [];
      for await (const item of scope.scanStream(request)) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
      expect(results[0].quote).toEqual(quote1);
      expect(results[1].quote).toEqual(quote2);
      expect(results.every(r => r.error === undefined)).toBe(true);
    });

    it('should handle stream with only errors', async () => {
      const mockStream = async function* () {
        yield { error: 'provider timeout' } as StreamedRoute;
        yield { error: 'rate limited' } as StreamedRoute;
      };
      mockApiClient.scanRoutesStream = vi.fn().mockReturnValue(mockStream());

      const results: StreamedRoute[] = [];
      for await (const item of scope.scanStream(request)) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
      expect(results[0].error).toBe('provider timeout');
      expect(results[1].error).toBe('rate limited');
      expect(results.every(r => r.quote === undefined)).toBe(true);
    });
  });
});
