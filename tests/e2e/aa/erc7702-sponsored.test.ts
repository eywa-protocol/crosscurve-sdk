import { describe, it, expect, beforeAll } from 'vitest';
import { custom, encodeFunctionData, parseAbi } from 'viem';
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
  ENTRYPOINT_V08,
  SIMPLE_7702_IMPL,
  PIMLICO_PM_V08,
} from '../helpers/tokens.js';
import { getAccount, createPublicClientForChain } from '../helpers/wallet.js';
import { getBalances, calcDelta } from '../helpers/balance.js';
import { pollUntil } from '../helpers/polling.js';
import { pimlicoRpc } from '../helpers/pimlico.js';

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
]);
const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

describe('erc7702 sponsored paymaster', () => {
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

  it('should execute swap with custom paymaster via 7702', async () => {
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
      from: owner.address,
      recipient: owner.address,
    });
    const quote = quotes[0];

    // Sponsored mode: custom PM, no gasToken
    const aaTx: AATransaction = await sdk.aa.createTransaction({
      quote,
      from: owner.address,
      walletType: '7702',
      paymasterAddress: PIMLICO_PM_V08,
      entryPoint: ENTRYPOINT_V08,
    });

    expect(aaTx.calls.length).toBeGreaterThan(0);
    expect(aaTx.paymasterContext?.token).toBe(
      '0x0000000000000000000000000000000000000000',
    );
    expect(aaTx.pimlicoChainName).toBeFalsy();

    // Integrator prepends PM approve
    const integratorCalls = [
      {
        to: TESTNET_TOKENS.SEPOLIA_USDC.address as `0x${string}`,
        value: 0n,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [PIMLICO_PM_V08 as `0x${string}`, MAX_UINT256],
        }),
      },
      ...aaTx.calls.map((c) => ({
        to: c.to as `0x${string}`,
        value: BigInt(c.value),
        data: c.data as `0x${string}`,
      })),
    ];

    // Setup 7702 account + client
    const pimlicoTransport = custom({
      async request({ method, params }) {
        return pimlicoRpc(sdk, 'sepolia', method, params);
      },
    });

    const pimlicoClient = createPimlicoClient({
      transport: pimlicoTransport,
      chain: sepolia,
    });

    const paymasterClient = createPaymasterClient({ transport: pimlicoTransport });

    const smartAccount = await to7702SimpleSmartAccount({
      client: sepoliaClient,
      owner,
      address: owner.address,
      implementation: SIMPLE_7702_IMPL as `0x${string}`,
    });

    const integratorPmContext = { token: TESTNET_TOKENS.SEPOLIA_USDC.address };

    const smartAccountClient = createSmartAccountClient({
      client: sepoliaClient,
      account: smartAccount,
      chain: sepolia,
      bundlerTransport: pimlicoTransport,
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
      userOperation: {
        estimateFeesPerGas: async () =>
          (await pimlicoClient.getUserOperationGasPrice()).fast,
      },
    });

    // Snapshot + execute
    const dstClient = createPublicClientForChain(TESTNET_CHAINS.ARB_SEPOLIA);
    const beforeDst = await getBalances(
      dstClient, owner.address,
      [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address],
    );

    const txHash = await smartAccountClient.sendTransaction({
      calls: integratorCalls,
    });
    expect(txHash).toMatch(/^0x/);

    const txReceipt = await sepoliaClient.waitForTransactionReceipt({
      hash: txHash, timeout: 120_000,
    });
    expect(txReceipt.status).toBe('success');

    // Poll delivery
    const afterDst = await pollUntil(
      () => getBalances(dstClient, owner.address, [TESTNET_TOKENS.ARB_SEPOLIA_USDT.address]),
      (snapshot) => {
        const delta = calcDelta(beforeDst, snapshot);
        return (delta.tokens.get(TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase()) ?? 0n) > 0n;
      },
      { timeout: 300_000, interval: 15_000, label: '7702 sponsored delivery' },
    );

    const dstDelta = calcDelta(beforeDst, afterDst);
    expect(
      dstDelta.tokens.get(TESTNET_TOKENS.ARB_SEPOLIA_USDT.address.toLowerCase()) ?? 0n,
    ).toBeGreaterThan(0n);
  });
});
