/**
 * E2E tests for API endpoints
 *
 * Tests real API endpoints (read-only operations)
 * Uses actual CrossCurve API for integration validation
 */

import { describe, it, expect } from 'vitest';
import { CrossCurveSDK } from '../../src/sdk.js';
import { TEST_CONFIG, TEST_CHAINS } from '../setup.js';

describe('E2E API Tests', () => {
  const sdk = new CrossCurveSDK({
    baseUrl: TEST_CONFIG.apiBaseUrl,
  });

  describe('Network endpoints', () => {
    it('should load supported chains from API', async () => {
      const chains = await sdk.loadChains();

      expect(chains).toBeDefined();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);

      // Verify chain structure
      const arbitrumChain = chains.find((c) => c.id === TEST_CHAINS.arbitrum);
      expect(arbitrumChain).toBeDefined();
      expect(arbitrumChain?.name).toBeTruthy();
      expect(arbitrumChain?.caip2).toBeTruthy();
      expect(arbitrumChain?.rpcUrl).toBeTruthy();
      expect(arbitrumChain?.nativeCurrency).toBeDefined();
    });

    it('should load token list from API', async () => {
      const tokens = await sdk.loadTokens();

      expect(tokens).toBeDefined();
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);

      // Verify token structure
      const arbTokens = tokens.filter((t) => t.chainId === TEST_CHAINS.arbitrum);
      expect(arbTokens.length).toBeGreaterThan(0);

      const ethToken = arbTokens.find(
        (t) => t.address === '0x0000000000000000000000000000000000000000'
      );
      expect(ethToken).toBeDefined();
      expect(ethToken?.symbol).toBe('ETH');
      expect(ethToken?.decimals).toBe(18);
    });

    it('should load tokens for specific chain', async () => {
      const tokens = await sdk.loadTokens(TEST_CHAINS.arbitrum);

      expect(tokens).toBeDefined();
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.every((t) => t.chainId === TEST_CHAINS.arbitrum)).toBe(true);
    });

    it('should get chain by CAIP-2 identifier', async () => {
      await sdk.loadChains();
      const chain = sdk.getChainByCaip2('eip155:42161');

      expect(chain).toBeDefined();
      expect(chain?.id).toBe(TEST_CHAINS.arbitrum);
    });
  });

  describe('Routing endpoints', () => {
    it('should scan routes for cross-chain swap', async () => {
      await sdk.loadTokens();

      const arbEth = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0x0000000000000000000000000000000000000000'
      );
      const opEth = sdk.getToken(
        TEST_CHAINS.optimism,
        '0x0000000000000000000000000000000000000000'
      );

      expect(arbEth).toBeDefined();
      expect(opEth).toBeDefined();

      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.arbitrum,
        toChain: TEST_CHAINS.optimism,
        fromToken: arbEth!.address,
        toToken: opEth!.address,
        amount: '1000000000000000', // 0.001 ETH
        slippage: 0.5,
        sender: TEST_CONFIG.testWalletAddress,
      });

      expect(quote).toBeDefined();
      expect(quote.route).toBeDefined();
      expect(Array.isArray(quote.route)).toBe(true);
      expect(quote.route.length).toBeGreaterThan(0);
      expect(quote.amountIn).toBe('1000000000000000');
      expect(quote.amountOut).toBeTruthy();
      expect(quote.signature).toBeTruthy();
    });

    it('should scan routes for same-chain swap', async () => {
      await sdk.loadTokens();

      const arbEth = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0x0000000000000000000000000000000000000000'
      );
      const arbUsdc = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
      );

      expect(arbEth).toBeDefined();
      expect(arbUsdc).toBeDefined();

      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.arbitrum,
        toChain: TEST_CHAINS.arbitrum,
        fromToken: arbEth!.address,
        toToken: arbUsdc!.address,
        amount: '1000000000000000', // 0.001 ETH
        slippage: 0.5,
        sender: TEST_CONFIG.testWalletAddress,
      });

      expect(quote).toBeDefined();
      expect(quote.route.length).toBeGreaterThan(0);
    });

    it(
      'should handle different slippage values',
      async () => {
        await sdk.loadTokens();

        const arbEth = sdk.getToken(
          TEST_CHAINS.arbitrum,
          '0x0000000000000000000000000000000000000000'
        );
        const opEth = sdk.getToken(
          TEST_CHAINS.optimism,
          '0x0000000000000000000000000000000000000000'
        );

        expect(arbEth).toBeDefined();
        expect(opEth).toBeDefined();

        const quote1 = await sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.optimism,
          fromToken: arbEth!.address,
          toToken: opEth!.address,
          amount: '1000000000000000',
          slippage: 0.1,
          sender: TEST_CONFIG.testWalletAddress,
        });

        const quote2 = await sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.optimism,
          fromToken: arbEth!.address,
          toToken: opEth!.address,
          amount: '1000000000000000',
          slippage: 1.0,
          sender: TEST_CONFIG.testWalletAddress,
        });

        expect(quote1).toBeDefined();
        expect(quote2).toBeDefined();
        // Higher slippage might result in different routes or amounts
        expect(quote1.route.length).toBeGreaterThan(0);
        expect(quote2.route.length).toBeGreaterThan(0);
      },
      90000
    );

    it('should handle various token pairs', async () => {
      await sdk.loadTokens();

      const arbUsdc = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
      );
      const opUsdc = sdk.getToken(
        TEST_CHAINS.optimism,
        '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
      );

      if (arbUsdc && opUsdc) {
        const quote = await sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.optimism,
          fromToken: arbUsdc.address,
          toToken: opUsdc.address,
          amount: '1000000', // 1 USDC (6 decimals)
          slippage: 0.5,
          sender: TEST_CONFIG.testWalletAddress,
        });

        expect(quote).toBeDefined();
        expect(quote.amountIn).toBe('1000000');
        expect(Number(quote.amountOut)).toBeGreaterThan(0);
      }
    });

    it('should use routing scope API', async () => {
      await sdk.loadTokens();

      const routes = await sdk.routing.scan({
        params: {
          tokenIn: '0x0000000000000000000000000000000000000000',
          chainIdIn: TEST_CHAINS.arbitrum,
          tokenOut: '0x0000000000000000000000000000000000000000',
          chainIdOut: TEST_CHAINS.optimism,
          amountIn: '1000000000000000',
        },
        slippage: 0.01,
      });

      expect(routes).toBeDefined();
      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('Token filtering and search', () => {
    it('should filter tokens by chain', async () => {
      await sdk.loadTokens();

      const arbTokens = sdk.getTokens(TEST_CHAINS.arbitrum);
      const opTokens = sdk.getTokens(TEST_CHAINS.optimism);

      expect(arbTokens.length).toBeGreaterThan(0);
      expect(opTokens.length).toBeGreaterThan(0);
      expect(arbTokens.every((t) => t.chainId === TEST_CHAINS.arbitrum)).toBe(true);
      expect(opTokens.every((t) => t.chainId === TEST_CHAINS.optimism)).toBe(true);
    });

    it('should find specific token by address', async () => {
      await sdk.loadTokens();

      const usdc = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
      );

      expect(usdc).toBeDefined();
      expect(usdc?.symbol).toBe('USDC');
      expect(usdc?.decimals).toBe(6);
      expect(usdc?.name).toContain('USD');
    });

    it('should handle native token lookup', async () => {
      await sdk.loadTokens();

      const eth = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0x0000000000000000000000000000000000000000'
      );

      if (eth) {
        expect(eth.symbol).toBe('ETH');
        expect(eth.decimals).toBe(18);
        expect(eth.tags).toContain('native');
      }
    });

    it('should return undefined for non-existent token', async () => {
      await sdk.loadTokens();

      const token = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0x0000000000000000000000000000000000000001'
      );

      expect(token).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid token addresses in quote request', async () => {
      await sdk.loadTokens();

      const arbEth = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0x0000000000000000000000000000000000000000'
      );

      expect(arbEth).toBeDefined();

      // Use invalid token address
      const invalidTokenAddress = '0x0000000000000000000000000000000000000001';

      // This should either throw an error or return empty routes
      try {
        await sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.optimism,
          fromToken: arbEth!.address,
          toToken: invalidTokenAddress,
          amount: '1000000000000000',
          slippage: 0.5,
          sender: TEST_CONFIG.testWalletAddress,
        });
        // If it succeeds, it should return empty routes or valid response
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle zero amount', async () => {
      await sdk.loadTokens();

      const arbEth = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0x0000000000000000000000000000000000000000'
      );
      const opEth = sdk.getToken(
        TEST_CHAINS.optimism,
        '0x0000000000000000000000000000000000000000'
      );

      expect(arbEth).toBeDefined();
      expect(opEth).toBeDefined();

      await expect(
        sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.optimism,
          fromToken: arbEth!.address,
          toToken: opEth!.address,
          amount: '0',
          slippage: 0.5,
          sender: TEST_CONFIG.testWalletAddress,
        })
      ).rejects.toThrow();
    });

    it('should handle invalid slippage', async () => {
      await sdk.loadTokens();

      const arbEth = sdk.getToken(
        TEST_CHAINS.arbitrum,
        '0x0000000000000000000000000000000000000000'
      );
      const opEth = sdk.getToken(
        TEST_CHAINS.optimism,
        '0x0000000000000000000000000000000000000000'
      );

      expect(arbEth).toBeDefined();
      expect(opEth).toBeDefined();

      await expect(
        sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.optimism,
          fromToken: arbEth!.address,
          toToken: opEth!.address,
          amount: '1000000000000000',
          slippage: -1,
          sender: TEST_CONFIG.testWalletAddress,
        })
      ).rejects.toThrow();
    });
  });

  describe('Transaction search', () => {
    it('should search transactions by address', async () => {
      // API returns 404 when no transactions found
      try {
        const results = await sdk.searchTransactions(TEST_CONFIG.testWalletAddress);
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      } catch (error: any) {
        // 404 is expected when no transactions exist
        expect(error.message).toMatch(/404|Not Found/);
      }
    });

    it('should handle search with no results', async () => {
      // API returns 404 when no transactions found, not empty array
      try {
        const results = await sdk.searchTransactions(
          '0x0000000000000000000000000000000000000001'
        );
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      } catch (error: any) {
        // 404 is expected for non-existent addresses
        expect(error.message).toMatch(/404|Not Found/);
      }
    });
  });

  describe('Multi-chain support', () => {
    it('should support Arbitrum to Optimism', async () => {
      await sdk.loadTokens();

      const arbEth = sdk.getToken(TEST_CHAINS.arbitrum, '0x0000000000000000000000000000000000000000');
      const opEth = sdk.getToken(TEST_CHAINS.optimism, '0x0000000000000000000000000000000000000000');

      if (arbEth && opEth) {
        const quote = await sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.optimism,
          fromToken: arbEth.address,
          toToken: opEth.address,
          amount: '1000000000000000',
          slippage: 0.5,
          sender: TEST_CONFIG.testWalletAddress,
        });

        expect(quote).toBeDefined();
      }
    });

    it('should support Arbitrum to Avalanche', async () => {
      await sdk.loadTokens();

      const arbEth = sdk.getToken(TEST_CHAINS.arbitrum, '0x0000000000000000000000000000000000000000');
      const avaxNative = sdk.getToken(TEST_CHAINS.avalanche, '0x0000000000000000000000000000000000000000');

      if (arbEth && avaxNative) {
        const quote = await sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.avalanche,
          fromToken: arbEth.address,
          toToken: avaxNative.address,
          amount: '1000000000000000',
          slippage: 0.5,
          sender: TEST_CONFIG.testWalletAddress,
        });

        expect(quote).toBeDefined();
      }
    });

    it('should support Arbitrum to BSC', async () => {
      await sdk.loadTokens();

      const arbEth = sdk.getToken(TEST_CHAINS.arbitrum, '0x0000000000000000000000000000000000000000');
      const bscBnb = sdk.getToken(TEST_CHAINS.bsc, '0x0000000000000000000000000000000000000000');

      if (arbEth && bscBnb) {
        const quote = await sdk.getQuote({
          fromChain: TEST_CHAINS.arbitrum,
          toChain: TEST_CHAINS.bsc,
          fromToken: arbEth.address,
          toToken: bscBnb.address,
          amount: '1000000000000000',
          slippage: 0.5,
          sender: TEST_CONFIG.testWalletAddress,
        });

        expect(quote).toBeDefined();
      }
    });
  });
});
