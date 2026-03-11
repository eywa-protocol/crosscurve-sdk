import { describe, it, expect, beforeAll } from 'vitest';
import { custom, encodeFunctionData, parseAbi } from 'viem';
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

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
]);
const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

/**
 * Normalize a calldataOnly response to always have encoded `data`.
 * The API may return either:
 *   - { to, data, value, chainId, feeToken, executionPrice }  (pre-encoded)
 *   - { to, abi, args, value, ... }                           (abi+args form)
 */
function resolveCalldata(resp: Record<string, unknown>): `0x${string}` {
  if (typeof resp.data === 'string' && resp.data.startsWith('0x')) {
    return resp.data as `0x${string}`;
  }
  if (typeof resp.abi === 'string' && Array.isArray(resp.args)) {
    const iface = parseAbi([resp.abi]);
    return encodeFunctionData({ abi: iface, args: resp.args as unknown[] });
  }
  throw new Error(`calldataOnly response has neither 'data' nor 'abi+args': ${JSON.stringify(resp)}`);
}

describe('erc4337 calldataonly', () => {
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

  it('should execute swap from raw calldata', async () => {
    const smartAccount = await toCoinbaseSmartAccount({
      client: sepoliaClient, owners: [owner], version: '1.1',
    });

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

    // Get raw calldata via sdk.tx.createCalldata
    const cdResp = await sdk.tx.createCalldata({
      from: smartAccount.address,
      recipient: owner.address,
      routing: quote,
    }) as unknown as Record<string, unknown>;

    // Validate calldataOnly response: to and value are always present
    expect(cdResp.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(typeof cdResp.value).toBe('string');

    // Either pre-encoded data OR abi+args must be present
    const hasData = typeof cdResp.data === 'string';
    const hasAbi = typeof cdResp.abi === 'string';
    expect(hasData || hasAbi).toBe(true);

    // Resolve calldata regardless of response shape
    const encodedData = resolveCalldata(cdResp);

    // feeToken and executionPrice may or may not be present depending on API version
    const feeToken = typeof cdResp.feeToken === 'string'
      ? cdResp.feeToken
      : '0x0000000000000000000000000000000000000000';
    const executionPrice = typeof cdResp.executionPrice === 'string'
      ? cdResp.executionPrice
      : '0';

    // Build calls manually (integrator responsibility)
    const isErc20Fee = feeToken !== '0x0000000000000000000000000000000000000000';
    const execPrice = BigInt(executionPrice);
    const amountIn = BigInt(quote.amountIn);

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

    // 2. Router approve (tokenIn → router)
    const buffer = amountIn / 1000n || 1n; // 0.1% buffer for rounding
    const approveAmount = isErc20Fee
      ? amountIn + execPrice + buffer
      : amountIn + buffer;
    calls.push({
      to: TESTNET_TOKENS.SEPOLIA_USDT.address as `0x${string}`,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [cdResp.to as `0x${string}`, approveAmount],
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
