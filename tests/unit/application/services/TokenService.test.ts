/**
 * @fileoverview TokenService unit tests
 * Tests token and chain loading with caching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenService } from '../../../../src/application/services/TokenService.js';
import type { IApiClient, ICache } from '../../../../src/domain/interfaces/index.js';
import type { Token, Chain } from '../../../../src/types/index.js';
import { createMockApiClient } from '../../../mocks/MockApiClient.js';

describe('TokenService', () => {
  let service: TokenService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let mockCache: ICache & {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  const mockTokens: Token[] = [
    {
      chainId: 42161,
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
    {
      chainId: 42161,
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
    },
    {
      chainId: 10,
      address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
  ];

  const mockChains: Chain[] = [
    {
      id: 42161,
      name: 'Arbitrum One',
      caip2: 'eip155:42161',
    },
    {
      id: 10,
      name: 'Optimism',
      caip2: 'eip155:10',
    },
    {
      id: 1,
      name: 'Ethereum',
      caip2: 'eip155:1',
    },
  ];

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    mockCache = {
      get: vi.fn<[string], unknown>().mockReturnValue(undefined),
      set: vi.fn<[string, unknown, number], void>(),
      delete: vi.fn<[string], boolean>().mockReturnValue(true),
      clear: vi.fn<[], void>(),
    };
    service = new TokenService(mockApiClient as IApiClient, mockCache);
  });

  describe('loadChains', () => {
    it('should load chains from API when not cached', async () => {
      mockApiClient.getChainList.mockResolvedValue({ chains: mockChains });

      const result = await service.loadChains();

      expect(mockApiClient.getChainList).toHaveBeenCalled();
      expect(result).toEqual(mockChains);
    });

    it('should return cached chains when available', async () => {
      mockCache.get.mockReturnValue(mockChains);

      const result = await service.loadChains();

      expect(mockApiClient.getChainList).not.toHaveBeenCalled();
      expect(result).toEqual(mockChains);
    });

    it('should cache chains after loading', async () => {
      mockApiClient.getChainList.mockResolvedValue({ chains: mockChains });

      await service.loadChains();

      expect(mockCache.set).toHaveBeenCalledWith(
        'chains',
        mockChains,
        10 * 60 * 1000 // 10 minutes
      );
    });

    it('should use correct cache key', async () => {
      mockApiClient.getChainList.mockResolvedValue({ chains: mockChains });

      await service.loadChains();

      expect(mockCache.get).toHaveBeenCalledWith('chains');
    });
  });

  describe('loadTokens', () => {
    it('should load all tokens from API when not cached', async () => {
      mockApiClient.getTokenList.mockResolvedValue({ tokens: mockTokens });

      const result = await service.loadTokens();

      expect(mockApiClient.getTokenList).toHaveBeenCalled();
      expect(result).toEqual(mockTokens);
    });

    it('should return cached tokens when available', async () => {
      mockCache.get.mockReturnValue(mockTokens);

      const result = await service.loadTokens();

      expect(mockApiClient.getTokenList).not.toHaveBeenCalled();
      expect(result).toEqual(mockTokens);
    });

    it('should cache tokens after loading', async () => {
      mockApiClient.getTokenList.mockResolvedValue({ tokens: mockTokens });

      await service.loadTokens();

      expect(mockCache.set).toHaveBeenCalledWith(
        'tokens:all',
        mockTokens,
        10 * 60 * 1000
      );
    });

    it('should filter tokens by chainId when specified', async () => {
      mockApiClient.getTokenList.mockResolvedValue({ tokens: mockTokens });

      const result = await service.loadTokens(42161);

      expect(result.length).toBe(2);
      expect(result.every((t) => t.chainId === 42161)).toBe(true);
    });

    it('should use chain-specific cache key when chainId provided', async () => {
      mockApiClient.getTokenList.mockResolvedValue({ tokens: mockTokens });

      await service.loadTokens(42161);

      expect(mockCache.get).toHaveBeenCalledWith('tokens:42161');
      expect(mockCache.set).toHaveBeenCalledWith(
        'tokens:42161',
        expect.any(Array),
        10 * 60 * 1000
      );
    });

    it('should return empty array when no tokens match chainId', async () => {
      mockApiClient.getTokenList.mockResolvedValue({ tokens: mockTokens });

      const result = await service.loadTokens(999);

      expect(result).toEqual([]);
    });
  });

  describe('getTokensByChain', () => {
    it('should filter tokens by chain ID', () => {
      const result = service.getTokensByChain(mockTokens, 42161);

      expect(result.length).toBe(2);
      expect(result.every((t) => t.chainId === 42161)).toBe(true);
    });

    it('should return empty array for non-existent chain', () => {
      const result = service.getTokensByChain(mockTokens, 999);

      expect(result).toEqual([]);
    });

    it('should return all matching tokens', () => {
      const result = service.getTokensByChain(mockTokens, 10);

      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe('USDC');
    });
  });

  describe('getToken', () => {
    it('should find token by chainId and address', () => {
      const result = service.getToken(
        mockTokens,
        42161,
        '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
      );

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('USDC');
    });

    it('should be case-insensitive for address matching', () => {
      const result = service.getToken(
        mockTokens,
        42161,
        '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8' // lowercase
      );

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('USDC');
    });

    it('should return undefined for non-existent token', () => {
      const result = service.getToken(mockTokens, 42161, '0x0000000000000000000000000000000000000000');

      expect(result).toBeUndefined();
    });

    it('should return undefined for wrong chain', () => {
      const result = service.getToken(
        mockTokens,
        10, // Optimism
        '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' // Arbitrum USDC address
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getChainByCaip2', () => {
    it('should find chain by CAIP-2 identifier', () => {
      const result = service.getChainByCaip2(mockChains, 'eip155:42161');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Arbitrum One');
    });

    it('should return undefined for non-existent CAIP-2', () => {
      const result = service.getChainByCaip2(mockChains, 'eip155:999');

      expect(result).toBeUndefined();
    });

    it('should handle invalid CAIP-2 format', () => {
      const result = service.getChainByCaip2(mockChains, 'invalid');

      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should propagate API errors for loadChains', async () => {
      mockApiClient.getChainList.mockRejectedValue(new Error('API Error'));

      await expect(service.loadChains()).rejects.toThrow('API Error');
    });

    it('should propagate API errors for loadTokens', async () => {
      mockApiClient.getTokenList.mockRejectedValue(new Error('API Error'));

      await expect(service.loadTokens()).rejects.toThrow('API Error');
    });
  });
});
