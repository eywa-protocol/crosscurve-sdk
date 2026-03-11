import { describe, it, expect, beforeAll } from 'vitest';
import { CrossCurveSDK } from '../../../src/index.js';
import type { Quote, AACreateTxParams } from '../../../src/index.js';
import { TESTNET_TOKENS, TESTNET_CHAINS, SWAP_AMOUNT } from '../helpers/tokens.js';
import { getAccount } from '../helpers/wallet.js';

describe('aa api integration', () => {
  let sdk: CrossCurveSDK;
  let quote: Quote;
  const account = getAccount();

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: process.env.E2E_API_BASE_URL,
      apiKey: process.env.E2E_API_KEY,
    });
    await sdk.init();

    // Get a quote to use for AA transaction creation
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
    expect(quotes.length).toBeGreaterThan(0);
    quote = quotes[0];
  });

  describe('pimlico availability', () => {
    it('should report pimlico proxy status', async () => {
      const available = await sdk.aa.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('createTransaction', () => {
    it('should create 4337 transaction with calls', async () => {
      const params: AACreateTxParams = {
        quote,
        from: account.address,
        walletType: '4337',
        gasToken: TESTNET_TOKENS.SEPOLIA_USDC.address,
      };

      const aaTx = await sdk.aa.createTransaction(params);

      expect(aaTx.walletType).toBe('4337');
      expect(aaTx.calls).toBeInstanceOf(Array);
      expect(aaTx.calls.length).toBeGreaterThan(0);
      expect(aaTx.chainId).toBe(TESTNET_CHAINS.SEPOLIA);
      expect(aaTx.pimlicoChainName).toBeTruthy();
      expect(aaTx.paymasterContext?.token).toBeTruthy();

      // Each call should have to, value, data
      for (const call of aaTx.calls) {
        expect(call.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(typeof call.value).toBe('string');
        expect(call.data).toMatch(/^0x/);
      }
    });

    it('should create 7702 transaction with entryPoint', async () => {
      const params: AACreateTxParams = {
        quote,
        from: account.address,
        walletType: '7702',
        gasToken: TESTNET_TOKENS.SEPOLIA_USDC.address,
      };

      const aaTx = await sdk.aa.createTransaction(params);

      expect(aaTx.walletType).toBe('7702');
      expect(aaTx.calls).toBeInstanceOf(Array);
      expect(aaTx.calls.length).toBeGreaterThan(0);
      expect(aaTx.entryPoint).toBeTruthy();
    });
  });

  describe('calldataOnly', () => {
    it('should return raw calldata via tx.createCalldata', async () => {
      const result = await sdk.tx.createCalldata({
        from: account.address,
        recipient: account.address,
        routing: quote,
      });

      // API returns abi+args format (not pre-encoded data)
      expect(result.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(typeof result.value).toBe('string');
      // Either encoded data or abi+args should be present
      const hasData = typeof (result as { data?: string }).data === 'string';
      const hasAbi = typeof (result as { abi?: string }).abi === 'string';
      expect(hasData || hasAbi).toBe(true);
    });
  });
});
