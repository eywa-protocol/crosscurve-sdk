import { describe, it, expect, beforeAll } from 'vitest';
import {
  custom,
  encodeFunctionData,
  parseAbi,
} from 'viem';
import {
  createBundlerClient,
  createPaymasterClient,
  toCoinbaseSmartAccount,
} from 'viem/account-abstraction';
import { sepolia } from 'viem/chains';
import { CrossCurveSDK } from '../../../src/index.js';
import {
  TESTNET_TOKENS,
  TESTNET_CHAINS,
  SWAP_AMOUNT,
  PIMLICO_PM_V06,
} from '../helpers/tokens.js';
import { getAccount, createPublicClientForChain } from '../helpers/wallet.js';
import { getBalances, calcDelta } from '../helpers/balance.js';
import { pollUntil } from '../helpers/polling.js';
import { pimlicoRpc } from '../helpers/pimlico.js';
import { ensureSmartAccountReady } from '../helpers/smart-account.js';

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
]);
const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

describe('erc4337 calldataonly', () => {
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
    smartAccount = await toCoinbaseSmartAccount({
      client: sepoliaClient, owners: [owner], version: '1.1',
    });
    await ensureSmartAccountReady(sdk, sepoliaClient, smartAccount, owner);
  });

  it('should execute swap from raw calldata', async () => {
    // Get quote
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
      recipient: owner.address,
    });
    const quote = quotes[0];

    // Call API directly with walletType + calldataOnly to get pre-encoded data
    const baseUrl = process.env.E2E_API_BASE_URL!;
    const apiKey = process.env.E2E_API_KEY!;
    const cdRes = await fetch(`${baseUrl}/tx/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        from: smartAccount.address,
        recipient: owner.address,
        routing: quote,
        walletType: '4337',
        calldataOnly: true,
      }),
    });
    expect(cdRes.ok).toBe(true);
    const cdResp = await cdRes.json() as Record<string, unknown>;

    // Validate pre-encoded calldataOnly response
    expect(cdResp.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(typeof cdResp.value).toBe('string');
    expect(typeof cdResp.data).toBe('string');
    expect((cdResp.data as string).startsWith('0x')).toBe(true);

    const encodedData = cdResp.data as `0x${string}`;

    // Build calls manually (integrator responsibility)
    const calls: { to: `0x${string}`; value: bigint; data: `0x${string}` }[] = [];

    // 1. PM approve (USDC → Pimlico paymaster)
    calls.push({
      to: TESTNET_TOKENS.SEPOLIA_USDC.address as `0x${string}`,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [PIMLICO_PM_V06 as `0x${string}`, MAX_UINT256],
      }),
    });

    // 2. Router approve (tokenIn → router) — use MAX to avoid allowance edge cases
    calls.push({
      to: TESTNET_TOKENS.SEPOLIA_USDT.address as `0x${string}`,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [cdResp.to as `0x${string}`, MAX_UINT256],
      }),
    });

    // 3. Raw router call from calldataOnly response
    calls.push({
      to: cdResp.to as `0x${string}`,
      value: BigInt(cdResp.value as string),
      data: encodedData,
    });

    // Snapshot
    const dstClient = createPublicClientForChain(TESTNET_CHAINS.ARB_SEPOLIA);
    const beforeDst = await getBalances(
      dstClient, owner.address,
      [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address],
    );

    // Send UserOp
    const pimlicoTransport = custom({
      async request({ method, params }) {
        return pimlicoRpc(sdk, 'sepolia', method, params);
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
            ...params, context: { token: TESTNET_TOKENS.SEPOLIA_USDC.address },
          });
        },
        async getPaymasterStubData(params) {
          return paymasterClient.getPaymasterStubData({
            ...params, context: { token: TESTNET_TOKENS.SEPOLIA_USDC.address },
          });
        },
      },
    });

    const gasPrice = await pimlicoRpc(
      sdk, 'sepolia', 'pimlico_getUserOperationGasPrice', [],
    ) as { fast: { maxFeePerGas: string; maxPriorityFeePerGas: string } };

    const userOpHash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls,
      maxFeePerGas: BigInt(gasPrice.fast.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(gasPrice.fast.maxPriorityFeePerGas),
    });

    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash, timeout: 120_000,
    });
    expect(receipt.success).toBe(true);

    // Poll delivery
    const afterDst = await pollUntil(
      () => getBalances(dstClient, owner.address, [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address]),
      (snapshot) => {
        const delta = calcDelta(beforeDst, snapshot);
        return (delta.tokens.get(TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase()) ?? 0n) > 0n;
      },
      { timeout: 300_000, interval: 15_000, label: 'calldataonly delivery' },
    );

    const dstDelta = calcDelta(beforeDst, afterDst);
    expect(
      dstDelta.tokens.get(TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase()) ?? 0n,
    ).toBeGreaterThan(0n);
  });
});
