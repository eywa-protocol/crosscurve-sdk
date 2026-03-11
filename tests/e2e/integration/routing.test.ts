import { describe, it, expect, beforeAll } from 'vitest';
import { CrossCurveSDK } from '../../../src/index.js';
import { TESTNET_TOKENS, TESTNET_CHAINS, SWAP_AMOUNT } from '../helpers/tokens.js';
import { getAccount } from '../helpers/wallet.js';

describe('routing integration', () => {
  let sdk: CrossCurveSDK;
  const account = getAccount();

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: process.env.E2E_API_BASE_URL,
      apiKey: process.env.E2E_API_KEY,
    });
    await sdk.init();
  });

  describe('scan', () => {
    it('should return quotes for Sepolia USDT → Arb Sepolia USDT', async () => {
      const quotes = await sdk.routing.scan({
        params: {
          tokenIn: TESTNET_TOKENS.SEPOLIA_USDT.address,
          amountIn: SWAP_AMOUNT,
          chainIdIn: TESTNET_CHAINS.SEPOLIA,
          tokenOut: TESTNET_TOKENS.ARB_SEPOLIA_USDT.address,
          chainIdOut: TESTNET_CHAINS.ARB_SEPOLIA,
        },
        slippage: 3,
        from: account.address,
      });

      expect(quotes).toBeInstanceOf(Array);
      expect(quotes.length).toBeGreaterThan(0);

      const quote = quotes[0];
      expect(quote.amountIn).toBe(SWAP_AMOUNT);
      expect(quote.amountOut).toBeTruthy();
      expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);
      expect(quote.route).toBeInstanceOf(Array);
      expect(quote.route.length).toBeGreaterThan(0);
      expect(quote.signature).toBeTruthy();
    });
  });

  describe('scanStream', () => {
    it('should yield streamed routes', async () => {
      const routes: unknown[] = [];

      for await (const route of sdk.routing.scanStream({
        params: {
          tokenIn: TESTNET_TOKENS.SEPOLIA_USDT.address,
          amountIn: SWAP_AMOUNT,
          chainIdIn: TESTNET_CHAINS.SEPOLIA,
          tokenOut: TESTNET_TOKENS.ARB_SEPOLIA_USDT.address,
          chainIdOut: TESTNET_CHAINS.ARB_SEPOLIA,
        },
        slippage: 3,
        from: account.address,
      })) {
        routes.push(route);
        // Break after first result to keep test fast
        break;
      }

      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('discover', () => {
    it('should return reachable tokens for Sepolia USDT', async () => {
      const tokens = await sdk.routing.discover({
        tokenIn: TESTNET_TOKENS.SEPOLIA_USDT.address,
        chainIdIn: TESTNET_CHAINS.SEPOLIA,
      });

      expect(tokens).toBeInstanceOf(Array);
      // Should find at least one reachable token
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});
