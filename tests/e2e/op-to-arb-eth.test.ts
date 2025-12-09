/**
 * E2E test: Swap OP token (Optimism) to ETH (Arbitrum)
 *
 * Uses funds on Optimism which has higher balance
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createWalletClient, createPublicClient, http, formatUnits } from 'viem';
import { optimism } from 'viem/chains';
import { mnemonicToAccount } from 'viem/accounts';
import { CrossCurveSDK } from '../../src/sdk.js';
import { ViemAdapter } from '../../src/infrastructure/adapters/ViemAdapter.js';
import { TEST_CONFIG } from '../setup.js';

const shouldRun = process.env.ENABLE_E2E_SWAP === 'true' && !!TEST_CONFIG.testMnemonic;
const describeOrSkip = shouldRun ? describe : describe.skip;

// OP token on Optimism
const OP_TOKEN = '0x4200000000000000000000000000000000000042';
// Native ETH
const NATIVE_ETH = '0x0000000000000000000000000000000000000000';

describeOrSkip('OP Token to ARB ETH Swap', () => {
  let sdk: CrossCurveSDK;
  let opSigner: ViemAdapter;
  let walletAddress: string;

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: TEST_CONFIG.apiBaseUrl,
    });
    await sdk.init();

    if (!TEST_CONFIG.testMnemonic) {
      throw new Error('TEST_MNEMONIC required');
    }

    const account = mnemonicToAccount(TEST_CONFIG.testMnemonic);
    walletAddress = account.address;

    const walletClient = createWalletClient({
      account,
      chain: optimism,
      transport: http(),
    });
    const publicClient = createPublicClient({
      chain: optimism,
      transport: http(),
    });

    opSigner = new ViemAdapter(walletClient, publicClient, account);

    console.log('Wallet:', walletAddress);
  });

  it('should swap OP token (Optimism) to ETH (Arbitrum) with tracking', async () => {
    // Swap ~0.5 OP token (18 decimals)
    const amount = '500000000000000000'; // 0.5 OP
    const statusUpdates: string[] = [];

    console.log('Getting quote: 0.5 OP (Optimism) -> ETH (Arbitrum)...');

    const quote = await sdk.getQuote({
      fromChain: 10, // Optimism
      toChain: 42161, // Arbitrum
      fromToken: OP_TOKEN,
      toToken: NATIVE_ETH,
      amount,
      slippage: 1,
      sender: walletAddress,
    });

    console.log('Quote:', {
      amountIn: quote.amountIn,
      amountInFormatted: formatUnits(BigInt(quote.amountIn), 18) + ' OP',
      amountOut: quote.amountOut,
      amountOutFormatted: formatUnits(BigInt(quote.amountOut), 18) + ' ETH',
      routeSteps: quote.route.length,
      routeTypes: quote.route.map((r) => r.type),
    });

    expect(quote.amountIn).toBe(amount);
    expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);

    console.log('Executing swap with tracking...');

    const result = await sdk.executeQuote(quote, {
      signer: opSigner,
      autoRecover: true,
      onStatusChange: (status) => {
        const update = `Status: ${status.status} | Source: ${status.source?.status} | Dest: ${status.destination?.status}`;
        if (!statusUpdates.includes(update)) {
          statusUpdates.push(update);
          console.log(update);
        }
      },
    });

    console.log('Result:', {
      txHash: result.transactionHash,
      requestId: result.requestId,
      provider: result.provider,
      finalStatus: result.status?.status,
    });

    expect(result.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.status?.status).toBe('completed');
  }, 600000); // 10 min timeout for cross-chain
});
