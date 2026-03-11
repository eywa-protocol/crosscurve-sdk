/**
 * @fileoverview QuoteService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuoteService } from '../../../../src/application/services/QuoteService.js';
import type { IApiClient } from '../../../../src/domain/interfaces/index.js';
import type { Quote, GetQuoteParams } from '../../../../src/types/index.js';
import { createMockApiClient } from '../../../mocks/MockApiClient.js';
import { crossChainQuote, sameChainQuote } from '../../../fixtures/quotes.js';

describe('QuoteService', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let service: QuoteService;

  const validParams: GetQuoteParams = {
    fromChain: 42161,
    toChain: 10,
    fromToken: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    toToken: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    amount: '1000000000',
    slippage: 0.5,
    sender: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
  };

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    service = new QuoteService(mockApiClient as IApiClient);
  });

  describe('getQuote', () => {
    it('should call scanRoutes with correct parameters', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await service.getQuote(validParams);

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith({
        params: {
          tokenIn: validParams.fromToken,
          amountIn: validParams.amount,
          chainIdIn: validParams.fromChain,
          tokenOut: validParams.toToken,
          chainIdOut: validParams.toChain,
        },
        slippage: validParams.slippage,
        from: validParams.sender,
        recipient: undefined,
        providers: undefined,
        feeFromAmount: undefined,
        feeToken: undefined,
      });
    });

    it('should return the best route', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      const result = await service.getQuote(validParams);

      expect(result).toBeDefined();
      expect(result.amountOut).toBe(crossChainQuote.amountOut);
    });

    it('should select route with highest output amount', async () => {
      const lowOutputQuote: Quote = {
        ...crossChainQuote,
        amountOut: '500000000',
      };
      const highOutputQuote: Quote = {
        ...crossChainQuote,
        amountOut: '1500000000',
      };

      mockApiClient.scanRoutes.mockResolvedValue([lowOutputQuote, highOutputQuote]);

      const result = await service.getQuote(validParams);

      expect(result.amountOut).toBe('1500000000');
    });

    it('should throw when no routes found', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([]);

      await expect(service.getQuote(validParams)).rejects.toThrow(
        'No routes found for the given parameters'
      );
    });

    it('should throw when routes is null', async () => {
      mockApiClient.scanRoutes.mockResolvedValue(null as any);

      await expect(service.getQuote(validParams)).rejects.toThrow(
        'No routes found for the given parameters'
      );
    });
  });

  describe('CAIP-2 chain identifiers', () => {
    it('should accept numeric chain IDs', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await service.getQuote({
        ...validParams,
        fromChain: 42161,
        toChain: 10,
      });

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            chainIdIn: 42161,
            chainIdOut: 10,
          }),
        })
      );
    });

    it('should accept CAIP-2 format chain identifiers', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await service.getQuote({
        ...validParams,
        fromChain: 'eip155:42161',
        toChain: 'eip155:10',
      });

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            chainIdIn: 42161,
            chainIdOut: 10,
          }),
        })
      );
    });

    it('should throw on invalid CAIP-2 format', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          fromChain: 'invalid:42161',
        })
      ).rejects.toThrow('Invalid chain identifier');
    });
  });

  describe('validation', () => {
    it('should throw on invalid slippage', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          slippage: 101,
        })
      ).rejects.toThrow();
    });

    it('should throw on negative slippage', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          slippage: -1,
        })
      ).rejects.toThrow();
    });

    it('should throw when slippage exceeds maxSlippage', async () => {
      await expect(service.getQuote({ ...validParams, slippage: 10 }, 5)).rejects.toThrow();
    });

    it('should throw on invalid amount', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          amount: '-1000',
        })
      ).rejects.toThrow();
    });

    it('should throw on zero amount', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          amount: '0',
        })
      ).rejects.toThrow();
    });

    it('should throw on invalid fromToken address', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          fromToken: 'invalid',
        })
      ).rejects.toThrow();
    });

    it('should throw on invalid toToken address', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          toToken: 'not-an-address',
        })
      ).rejects.toThrow();
    });

    it('should throw on invalid recipient address', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          recipient: 'bad-address',
        })
      ).rejects.toThrow();
    });

    it('should throw on invalid sender address', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          sender: 'bad-address',
        })
      ).rejects.toThrow();
    });

    it('should allow quote without sender', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      const paramsWithoutSender = { ...validParams };
      delete (paramsWithoutSender as any).sender;

      const result = await service.getQuote(paramsWithoutSender);

      expect(result).toBeDefined();
    });
  });

  describe('optional parameters', () => {
    it('should pass providers when specified', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await service.getQuote({
        ...validParams,
        providers: ['rubic', 'bungee'],
      });

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: ['rubic', 'bungee'],
        })
      );
    });

    it('passes recipient through to routing scan request', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await service.getQuote({
        ...validParams,
        recipient: '0x1111111111111111111111111111111111111111',
      });

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: '0x1111111111111111111111111111111111111111',
        })
      );
    });

    it('should pass fee parameters when specified', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await service.getQuote({
        ...validParams,
        feeFromAmount: true,
        feeToken: '0x' + 'a'.repeat(40),
      });

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          feeFromAmount: true,
          feeToken: '0x' + 'a'.repeat(40),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      mockApiClient.scanRoutes.mockRejectedValue(new Error('API Error'));

      await expect(service.getQuote(validParams)).rejects.toThrow('API Error');
    });
  });

  describe('feeShareBps parameter', () => {
    it('should pass feeShareBps to scanRoutes when provided', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await service.getQuote({
        ...validParams,
        feeShareBps: 50,
      });

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          feeShareBps: 50,
        })
      );
    });

    it('should not include feeShareBps when not provided', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await service.getQuote(validParams);

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          feeShareBps: undefined,
        })
      );
    });

    it('should use defaultFeeShareBps when per-request feeShareBps not provided', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);
      const serviceWithDefault = new QuoteService(mockApiClient as IApiClient, 100);

      await serviceWithDefault.getQuote(validParams);

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          feeShareBps: 100,
        })
      );
    });

    it('should override defaultFeeShareBps with per-request feeShareBps', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);
      const serviceWithDefault = new QuoteService(mockApiClient as IApiClient, 100);

      await serviceWithDefault.getQuote({
        ...validParams,
        feeShareBps: 50,
      });

      expect(mockApiClient.scanRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          feeShareBps: 50,
        })
      );
    });

    it('should reject negative feeShareBps', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          feeShareBps: -1,
        })
      ).rejects.toThrow('feeShareBps must be between 0 and 10000');
    });

    it('should reject feeShareBps over 10000', async () => {
      await expect(
        service.getQuote({
          ...validParams,
          feeShareBps: 10001,
        })
      ).rejects.toThrow('feeShareBps must be between 0 and 10000');
    });

    it('should accept feeShareBps at boundary 0', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await expect(
        service.getQuote({
          ...validParams,
          feeShareBps: 0,
        })
      ).resolves.toBeDefined();
    });

    it('should accept feeShareBps at boundary 10000', async () => {
      mockApiClient.scanRoutes.mockResolvedValue([crossChainQuote]);

      await expect(
        service.getQuote({
          ...validParams,
          feeShareBps: 10000,
        })
      ).resolves.toBeDefined();
    });
  });
});
