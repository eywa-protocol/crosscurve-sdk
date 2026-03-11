import { describe, it, expect, beforeAll } from 'vitest';
import { CrossCurveSDK, ViemAdapter } from '../../../src/index.js';
import type { Quote } from '../../../src/index.js';
import { TESTNET_TOKENS, TESTNET_CHAINS, SWAP_AMOUNT } from '../helpers/tokens.js';
import {
  getAccount,
  createPublicClientForChain,
  createWalletClientForChain,
} from '../helpers/wallet.js';
import { getBalances, calcDelta } from '../helpers/balance.js';
import { pollUntil } from '../helpers/polling.js';

describe('cross-chain swap', () => {
  let sdk: CrossCurveSDK;
  const account = getAccount();

  const srcTokens = [
    TESTNET_TOKENS.SEPOLIA_USDT.address,
  ];
  const dstTokens = [
    TESTNET_TOKENS.ARB_SEPOLIA_USDT.address,
  ];

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: process.env.E2E_API_BASE_URL,
      apiKey: process.env.E2E_API_KEY,
    });
    await sdk.init();
  });

  it('should execute USDT Sepolia → USDT Arb Sepolia swap', async () => {
    // Step 1: Get quote
    const quote = await sdk.getQuote({
      fromChain: TESTNET_CHAINS.SEPOLIA,
      toChain: TESTNET_CHAINS.ARB_SEPOLIA,
      fromToken: TESTNET_TOKENS.SEPOLIA_USDT.address,
      toToken: TESTNET_TOKENS.ARB_SEPOLIA_USDT.address,
      amount: SWAP_AMOUNT,
      slippage: 3,
      sender: account.address,
    });

    expect(quote).toBeTruthy();
    expect(BigInt(quote.amountOut)).toBeGreaterThan(0n);

    // Step 2: Snapshot balances
    const srcClient = createPublicClientForChain(TESTNET_CHAINS.SEPOLIA);
    const dstClient = createPublicClientForChain(TESTNET_CHAINS.ARB_SEPOLIA);

    const beforeSrc = await getBalances(srcClient, account.address, srcTokens);
    const beforeDst = await getBalances(dstClient, account.address, dstTokens);

    // Step 3: Execute
    const walletClient = createWalletClientForChain(TESTNET_CHAINS.SEPOLIA);
    const signer = new ViemAdapter(walletClient, srcClient, account);

    const result = await sdk.executeQuote(quote, { signer });

    expect(result.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.provider).toBeTruthy();

    // Step 4: Track
    const status = await sdk.trackExecuteResult(result);
    expect(status).toBeTruthy();

    // Step 5: Wait for bridge delivery (poll destination balance)
    const afterDst = await pollUntil(
      () => getBalances(dstClient, account.address, dstTokens),
      (snapshot) => {
        const delta = calcDelta(beforeDst, snapshot);
        const received = delta.tokens.get(
          TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase(),
        ) ?? 0n;
        return received > 0n;
      },
      { timeout: 300_000, interval: 15_000, label: 'bridge delivery' },
    );

    // Step 6: Verify balance changes
    const afterSrc = await getBalances(srcClient, account.address, srcTokens);
    const srcDelta = calcDelta(beforeSrc, afterSrc);
    const dstDelta = calcDelta(beforeDst, afterDst);

    // Source USDT should have decreased
    const srcUsdt = srcDelta.tokens.get(
      TESTNET_TOKENS.SEPOLIA_USDT.address.toLowerCase(),
    ) ?? 0n;
    expect(srcUsdt).toBeLessThan(0n);

    // Destination USDT should have increased
    const dstUsdt = dstDelta.tokens.get(
      TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase(),
    ) ?? 0n;
    expect(dstUsdt).toBeGreaterThan(0n);
  });
});
