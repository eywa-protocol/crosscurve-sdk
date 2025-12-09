/**
 * E2E Test: ETH on Arbitrum -> OP token on Optimism
 *
 * Tests cross-chain swap with different tokens (native ETH → ERC20 OP)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createWalletClient, createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';
import { mnemonicToAccount } from 'viem/accounts';
import { CrossCurveSDK } from '../../src/sdk.js';
import { ViemAdapter } from '../../src/infrastructure/adapters/ViemAdapter.js';
import { TEST_CONFIG, TEST_CHAINS } from '../setup.js';
import { RouteProvider } from '../../src/constants/providers.js';

const shouldRun = process.env.ENABLE_E2E_SWAP === 'true' && !!TEST_CONFIG.testMnemonic;
const describeOrSkip = shouldRun ? describe : describe.skip;

// Token addresses
const ETH_NATIVE = '0x0000000000000000000000000000000000000000';
const OP_TOKEN = '0x4200000000000000000000000000000000000042'; // OP token on Optimism

describeOrSkip('ETH to OP Token Swap', () => {
  let sdk: CrossCurveSDK;
  let signer: ViemAdapter;
  let account: ReturnType<typeof mnemonicToAccount>;

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: TEST_CONFIG.apiBaseUrl,
    });
    await sdk.init();

    account = mnemonicToAccount(TEST_CONFIG.testMnemonic!);

    const walletClient = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(),
    });

    signer = new ViemAdapter(walletClient, publicClient, account);
    console.log('Wallet:', account.address);
  });

  it('should swap 0.0003 ETH (Arbitrum) to OP token (Optimism) with tracking', async () => {
    const amount = '300000000000000'; // 0.0003 ETH
    const statusUpdates: string[] = [];

    console.log('Getting quote: 0.0003 ETH (ARB) -> OP token (Optimism)...');

    const quote = await sdk.getQuote({
      fromChain: TEST_CHAINS.arbitrum,
      toChain: TEST_CHAINS.optimism,
      fromToken: ETH_NATIVE,
      toToken: OP_TOKEN,
      amount,
      slippage: 1.0,
      sender: account.address,
      providers: [RouteProvider.BUNGEE],
    });

    console.log('Quote:', {
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      amountOutFormatted: (Number(quote.amountOut) / 1e18).toFixed(4) + ' OP',
      routeSteps: quote.route.length,
      routeTypes: quote.route.map((r) => r.type),
    });

    expect(quote.amountIn).toBe(amount);
    expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);

    console.log('Executing swap with tracking...');
    const result = await sdk.executeQuote(quote, {
      signer,
      autoRecover: true,
      onStatusChange: (status) => {
        console.log('Status:', status.status);
        statusUpdates.push(status.status);
      },
    });

    console.log('Result:', {
      txHash: result.transactionHash,
      requestId: result.requestId,
      provider: result.provider,
      bridgeId: result.bridgeId,
      finalStatus: result.status?.status,
    });

    expect(result.transactionHash).toBeTruthy();
    expect(statusUpdates.length).toBeGreaterThan(0);

    console.log('TX Hash:', result.transactionHash);
    console.log('View on Arbiscan: https://arbiscan.io/tx/' + result.transactionHash);
    console.log('Status progression:', statusUpdates.join(' -> '));

    // Verify final status is terminal
    const finalStatus = result.status?.status;
    expect(['completed', 'failed', 'reverted']).toContain(finalStatus);
  }, 600000); // 10 min timeout for cross-chain with swap
});
