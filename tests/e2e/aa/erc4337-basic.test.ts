import { describe, it, expect, beforeAll } from 'vitest';
import { createPublicClient, http, custom, formatUnits } from 'viem';
import {
  createBundlerClient,
  createPaymasterClient,
  toCoinbaseSmartAccount,
} from 'viem/account-abstraction';
import { sepolia } from 'viem/chains';
import { CrossCurveSDK } from '../../../src/index.js';
import type { Quote, AATransaction } from '../../../src/index.js';
import {
  TESTNET_TOKENS,
  TESTNET_CHAINS,
  SWAP_AMOUNT,
} from '../helpers/tokens.js';
import {
  getAccount,
  createPublicClientForChain,
} from '../helpers/wallet.js';
import { getBalances, calcDelta } from '../helpers/balance.js';
import { pollUntil } from '../helpers/polling.js';
import { pimlicoRpc } from '../helpers/pimlico.js';
import { ensureSmartAccountReady } from '../helpers/smart-account.js';

describe('erc4337 basic flow', () => {
  let sdk: CrossCurveSDK;
  const owner = getAccount();
  let sepoliaClient: ReturnType<typeof createPublicClientForChain>;
  let smartAccount: Awaited<ReturnType<typeof toCoinbaseSmartAccount>>;

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: process.env.E2E_API_BASE_URL,
      apiKey: process.env.E2E_API_KEY,
    });
    await sdk.init();
    sepoliaClient = createPublicClientForChain(TESTNET_CHAINS.SEPOLIA);

    // Create and ensure smart account is deployed + funded
    smartAccount = await toCoinbaseSmartAccount({
      client: sepoliaClient,
      owners: [owner],
      version: '1.1',
    });
    await ensureSmartAccountReady(sdk, sepoliaClient, smartAccount, owner);
  });

  it('should execute swap via 4337 smart account with ERC-20 gas', async () => {
    // Step 1: Get quote using smart wallet address
    const quotes = await sdk.routing.scan({
      params: {
        tokenIn: TESTNET_TOKENS.SEPOLIA_USDT.address,
        amountIn: SWAP_AMOUNT,
        chainIdIn: TESTNET_CHAINS.SEPOLIA,
        tokenOut: TESTNET_TOKENS.ARB_SEPOLIA_USDT.address,
        chainIdOut: TESTNET_CHAINS.ARB_SEPOLIA,
      },
      slippage: 3,
      from: smartAccount.address,
    });
    expect(quotes.length).toBeGreaterThan(0);
    const quote = quotes[0];

    // Step 3: Create AA transaction via SDK
    // recipient = owner EOA — bridge delivers to destination chain where
    // the Coinbase smart wallet may not exist at the same address
    const aaTx: AATransaction = await sdk.aa.createTransaction({
      quote,
      from: smartAccount.address,
      recipient: owner.address,
      walletType: '4337',
      gasToken: TESTNET_TOKENS.SEPOLIA_USDC.address,
    });

    expect(aaTx.walletType).toBe('4337');
    expect(aaTx.calls.length).toBeGreaterThan(0);
    expect(aaTx.pimlicoChainName).toBeTruthy();
    expect(aaTx.paymasterContext.token).toBeTruthy();

    const { calls, pimlicoChainName, paymasterContext } = aaTx;

    // Step 4: Snapshot balances before
    const dstClient = createPublicClientForChain(TESTNET_CHAINS.ARB_SEPOLIA);
    const beforeSrc = await getBalances(
      sepoliaClient,
      smartAccount.address,
      [TESTNET_TOKENS.SEPOLIA_USDT.address, TESTNET_TOKENS.SEPOLIA_USDC.address],
    );
    const beforeDst = await getBalances(
      dstClient,
      owner.address, // 4337: bridge delivers to EOA owner
      [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address],
    );

    // Step 5: Build and send UserOp via SDK pimlico proxy
    const pimlicoTransport = custom({
      async request({ method, params }) {
        return pimlicoRpc(sdk, pimlicoChainName!, method, params);
      },
    });

    const paymasterClient = createPaymasterClient({ transport: pimlicoTransport });
    const bundlerClient = createBundlerClient({
      client: sepoliaClient,
      chain: sepolia,
      transport: pimlicoTransport,
      paymaster: {
        async getPaymasterData(params) {
          return paymasterClient.getPaymasterData({
            ...params,
            context: { token: paymasterContext.token },
          });
        },
        async getPaymasterStubData(params) {
          return paymasterClient.getPaymasterStubData({
            ...params,
            context: { token: paymasterContext.token },
          });
        },
      },
    });

    // Get gas prices
    const gasPrice = await pimlicoRpc(
      sdk, pimlicoChainName!, 'pimlico_getUserOperationGasPrice', [],
    ) as { fast: { maxFeePerGas: string; maxPriorityFeePerGas: string } };

    // Send UserOp
    const userOpHash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: calls.map((c) => ({
        to: c.to as `0x${string}`,
        value: BigInt(c.value),
        data: c.data as `0x${string}`,
      })),
      maxFeePerGas: BigInt(gasPrice.fast.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(gasPrice.fast.maxPriorityFeePerGas),
    });

    expect(userOpHash).toBeTruthy();

    // Wait for receipt
    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
      timeout: 120_000,
    });
    expect(receipt.success).toBe(true);

    // Step 6: Verify source balance changes
    const afterSrc = await getBalances(
      sepoliaClient,
      smartAccount.address,
      [TESTNET_TOKENS.SEPOLIA_USDT.address, TESTNET_TOKENS.SEPOLIA_USDC.address],
    );
    const srcDelta = calcDelta(beforeSrc, afterSrc);

    // USDT should decrease (swap amount)
    const usdtSpent = srcDelta.tokens.get(
      TESTNET_TOKENS.SEPOLIA_USDT.address.toLowerCase(),
    ) ?? 0n;
    expect(usdtSpent).toBeLessThan(0n);

    // USDC should decrease (gas payment)
    const usdcSpent = srcDelta.tokens.get(
      TESTNET_TOKENS.SEPOLIA_USDC.address.toLowerCase(),
    ) ?? 0n;
    expect(usdcSpent).toBeLessThan(0n);

    // Step 7: Poll for bridge delivery
    const afterDst = await pollUntil(
      () => getBalances(
        dstClient,
        owner.address,
        [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address],
      ),
      (snapshot) => {
        const delta = calcDelta(beforeDst, snapshot);
        const received = delta.tokens.get(
          TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase(),
        ) ?? 0n;
        return received > 0n;
      },
      { timeout: 300_000, interval: 15_000, label: '4337 bridge delivery' },
    );

    const dstDelta = calcDelta(beforeDst, afterDst);
    const received = dstDelta.tokens.get(
      TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase(),
    ) ?? 0n;
    expect(received).toBeGreaterThan(0n);
  });
});
