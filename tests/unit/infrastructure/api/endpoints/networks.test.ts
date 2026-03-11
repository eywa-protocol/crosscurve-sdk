/**
 * @fileoverview Networks endpoint unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNetworks, getChainList, getTokenList, transformToChains } from '../../../../../src/infrastructure/api/endpoints/networks.js';
import type { HttpClient } from '../../../../../src/infrastructure/api/client/index.js';
import type { NetworksApiResponse } from '../../../../../src/types/api/index.js';

describe('networks endpoints', () => {
  let mockClient: HttpClient;

  const mockNetworksResponse: NetworksApiResponse = {
    arbitrum: {
      name: 'Arbitrum One',
      icon: 'arbitrum.svg',
      chainId: 42161,
      rpcHttp: ['https://arb1.arbitrum.io/rpc'],
      rpcPublic: 'https://arb1.arbitrum.io/rpc',
      hubChain: true,
      router: '0xRouter',
      curveFactory: '0xCurveFactory',
      frontHelper: '0xFrontHelper',
      claimHelper: '0xClaimHelper',
      walletFactory: '0xWalletFactory',
      nft: '0xNFT',
      tokens: [
        {
          chainId: 42161,
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          tags: ['stablecoin'],
          permit: true,
        },
        {
          chainId: 42161,
          address: '0x0000000000000000000000000000000000000000',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
          tags: ['native'],
        },
      ],
    },
    optimism: {
      name: 'Optimism',
      icon: 'optimism.svg',
      chainId: 10,
      rpcHttp: ['https://mainnet.optimism.io'],
      rpcPublic: 'https://mainnet.optimism.io',
      hubChain: false,
      router: '0xRouterOP',
      curveFactory: '0xCurveFactoryOP',
      frontHelper: '0xFrontHelperOP',
      claimHelper: '0xClaimHelperOP',
      walletFactory: '0xWalletFactoryOP',
      nft: '0xNFTOP',
      tokens: [
        {
          chainId: 10,
          address: '0xTokenOP',
          name: 'OP Token',
          symbol: 'OP',
          decimals: 18,
          tags: ['governance'],
        },
      ],
    },
  };

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;
  });

  describe('getNetworks', () => {
    it('should call GET /networks', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getNetworks(mockClient);

      expect(mockClient.get).toHaveBeenCalledWith('/networks');
      expect(result).toEqual(mockNetworksResponse);
    });

    it('should return raw networks data', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getNetworks(mockClient);

      expect(result.arbitrum.chainId).toBe(42161);
      expect(result.optimism.chainId).toBe(10);
      expect(result.arbitrum.tokens).toHaveLength(2);
    });
  });

  describe('getChainList', () => {
    it('should transform networks to chain list', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getChainList(mockClient);

      expect(result.chains).toHaveLength(2);
    });

    it('should include chain ID and name', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getChainList(mockClient);

      const arbitrumChain = result.chains.find((c) => c.id === 42161);
      expect(arbitrumChain).toBeDefined();
      expect(arbitrumChain?.name).toBe('Arbitrum One');
    });

    it('should include CAIP-2 identifier', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getChainList(mockClient);

      const arbitrumChain = result.chains.find((c) => c.id === 42161);
      expect(arbitrumChain?.caip2).toBe('eip155:42161');
    });

    it('should include RPC URL', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getChainList(mockClient);

      const arbitrumChain = result.chains.find((c) => c.id === 42161);
      expect(arbitrumChain?.rpcUrl).toBe('https://arb1.arbitrum.io/rpc');
    });
  });

  describe('getTokenList', () => {
    it('should transform networks to token list', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getTokenList(mockClient);

      expect(result.tokens).toHaveLength(3); // 2 from Arbitrum + 1 from Optimism
    });

    it('should include token details', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getTokenList(mockClient);

      const usdc = result.tokens.find((t) => t.symbol === 'USDC');
      expect(usdc).toBeDefined();
      expect(usdc?.address).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
      expect(usdc?.decimals).toBe(6);
      expect(usdc?.chainId).toBe(42161);
    });

    it('should include permit flag', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getTokenList(mockClient);

      const usdc = result.tokens.find((t) => t.symbol === 'USDC');
      expect(usdc?.permit).toBe(true);

      const eth = result.tokens.find((t) => t.symbol === 'ETH');
      expect(eth?.permit).toBe(false); // Default when not specified
    });

    it('should include tags', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getTokenList(mockClient);

      const usdc = result.tokens.find((t) => t.symbol === 'USDC');
      expect(usdc?.tags).toContain('stablecoin');

      const op = result.tokens.find((t) => t.symbol === 'OP');
      expect(op?.tags).toContain('governance');
    });

    it('should aggregate tokens from all networks', async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockNetworksResponse);

      const result = await getTokenList(mockClient);

      const chainIds = [...new Set(result.tokens.map((t) => t.chainId))];
      expect(chainIds).toContain(42161);
      expect(chainIds).toContain(10);
    });
  });

  describe('transformToChains', () => {
    it('uses chain metadata registry for known chains', () => {
      const response = {
        arbitrum: {
          name: 'Arbitrum', chainId: 42161, rpcPublic: 'https://arb1.arbitrum.io/rpc',
          rpcHttp: [], router: '0xRouter', hubChain: true, tokens: [],
        },
      };
      const chains = transformToChains(response as any);
      expect(chains[0].explorerUrl).toBe('https://arbiscan.io');
      expect(chains[0].nativeCurrency.symbol).toBe('ETH');
      expect(chains[0].hubChain).toBe(true);
    });

    it('falls back to defaults for unknown chains', () => {
      const response = {
        unknown: {
          name: 'Unknown', chainId: 99999, rpcPublic: '', rpcHttp: [],
          router: '0x0', hubChain: false, tokens: [],
        },
      };
      const chains = transformToChains(response as any);
      expect(chains[0].explorerUrl).toBe('');
      expect(chains[0].nativeCurrency.symbol).toBe('ETH');
    });
  });
});
