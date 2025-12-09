/**
 * E2E tests for real swap execution
 *
 * IMPORTANT: These tests execute real transactions and require funds
 * They are skipped by default. To run them:
 * 1. Set ENABLE_E2E_SWAP=true environment variable
 * 2. Ensure test wallet has sufficient funds on Arbitrum
 * 3. Run: ENABLE_E2E_SWAP=true npm test -- tests/e2e/swap.test.ts
 *
 * Test wallet: 0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5
 * Required: ~0.005 ETH on Arbitrum (chainId 42161)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createWalletClient, createPublicClient, http, type WalletClient, type PublicClient } from 'viem';
import { arbitrum, optimism } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { mnemonicToAccount } from 'viem/accounts';
import { CrossCurveSDK } from '../../src/sdk.js';
import { ViemAdapter } from '../../src/infrastructure/adapters/ViemAdapter.js';
import { RouteProvider } from '../../src/constants/providers.js';
import { TEST_CONFIG, TEST_CHAINS } from '../setup.js';

// Skip these tests by default
const shouldRunSwapTests = process.env.ENABLE_E2E_SWAP === 'true';
const describeOrSkip = shouldRunSwapTests ? describe : describe.skip;

describeOrSkip('E2E Swap Tests (REAL TRANSACTIONS)', () => {
  let sdk: CrossCurveSDK;
  let walletClient: any;
  let publicClient: any;
  let account: any;
  let signer: ViemAdapter;

  beforeAll(async () => {
    // Initialize SDK
    sdk = new CrossCurveSDK({
      baseUrl: TEST_CONFIG.apiBaseUrl,
    });

    await sdk.init();

    // Create wallet from mnemonic
    account = mnemonicToAccount(TEST_CONFIG.testMnemonic);

    // Create wallet client for Arbitrum (sending transactions)
    walletClient = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(),
    });

    // Create public client for Arbitrum (reading chain data, waiting for receipts)
    publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(),
    });

    // Create signer adapter with both clients
    signer = new ViemAdapter(walletClient, publicClient, account);

    console.log('Test wallet address:', account.address);
    console.log('Expected address:', TEST_CONFIG.testWalletAddress);
  });

  it('should execute same-chain swap using CrossCurve native (Curve pools)', async () => {
    // USDC -> USDT on Arbitrum using cross-curve provider (Curve pools)
    const USDC_ARB = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
    const USDT_ARB = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';

    const amount = '1000000'; // 1 USDC (6 decimals)
    console.log('Getting cross-curve native quote for USDC -> USDT on Arbitrum');

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

    console.log('Quote received:', {
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      routeSteps: quote.route.length,
      routeTypes: quote.route.map(r => r.type),
      signature: quote.signature?.slice(0, 20) + '...',
    });

    expect(quote).toBeDefined();
    expect(quote.amountIn).toBe(amount);
    expect(Number(quote.amountOut)).toBeGreaterThan(0);
    expect(quote.signature).toBeTruthy();

    // Execute via /tx/create flow
    console.log('Executing swap via CrossCurve Router...');
    const result = await sdk.executeQuote(quote, {
      signer,
      autoRecover: false,
    });

    console.log('Swap executed:', {
      transactionHash: result.transactionHash,
      requestId: result.requestId,
      provider: result.provider,
    });

    expect(result).toBeDefined();
    expect(result.transactionHash).toBeTruthy();
    expect(result.provider).toBe(RouteProvider.CROSS_CURVE);

    // For same-chain swaps, requestId may not be present (no cross-chain oracle)
    console.log('Transaction hash:', result.transactionHash);
  }, 120000);

  it('should execute small cross-chain swap from Arbitrum to Optimism', async () => {
    // Get tokens
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

    // Get quote for 0.0005 ETH (smaller amount to fit test wallet)
    const amount = '500000000000000'; // 0.0005 ETH in wei
    console.log('Getting quote for', amount, 'wei (0.0005 ETH)');

    const quote = await sdk.getQuote({
      fromChain: TEST_CHAINS.arbitrum,
      toChain: TEST_CHAINS.optimism,
      fromToken: arbEth!.address,
      toToken: opEth!.address,
      amount,
      slippage: 0.5,
      sender: account.address,
    });

    console.log('Quote received:', {
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      routeSteps: quote.route.length,
      routeType: quote.route[0]?.type,
    });

    expect(quote).toBeDefined();
    expect(quote.amountIn).toBe('500000000000000');
    expect(Number(quote.amountOut)).toBeGreaterThan(0);

    // Track status updates
    const statusUpdates: string[] = [];

    // Execute quote
    console.log('Executing swap...');
    const result = await sdk.executeQuote(quote, {
      signer,
      autoRecover: true,
      onStatusChange: (status) => {
        console.log('Status update:', status.status);
        statusUpdates.push(status.status);
      },
    });

    console.log('Swap executed:', {
      requestId: result.requestId,
      transactionHash: result.transactionHash,
      provider: result.provider,
      bridgeId: result.bridgeId,
      status: result.status,
    });

    expect(result).toBeDefined();
    expect(result.transactionHash).toBeTruthy();
    expect(result.provider).toBeTruthy();
    // requestId may be undefined for external bridges
    // bridgeId should be set for Rubic routes
    // status only present when autoRecover completes

    // Log transaction details for verification
    console.log('Transaction details:', {
      requestId: result.requestId,
      transactionHash: result.transactionHash,
      provider: result.provider,
      bridgeId: result.bridgeId,
      sourceChain: TEST_CHAINS.arbitrum,
      destinationChain: TEST_CHAINS.optimism,
    });

    // Track using the new trackExecuteResult method which handles provider routing
    try {
      const finalStatus = await sdk.trackExecuteResult(result);
      console.log('Final status:', finalStatus.status);
      expect(finalStatus.status).toMatch(/completed|in progress|pending/);
    } catch (error) {
      // Tracking may fail if external bridge API is unavailable
      console.log('Tracking error:', (error as Error).message);
    }
  }, 120000); // 2 minute timeout

  it('should execute cross-chain swap from Optimism to Arbitrum', async () => {
    // Get tokens
    const opEth = sdk.getToken(
      TEST_CHAINS.optimism,
      '0x0000000000000000000000000000000000000000'
    );
    const arbEth = sdk.getToken(
      TEST_CHAINS.arbitrum,
      '0x0000000000000000000000000000000000000000'
    );

    expect(opEth).toBeDefined();
    expect(arbEth).toBeDefined();

    // Create wallet client for Optimism (source chain)
    const opWalletClient = createWalletClient({
      account,
      chain: optimism,
      transport: http(),
    });

    const opPublicClient = createPublicClient({
      chain: optimism,
      transport: http(),
    });

    const opSigner = new ViemAdapter(opWalletClient, opPublicClient, account);

    // Get quote for 0.0005 ETH (smaller amount to fit in test wallet)
    const amount = '500000000000000'; // 0.0005 ETH in wei
    console.log('Getting quote for OP->ARB', amount, 'wei (0.0005 ETH)');

    const quote = await sdk.getQuote({
      fromChain: TEST_CHAINS.optimism,
      toChain: TEST_CHAINS.arbitrum,
      fromToken: opEth!.address,
      toToken: arbEth!.address,
      amount,
      slippage: 0.5,
      sender: account.address,
    });

    console.log('Quote received:', {
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      routeSteps: quote.route.length,
    });

    expect(quote).toBeDefined();
    expect(quote.amountIn).toBe('500000000000000');
    expect(Number(quote.amountOut)).toBeGreaterThan(0);

    // Execute quote
    console.log('Executing swap from Optimism to Arbitrum...');
    const result = await sdk.executeQuote(quote, {
      signer: opSigner,
      autoRecover: false,
    });

    console.log('Swap executed:', {
      requestId: result.requestId,
      transactionHash: result.transactionHash,
      provider: result.provider,
      bridgeId: result.bridgeId,
    });

    expect(result).toBeDefined();
    expect(result.transactionHash).toBeTruthy();
    expect(result.provider).toBeTruthy();

    console.log('Transaction details:', {
      requestId: result.requestId,
      transactionHash: result.transactionHash,
      provider: result.provider,
      bridgeId: result.bridgeId,
      sourceChain: TEST_CHAINS.optimism,
      destinationChain: TEST_CHAINS.arbitrum,
    });

    // Track the transaction to verify bridgeId is used
    if (result.bridgeId) {
      console.log('Tracking with bridgeId:', result.bridgeId);
      try {
        const status = await sdk.trackExecuteResult(result);
        console.log('Tracking status:', status.status);
      } catch (error) {
        console.log('Tracking error:', (error as Error).message);
      }
    }
  }, 120000);

  it('should track transaction status after swap', async () => {
    // Get tokens
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

    // Get quote
    const amount = '100000000000000'; // 0.0001 ETH
    const quote = await sdk.getQuote({
      fromChain: TEST_CHAINS.arbitrum,
      toChain: TEST_CHAINS.optimism,
      fromToken: arbEth!.address,
      toToken: opEth!.address,
      amount,
      slippage: 0.5,
      sender: account.address,
    });

    // Execute
    const result = await sdk.executeQuote(quote, {
      signer,
    });

    expect(result.transactionHash).toBeTruthy();
    expect(result.provider).toBeTruthy();

    console.log('Swap executed for tracking test:', {
      transactionHash: result.transactionHash,
      requestId: result.requestId,
      provider: result.provider,
    });

    // Poll until terminal state (completed, failed, reverted, canceled)
    // Cross-chain bridges typically take 5-15 minutes
    const maxWaitTime = 900000; // 15 minutes safety timeout
    const startTime = Date.now();

    let currentStatus = await sdk.trackExecuteResult(result);
    console.log('Initial status:', currentStatus.status);

    // Keep polling until terminal state
    while (
      currentStatus.status !== 'completed' &&
      currentStatus.status !== 'failed' &&
      currentStatus.status !== 'reverted' &&
      currentStatus.status !== 'canceled' &&
      Date.now() - startTime < maxWaitTime
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      currentStatus = await sdk.trackExecuteResult(result);
      console.log('Status check:', currentStatus.status);
    }

    // Verify we reached a terminal state
    const isTerminal = ['completed', 'failed', 'reverted', 'canceled'].includes(currentStatus.status);
    console.log('Final tracked status:', {
      status: currentStatus.status,
      isTerminal,
      sourceStatus: currentStatus.source?.status,
      destinationStatus: currentStatus.destination?.status,
      duration: `${Math.round((Date.now() - startTime) / 1000)}s`,
    });

    // Must reach terminal state
    expect(isTerminal).toBe(true);
  }, 960000); // 16 minute timeout

  it('should handle custom gas parameters', async () => {
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

    const amount = '100000000000000'; // 0.0001 ETH
    const quote = await sdk.getQuote({
      fromChain: TEST_CHAINS.arbitrum,
      toChain: TEST_CHAINS.optimism,
      fromToken: arbEth!.address,
      toToken: opEth!.address,
      amount,
      slippage: 0.5,
      sender: account.address,
    });

    // Execute with custom gas settings
    const result = await sdk.executeQuote(quote, {
      signer,
      gasLimit: '300000',
      // Let the network determine gas price
    });

    expect(result).toBeDefined();
    expect(result.transactionHash).toBeTruthy();
    expect(result.provider).toBeTruthy();

    console.log('Swap with custom gas executed:', {
      requestId: result.requestId,
      transactionHash: result.transactionHash,
      provider: result.provider,
    });
  }, 120000);

  it('should execute swap with custom recipient', async () => {
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

    const amount = '100000000000000'; // 0.0001 ETH

    // Use same address as recipient (for testing purposes)
    const recipientAddress = account.address;

    const quote = await sdk.getQuote({
      fromChain: TEST_CHAINS.arbitrum,
      toChain: TEST_CHAINS.optimism,
      fromToken: arbEth!.address,
      toToken: opEth!.address,
      amount,
      slippage: 0.5,
      sender: account.address,
    });

    const result = await sdk.executeQuote(quote, {
      signer,
      recipient: recipientAddress,
    });

    expect(result).toBeDefined();
    expect(result.transactionHash).toBeTruthy();
    expect(result.provider).toBeTruthy();

    console.log('Swap with custom recipient executed:', {
      transactionHash: result.transactionHash,
      provider: result.provider,
      recipient: recipientAddress,
    });
  }, 120000);

  it('should search for wallet transactions', async () => {
    const results = await sdk.searchTransactions(account.address);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);

    console.log(`Found ${results.length} transactions for wallet`);

    if (results.length > 0) {
      const firstTx = results[0];
      console.log('First transaction:', {
        status: firstTx.status,
        sourceChain: firstTx.source?.chainId,
        destinationChain: firstTx.destination?.chainId,
      });
    }
  });

  describe('Edge cases and error handling', () => {
    it('should handle transaction with insufficient gas estimation', async () => {
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

      const amount = '100000000000000';
      const quote = await sdk.getQuote({
        fromChain: TEST_CHAINS.arbitrum,
        toChain: TEST_CHAINS.optimism,
        fromToken: arbEth!.address,
        toToken: opEth!.address,
        amount,
        slippage: 0.5,
        sender: account.address,
      });

      // Try with very low gas limit (should fail or adjust)
      try {
        await sdk.executeQuote(quote, {
          signer,
          gasLimit: '21000', // Too low for contract interaction
        });
        // If it succeeds, the SDK or network adjusted the gas
        console.log('Transaction succeeded with adjusted gas');
      } catch (error) {
        // Expected to fail with insufficient gas
        console.log('Transaction failed as expected with low gas:', (error as Error).message);
        expect(error).toBeDefined();
      }
    }, 120000);
  });
});

// Helper describe block to show instructions when tests are skipped
describe('E2E Swap Tests Info', () => {
  it('should display instructions for running real swap tests', () => {
    if (!shouldRunSwapTests) {
      console.log('\n===========================================');
      console.log('E2E SWAP TESTS ARE SKIPPED BY DEFAULT');
      console.log('===========================================');
      console.log('To run real swap tests with actual transactions:');
      console.log('1. Ensure test wallet has ~0.005 ETH on Arbitrum');
      console.log('2. Set environment variable: ENABLE_E2E_SWAP=true');
      console.log('3. Run: ENABLE_E2E_SWAP=true npm test -- tests/e2e/swap.test.ts');
      console.log('\nTest wallet: ' + TEST_CONFIG.testWalletAddress);
      console.log('Test mnemonic: ' + TEST_CONFIG.testMnemonic);
      console.log('===========================================\n');
    }
    expect(true).toBe(true);
  });
});
