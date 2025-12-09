/**
 * E2E test: Bridge ETH from Optimism to Arbitrum via Bungee
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createWalletClient, createPublicClient, http, formatUnits } from 'viem';
import { optimism } from 'viem/chains';
import { mnemonicToAccount } from 'viem/accounts';
import { CrossCurveSDK } from '../../src/sdk.js';
import { ViemAdapter } from '../../src/infrastructure/adapters/ViemAdapter.js';
import { TEST_CONFIG } from '../setup.js';
import { RouteProvider } from '../../src/constants/providers.js';

const shouldRun = process.env.ENABLE_E2E_SWAP === 'true' && !!TEST_CONFIG.testMnemonic;
const describeOrSkip = shouldRun ? describe : describe.skip;

// Native ETH
const NATIVE_ETH = '0x0000000000000000000000000000000000000000';

describeOrSkip('ETH Bridge: Optimism to Arbitrum via Bungee', () => {
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

  it('should bridge ETH from Optimism to Arbitrum via Bungee', async () => {
    // Bridge all ETH minus gas reserve
    const publicClient = createPublicClient({
      chain: optimism,
      transport: http(),
    });
    const balance = await publicClient.getBalance({ address: walletAddress });
    const gasReserve = 300000000000000n; // 0.0003 ETH for gas
    const amountToBridge = balance - gasReserve;

    console.log('Current balance:', formatUnits(balance, 18), 'ETH');
    console.log('Gas reserve:', formatUnits(gasReserve, 18), 'ETH');

    if (amountToBridge <= 0n) {
      console.log('Not enough balance to bridge');
      return;
    }

    const amount = amountToBridge.toString();
    const statusUpdates: string[] = [];

    console.log('Getting quote:', formatUnits(amountToBridge, 18), 'ETH (Optimism) -> ETH (Arbitrum) via Bungee...');

    const quote = await sdk.getQuote({
      fromChain: 10, // Optimism
      toChain: 42161, // Arbitrum
      fromToken: NATIVE_ETH,
      toToken: NATIVE_ETH,
      amount,
      slippage: 1,
      sender: walletAddress,
      providers: [RouteProvider.BUNGEE],
    });

    console.log('Quote:', {
      amountIn: quote.amountIn,
      amountInFormatted: formatUnits(BigInt(quote.amountIn), 18) + ' ETH',
      amountOut: quote.amountOut,
      amountOutFormatted: formatUnits(BigInt(quote.amountOut), 18) + ' ETH',
      routeSteps: quote.route.length,
      routeTypes: quote.route.map((r) => r.type),
    });

    expect(quote.amountIn).toBe(amount);
    expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);
    expect(quote.route[0]?.type).toBe('bungee');

    console.log('Executing bridge with tracking...');

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
      provider: result.provider,
      bridgeId: result.bridgeId,
      finalStatus: result.status?.status,
    });

    expect(result.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.provider).toBe(RouteProvider.BUNGEE);
    expect(result.status?.status).toBe('completed');
  }, 600000); // 10 min timeout for cross-chain
});
