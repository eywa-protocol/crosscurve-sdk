/**
 * E2E tests for real swap execution
 *
 * IMPORTANT: These tests execute real transactions and require funds
 * They are skipped by default. To run them:
 * 1. Set ENABLE_E2E_SWAP=true environment variable
 * 2. Ensure test wallet has sufficient funds on Arbitrum/Optimism
 * 3. Run: ENABLE_E2E_SWAP=true npm test -- tests/e2e/swap.test.ts
 *
 * Test wallet: 0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5
 * Required: ~0.005 ETH on Arbitrum and Optimism
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createWalletClient, createPublicClient, http } from 'viem';
import { arbitrum, optimism } from 'viem/chains';
import { mnemonicToAccount } from 'viem/accounts';
import { CrossCurveSDK } from '../../src/sdk.js';
import { ViemAdapter } from '../../src/infrastructure/adapters/ViemAdapter.js';
import { RouteProvider } from '../../src/constants/providers.js';
import { TEST_CONFIG, TEST_CHAINS } from '../setup.js';

const shouldRunSwapTests = process.env.ENABLE_E2E_SWAP === 'true' && !!TEST_CONFIG.testMnemonic;
const describeOrSkip = shouldRunSwapTests ? describe : describe.skip;

describeOrSkip('E2E Swap Tests (REAL TRANSACTIONS)', () => {
  let sdk: CrossCurveSDK;
  let account: ReturnType<typeof mnemonicToAccount>;
  let arbSigner: ViemAdapter;
  let opSigner: ViemAdapter;

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: TEST_CONFIG.apiBaseUrl,
    });
    await sdk.init();

    if (!TEST_CONFIG.testMnemonic) {
      throw new Error('TEST_MNEMONIC environment variable is required');
    }
    account = mnemonicToAccount(TEST_CONFIG.testMnemonic);

    // Arbitrum signer
    const arbWalletClient = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(),
    });
    const arbPublicClient = createPublicClient({
      chain: arbitrum,
      transport: http(),
    });
    arbSigner = new ViemAdapter(arbWalletClient, arbPublicClient, account);

    // Optimism signer
    const opWalletClient = createWalletClient({
      account,
      chain: optimism,
      transport: http(),
    });
    const opPublicClient = createPublicClient({
      chain: optimism,
      transport: http(),
    });
    opSigner = new ViemAdapter(opWalletClient, opPublicClient, account);

    console.log('Test wallet:', account.address);
  });

  describe('Cross-chain ETH bridging', () => {
    it('should bridge ETH from Arbitrum to Optimism with tracking', async () => {
      const amount = '300000000000000'; // 0.0003 ETH
      const statusUpdates: string[] = [];

      console.log('Getting quote: 0.0003 ETH ARB -> OP...');
      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.arbitrum,
        toChain: TEST_CHAINS.optimism,
        fromToken: '0x0000000000000000000000000000000000000000',
        toToken: '0x0000000000000000000000000000000000000000',
        amount,
        slippage: 1.0,
        sender: account.address,
      });

      console.log('Quote:', {
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        route: quote.route.map((r) => r.type),
      });

      expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);

      console.log('Executing with tracking...');
      const result = await sdk.executeQuote(quote, {
        signer: arbSigner,
        autoRecover: true,
        onStatusChange: (status) => {
          console.log('Status:', status.status);
          statusUpdates.push(status.status);
        },
      });

      console.log('Result:', {
        txHash: result.transactionHash,
        provider: result.provider,
        finalStatus: result.status?.status,
      });

      expect(result.transactionHash).toBeTruthy();
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(['completed', 'failed', 'reverted']).toContain(result.status?.status);

      console.log('https://arbiscan.io/tx/' + result.transactionHash);
    }, 600000);

    it('should bridge ETH from Optimism to Arbitrum with tracking', async () => {
      const amount = '300000000000000'; // 0.0003 ETH
      const statusUpdates: string[] = [];

      console.log('Getting quote: 0.0003 ETH OP -> ARB...');
      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.optimism,
        toChain: TEST_CHAINS.arbitrum,
        fromToken: '0x0000000000000000000000000000000000000000',
        toToken: '0x0000000000000000000000000000000000000000',
        amount,
        slippage: 1.0,
        sender: account.address,
      });

      console.log('Quote:', {
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        route: quote.route.map((r) => r.type),
      });

      expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);

      console.log('Executing with tracking...');
      const result = await sdk.executeQuote(quote, {
        signer: opSigner,
        autoRecover: true,
        onStatusChange: (status) => {
          console.log('Status:', status.status);
          statusUpdates.push(status.status);
        },
      });

      console.log('Result:', {
        txHash: result.transactionHash,
        provider: result.provider,
        finalStatus: result.status?.status,
      });

      expect(result.transactionHash).toBeTruthy();
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(['completed', 'failed', 'reverted']).toContain(result.status?.status);

      console.log('https://optimistic.etherscan.io/tx/' + result.transactionHash);
    }, 600000);
  });

  describe('Cross-chain token swaps', () => {
    it('should swap ETH (Arbitrum) to OP token (Optimism) with tracking', async () => {
      const amount = '300000000000000'; // 0.0003 ETH
      const OP_TOKEN = '0x4200000000000000000000000000000000000042';
      const statusUpdates: string[] = [];

      console.log('Getting quote: 0.0003 ETH (ARB) -> OP token...');
      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.arbitrum,
        toChain: TEST_CHAINS.optimism,
        fromToken: '0x0000000000000000000000000000000000000000',
        toToken: OP_TOKEN,
        amount,
        slippage: 1.0,
        sender: account.address,
      });

      console.log('Quote:', {
        amountIn: quote.amountIn,
        amountOut: (Number(quote.amountOut) / 1e18).toFixed(4) + ' OP',
        route: quote.route.map((r) => r.type),
      });

      expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);

      console.log('Executing with tracking...');
      const result = await sdk.executeQuote(quote, {
        signer: arbSigner,
        autoRecover: true,
        onStatusChange: (status) => {
          console.log('Status:', status.status);
          statusUpdates.push(status.status);
        },
      });

      console.log('Result:', {
        txHash: result.transactionHash,
        provider: result.provider,
        finalStatus: result.status?.status,
      });

      expect(result.transactionHash).toBeTruthy();
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(['completed', 'failed', 'reverted']).toContain(result.status?.status);

      console.log('https://arbiscan.io/tx/' + result.transactionHash);
    }, 600000);
  });

  describe('Same-chain swaps', () => {
    it('should swap USDC to USDT on Arbitrum via Curve with tracking', async () => {
      const USDC_ARB = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
      const USDT_ARB = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
      const amount = '1000000'; // 1 USDC
      const statusUpdates: string[] = [];

      console.log('Getting quote: 1 USDC -> USDT on Arbitrum...');
      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.arbitrum,
        toChain: TEST_CHAINS.arbitrum,
        fromToken: USDC_ARB,
        toToken: USDT_ARB,
        amount,
        slippage: 0.5,
        sender: account.address,
        providers: [RouteProvider.CROSS_CURVE],
      });

      console.log('Quote:', {
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        route: quote.route.map((r) => r.type),
      });

      expect(Number(quote.amountOut)).toBeGreaterThan(0);

      console.log('Executing with tracking...');
      const result = await sdk.executeQuote(quote, {
        signer: arbSigner,
        autoRecover: true,
        onStatusChange: (status) => {
          console.log('Status:', status.status);
          statusUpdates.push(status.status);
        },
      });

      console.log('Result:', {
        txHash: result.transactionHash,
        provider: result.provider,
        finalStatus: result.status?.status,
      });

      expect(result.transactionHash).toBeTruthy();
      expect(result.provider).toBe(RouteProvider.CROSS_CURVE);

      console.log('https://arbiscan.io/tx/' + result.transactionHash);
    }, 300000);
  });

  describe('Custom parameters', () => {
    it('should execute with custom gas limit and track', async () => {
      const amount = '200000000000000'; // 0.0002 ETH
      const statusUpdates: string[] = [];

      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.arbitrum,
        toChain: TEST_CHAINS.optimism,
        fromToken: '0x0000000000000000000000000000000000000000',
        toToken: '0x0000000000000000000000000000000000000000',
        amount,
        slippage: 1.0,
        sender: account.address,
      });

      console.log('Executing with custom gasLimit: 500000...');
      const result = await sdk.executeQuote(quote, {
        signer: arbSigner,
        autoRecover: true,
        gasLimit: '500000',
        onStatusChange: (status) => {
          console.log('Status:', status.status);
          statusUpdates.push(status.status);
        },
      });

      expect(result.transactionHash).toBeTruthy();
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(['completed', 'failed', 'reverted']).toContain(result.status?.status);

      console.log('https://arbiscan.io/tx/' + result.transactionHash);
    }, 600000);

    it('should execute with custom recipient and track', async () => {
      const amount = '200000000000000'; // 0.0002 ETH
      const statusUpdates: string[] = [];

      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.arbitrum,
        toChain: TEST_CHAINS.optimism,
        fromToken: '0x0000000000000000000000000000000000000000',
        toToken: '0x0000000000000000000000000000000000000000',
        amount,
        slippage: 1.0,
        sender: account.address,
      });

      console.log('Executing with custom recipient (same address for test)...');
      const result = await sdk.executeQuote(quote, {
        signer: arbSigner,
        autoRecover: true,
        recipient: account.address,
        onStatusChange: (status) => {
          console.log('Status:', status.status);
          statusUpdates.push(status.status);
        },
      });

      expect(result.transactionHash).toBeTruthy();
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(['completed', 'failed', 'reverted']).toContain(result.status?.status);

      console.log('https://arbiscan.io/tx/' + result.transactionHash);
    }, 600000);
  });

  describe('Transaction search', () => {
    it('should search wallet transactions', async () => {
      const results = await sdk.searchTransactions(account.address);

      expect(Array.isArray(results)).toBe(true);
      console.log(`Found ${results.length} transactions for wallet`);

      if (results.length > 0) {
        console.log('First transaction:', {
          status: results[0].status,
          sourceChain: results[0].source?.chainId,
          destChain: results[0].destination?.chainId,
        });
      }
    });
  });
});

// Show instructions when tests are skipped
describe('E2E Swap Tests Info', () => {
  it('should display instructions', () => {
    if (!shouldRunSwapTests) {
      console.log('\n===========================================');
      console.log('E2E SWAP TESTS ARE SKIPPED BY DEFAULT');
      console.log('===========================================');
      console.log('To run:');
      console.log('1. Create .env.test with TEST_MNEMONIC');
      console.log('2. Fund wallet with ETH on Arbitrum/Optimism');
      console.log('3. Run: ENABLE_E2E_SWAP=true npm test -- tests/e2e/swap.test.ts');
      console.log('===========================================\n');
    }
  });
});
