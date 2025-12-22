/**
 * @fileoverview SDK integration tests
 * Tests SDK public interface and integration between components
 * Uses real API calls (read-only operations)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CrossCurveSDK } from '../../src/sdk.js';
import type { GetQuoteParams } from '../../src/types/index.js';
import { TEST_CONFIG } from '../setup.js';

describe('CrossCurveSDK Integration', () => {
  let sdk: CrossCurveSDK;

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: TEST_CONFIG.apiBaseUrl,
    });
    await sdk.init();
  }, 30000);

  describe('initialization', () => {
    it('should initialize SDK with config', () => {
      expect(sdk).toBeDefined();
    });

    it('should load chains on init', () => {
      expect(sdk.chains.length).toBeGreaterThan(0);
    });

    it('should provide readonly access to chains', () => {
      expect(sdk.chains).toBeDefined();
      expect(Array.isArray(sdk.chains)).toBe(true);
    });

    it('should provide readonly access to tokens', () => {
      expect(sdk.tokens).toBeDefined();
      expect(sdk.tokens instanceof Map).toBe(true);
    });

    it('should have tokens for Arbitrum chain', () => {
      const arbTokens = sdk.tokens.get(42161);
      expect(arbTokens).toBeDefined();
      expect(arbTokens!.length).toBeGreaterThan(0);
    });
  });

  describe('getQuote', () => {
    it('should get a quote for cross-chain swap', async () => {
      const params: GetQuoteParams = {
        fromChain: 42161,
        toChain: 10,
        fromToken: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        toToken: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
        amount: '1000000000',
        slippage: 0.5,
        sender: TEST_CONFIG.testWalletAddress,
      };

      const quote = await sdk.getQuote(params);

      expect(quote).toBeDefined();
      expect(quote.amountIn).toBe('1000000000');
      expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);
    }, 30000);

    it('should throw on invalid parameters', async () => {
      const params: GetQuoteParams = {
        fromChain: 42161,
        toChain: 10,
        fromToken: 'invalid-address',
        toToken: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
        amount: '1000000000',
        slippage: 0.5,
      };

      await expect(sdk.getQuote(params)).rejects.toThrow();
    });
  });

  describe('token accessors', () => {
    it('should get tokens for specific chain', () => {
      const tokens = sdk.getTokens(42161);

      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should get specific token by address (case-insensitive)', () => {
      const token = sdk.getToken(42161, '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8');

      expect(token).toBeDefined();
      expect(token?.symbol).toBe('USDC.e');
    });

    it('should return undefined for non-existent token', () => {
      // Use a random address that definitely doesn't exist in the token list
      const token = sdk.getToken(42161, '0x1234567890123456789012345678901234567890');

      expect(token).toBeUndefined();
    });
  });

  describe('chain accessors', () => {
    it('should get chain by CAIP-2', () => {
      const chain = sdk.getChainByCaip2('eip155:42161');

      expect(chain).toBeDefined();
      expect(chain?.id).toBe(42161);
    });

    it('should return undefined for non-existent CAIP-2', () => {
      const chain = sdk.getChainByCaip2('eip155:999999');

      expect(chain).toBeUndefined();
    });
  });

  describe('scopes', () => {
    it('should expose routing scope', () => {
      expect(sdk.routing).toBeDefined();
    });

    it('should expose tx scope', () => {
      expect(sdk.tx).toBeDefined();
    });

    it('should expose tracking scope', () => {
      expect(sdk.tracking).toBeDefined();
    });

    it('should expose inconsistency scope', () => {
      expect(sdk.inconsistency).toBeDefined();
    });
  });

  describe('search transactions', () => {
    it('should search transactions by address', async () => {
      const results = await sdk.searchTransactions(TEST_CONFIG.testWalletAddress);

      // May return empty array if no transactions found
      expect(Array.isArray(results)).toBe(true);
    }, 30000);
  });
});
