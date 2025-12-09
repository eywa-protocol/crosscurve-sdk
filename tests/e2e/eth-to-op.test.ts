/**
 * E2E Test: ETH on Arbitrum -> ETH on Optimism
 *
 * Tests cross-chain native token bridging with tracking
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

describeOrSkip('ETH to ETH Cross-Chain Bridge', () => {
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

  it('should bridge 0.0003 ETH from Arbitrum to Optimism with tracking', async () => {
    const amount = '300000000000000'; // 0.0003 ETH
    const statusUpdates: string[] = [];

    console.log('Getting quote for 0.0003 ETH ARB -> OP...');

    const quote = await sdk.getQuote({
      fromChain: TEST_CHAINS.arbitrum,
      toChain: TEST_CHAINS.optimism,
      fromToken: '0x0000000000000000000000000000000000000000',
      toToken: '0x0000000000000000000000000000000000000000',
      amount,
      slippage: 1.0,
      sender: account.address,
      providers: [RouteProvider.RUBIC],
    });

    console.log('Quote:', {
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      route: quote.route.map((r) => r.type),
    });

    expect(quote.amountIn).toBe(amount);
    expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);

    console.log('Executing with tracking...');
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
  }, 600000); // 10 min timeout
});
