import { describe, it, expect, beforeAll } from 'vitest';
import { custom } from 'viem';
import { sepolia } from 'viem/chains';
import { createPaymasterClient } from 'viem/account-abstraction';
import { to7702SimpleSmartAccount } from 'permissionless/accounts';
import { createSmartAccountClient } from 'permissionless/clients';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { CrossCurveSDK } from '../../../src/index.js';
import type { AATransaction } from '../../../src/index.js';
import {
  TESTNET_TOKENS,
  TESTNET_CHAINS,
  SWAP_AMOUNT,
  SIMPLE_7702_IMPL,
} from '../helpers/tokens.js';
import { getAccount, createPublicClientForChain } from '../helpers/wallet.js';
import { getBalances, calcDelta } from '../helpers/balance.js';
import { pollUntil } from '../helpers/polling.js';
import { pimlicoRpc } from '../helpers/pimlico.js';

describe('erc7702 basic flow', () => {
  let sdk: CrossCurveSDK;
  const owner = getAccount();
  let sepoliaClient: ReturnType<typeof createPublicClientForChain>;

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: process.env.E2E_API_BASE_URL,
      apiKey: process.env.E2E_API_KEY,
    });
    await sdk.init();
    sepoliaClient = createPublicClientForChain(TESTNET_CHAINS.SEPOLIA);
  });

  it('should execute swap via 7702 delegated EOA with ERC-20 gas', async () => {
    // Step 1: Get quote (7702 uses EOA address, not separate wallet)
    const quotes = await sdk.routing.scan({
      params: {
        tokenIn: TESTNET_TOKENS.SEPOLIA_USDT.address,
        amountIn: SWAP_AMOUNT,
        chainIdIn: TESTNET_CHAINS.SEPOLIA,
        tokenOut: TESTNET_TOKENS.ARB_SEPOLIA_USDT.address,
        chainIdOut: TESTNET_CHAINS.ARB_SEPOLIA,
      },
      slippage: 3,
      from: owner.address,
      recipient: owner.address,
    });
    expect(quotes.length).toBeGreaterThan(0);
    const quote = quotes[0];

    // Step 2: Create 7702 AA transaction via SDK
    const aaTx: AATransaction = await sdk.aa.createTransaction({
      quote,
      from: owner.address,
      walletType: '7702',
      gasToken: TESTNET_TOKENS.SEPOLIA_USDC.address,
    });

    expect(aaTx.walletType).toBe('7702');
    expect(aaTx.calls.length).toBeGreaterThan(0);
    expect(aaTx.entryPoint).toBeTruthy();
    expect(aaTx.pimlicoChainName).toBeTruthy();

    const { calls, pimlicoChainName, paymasterContext } = aaTx;

    // Step 3: Create 7702 smart account
    const pimlicoTransport = custom({
      async request({ method, params }) {
        return pimlicoRpc(sdk, pimlicoChainName!, method, params);
      },
    });

    // PimlicoClient provides getUserOperationGasPrice
    const pimlicoClient = createPimlicoClient({
      transport: pimlicoTransport,
      chain: sepolia,
    });

    // PaymasterClient (from viem) provides getPaymasterData / getPaymasterStubData
    const paymasterClient = createPaymasterClient({ transport: pimlicoTransport });

    const smartAccount = await to7702SimpleSmartAccount({
      client: sepoliaClient,
      owner,
      address: owner.address,
      implementation: SIMPLE_7702_IMPL as `0x${string}`,
    });

    // Step 4: Create smart account client with paymaster
    const smartAccountClient = createSmartAccountClient({
      client: sepoliaClient,
      account: smartAccount,
      chain: sepolia,
      bundlerTransport: pimlicoTransport,
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
      userOperation: {
        estimateFeesPerGas: async () =>
          (await pimlicoClient.getUserOperationGasPrice()).fast,
      },
    });

    // Step 5: Snapshot before
    const dstClient = createPublicClientForChain(TESTNET_CHAINS.ARB_SEPOLIA);
    const beforeSrc = await getBalances(
      sepoliaClient,
      owner.address,
      [TESTNET_TOKENS.SEPOLIA_USDT.address, TESTNET_TOKENS.SEPOLIA_USDC.address],
    );
    const beforeDst = await getBalances(
      dstClient,
      owner.address,
      [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address],
    );

    // Step 6: Send transaction (includes 7702 authorization automatically)
    const txHash = await smartAccountClient.sendTransaction({
      calls: calls.map((c) => ({
        to: c.to as `0x${string}`,
        value: BigInt(c.value),
        data: c.data as `0x${string}`,
      })),
    });

    expect(txHash).toMatch(/^0x/);

    // Wait for confirmation
    const txReceipt = await sepoliaClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 120_000,
    });
    expect(txReceipt.status).toBe('success');

    // Step 7: Verify source changes
    const afterSrc = await getBalances(
      sepoliaClient,
      owner.address,
      [TESTNET_TOKENS.SEPOLIA_USDT.address, TESTNET_TOKENS.SEPOLIA_USDC.address],
    );
    const srcDelta = calcDelta(beforeSrc, afterSrc);

    // USDT decreased (swap amount)
    expect(
      srcDelta.tokens.get(TESTNET_TOKENS.SEPOLIA_USDT.address.toLowerCase()) ?? 0n,
    ).toBeLessThan(0n);

    // USDC decreased (gas)
    expect(
      srcDelta.tokens.get(TESTNET_TOKENS.SEPOLIA_USDC.address.toLowerCase()) ?? 0n,
    ).toBeLessThan(0n);

    // Step 8: Poll destination
    const afterDst = await pollUntil(
      () => getBalances(dstClient, owner.address, [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address]),
      (snapshot) => {
        const delta = calcDelta(beforeDst, snapshot);
        return (delta.tokens.get(TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase()) ?? 0n) > 0n;
      },
      { timeout: 300_000, interval: 15_000, label: '7702 bridge delivery' },
    );

    const dstDelta = calcDelta(beforeDst, afterDst);
    expect(
      dstDelta.tokens.get(TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase()) ?? 0n,
    ).toBeGreaterThan(0n);
  });
});
