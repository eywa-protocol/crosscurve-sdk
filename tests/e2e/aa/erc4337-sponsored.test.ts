import { describe, it, expect, beforeAll } from 'vitest';
import { custom, encodeFunctionData, parseAbi } from 'viem';
import {
  createBundlerClient,
  createPaymasterClient,
  toCoinbaseSmartAccount,
} from 'viem/account-abstraction';
import { sepolia } from 'viem/chains';
import { CrossCurveSDK } from '../../../src/index.js';
import type { AATransaction } from '../../../src/index.js';
import {
  TESTNET_TOKENS,
  TESTNET_CHAINS,
  SWAP_AMOUNT,
  PIMLICO_PM_V06,
  ENTRYPOINT_V06,
} from '../helpers/tokens.js';
import { getAccount, createPublicClientForChain } from '../helpers/wallet.js';
import { getBalances, calcDelta } from '../helpers/balance.js';
import { pollUntil } from '../helpers/polling.js';
import { pimlicoRpc } from '../helpers/pimlico.js';

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
]);
const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

describe('erc4337 sponsored paymaster', () => {
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

  it('should execute swap with custom paymaster (integrator adds PM approve)', async () => {
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
    });
    const quote = quotes[0];

    // Create AA tx in sponsored mode (no gasToken, custom PM)
    const aaTx: AATransaction = await sdk.aa.createTransaction({
      quote,
      from: smartAccount.address,
      recipient: owner.address,
      walletType: '4337',
      paymasterAddress: PIMLICO_PM_V06,
      entryPoint: ENTRYPOINT_V06,
    });

    // Verify sponsored mode response
    expect(aaTx.calls.length).toBeGreaterThan(0);
    // In sponsored mode: paymasterContext.token should be zero address
    expect(aaTx.paymasterContext.token).toBe(
      '0x0000000000000000000000000000000000000000',
    );
    // No pimlicoChainName in sponsored mode
    expect(aaTx.pimlicoChainName).toBeFalsy();

    // Integrator builds own calls: prepend PM approve
    const integratorCalls = [
      {
        to: TESTNET_TOKENS.SEPOLIA_USDC.address as `0x${string}`,
        value: 0n,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [PIMLICO_PM_V06 as `0x${string}`, MAX_UINT256],
        }),
      },
      ...aaTx.calls.map((c) => ({
        to: c.to as `0x${string}`,
        value: BigInt(c.value),
        data: c.data as `0x${string}`,
      })),
    ];

    // Snapshot before
    const dstClient = createPublicClientForChain(TESTNET_CHAINS.ARB_SEPOLIA);
    const beforeDst = await getBalances(
      dstClient, owner.address,
      [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address],
    );

    // Integrator provides own paymaster context
    const integratorPmContext = { token: TESTNET_TOKENS.SEPOLIA_USDC.address };

    // Use SDK pimlico proxy but with integrator's paymaster context
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
            ...params, context: integratorPmContext,
          });
        },
        async getPaymasterStubData(params) {
          return paymasterClient.getPaymasterStubData({
            ...params, context: integratorPmContext,
          });
        },
      },
    });

    const gasPrice = await pimlicoRpc(
      sdk, 'sepolia', 'pimlico_getUserOperationGasPrice', [],
    ) as { fast: { maxFeePerGas: string; maxPriorityFeePerGas: string } };

    const userOpHash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: integratorCalls,
      maxFeePerGas: BigInt(gasPrice.fast.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(gasPrice.fast.maxPriorityFeePerGas),
    });

    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash, timeout: 120_000,
    });
    expect(receipt.success).toBe(true);

    // Poll for delivery
    const afterDst = await pollUntil(
      () => getBalances(dstClient, owner.address, [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address]),
      (snapshot) => {
        const delta = calcDelta(beforeDst, snapshot);
        return (delta.tokens.get(TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase()) ?? 0n) > 0n;
      },
      { timeout: 300_000, interval: 15_000, label: '4337 sponsored delivery' },
    );

    const dstDelta = calcDelta(beforeDst, afterDst);
    expect(
      dstDelta.tokens.get(TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase()) ?? 0n,
    ).toBeGreaterThan(0n);
  });
});
