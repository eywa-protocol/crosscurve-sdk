/**
 * Helper to ensure a Coinbase Smart Account is deployed and funded on Sepolia.
 * Used by ERC-4337 E2E tests that need a deployed smart wallet.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  parseAbi,
  encodeFunctionData,
  type PublicClient,
} from 'viem';
import {
  createBundlerClient,
  createPaymasterClient,
  toCoinbaseSmartAccount,
  type SmartAccount,
} from 'viem/account-abstraction';
import { sepolia } from 'viem/chains';
import type { PrivateKeyAccount } from 'viem/accounts';
import { TESTNET_TOKENS, TESTNET_CHAINS } from './tokens.js';
import { getAccount, createPublicClientForChain, createWalletClientForChain } from './wallet.js';
import type { CrossCurveSDK } from '../../../src/index.js';
import { pimlicoRpc } from './pimlico.js';

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

/** Minimum USDT balance needed on smart account (2 USDT) */
const MIN_USDT = 2_000_000n;
/** Minimum USDC balance needed on smart account for gas (5 USDC) */
const MIN_USDC = 5_000_000n;
/** Transfer amount when funding (generous to avoid repeated funding) */
const FUND_USDT = 10_000_000n; // 10 USDT
const FUND_USDC = 10_000_000n; // 10 USDC

/**
 * Ensure the Coinbase Smart Account is deployed and funded.
 *
 * 1. Check if account has code (already deployed)
 * 2. Fund with USDT + USDC from EOA if needed
 * 3. If not deployed, send a deployment UserOp via Pimlico
 */
export async function ensureSmartAccountReady(
  sdk: CrossCurveSDK,
  sepoliaClient: PublicClient,
  smartAccount: SmartAccount,
  owner: PrivateKeyAccount,
): Promise<void> {
  const smartAddr = smartAccount.address as `0x${string}`;

  // Check if already deployed
  const code = await sepoliaClient.getCode({ address: smartAddr });
  const isDeployed = !!code && code !== '0x';

  // Check balances
  const [usdtBal, usdcBal] = await Promise.all([
    sepoliaClient.readContract({
      address: TESTNET_TOKENS.SEPOLIA_USDT.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [smartAddr],
    }) as Promise<bigint>,
    sepoliaClient.readContract({
      address: TESTNET_TOKENS.SEPOLIA_USDC.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [smartAddr],
    }) as Promise<bigint>,
  ]);

  // Fund if needed (EOA → smart account)
  const walletClient = createWalletClientForChain(TESTNET_CHAINS.SEPOLIA);

  if (usdtBal < MIN_USDT) {
    const hash = await walletClient.writeContract({
      address: TESTNET_TOKENS.SEPOLIA_USDT.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [smartAddr, FUND_USDT],
      chain: sepolia,
    });
    await sepoliaClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  }

  if (usdcBal < MIN_USDC) {
    const hash = await walletClient.writeContract({
      address: TESTNET_TOKENS.SEPOLIA_USDC.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [smartAddr, FUND_USDC],
      chain: sepolia,
    });
    await sepoliaClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  }

  // Deploy if needed — send a simple UserOp with initCode
  if (!isDeployed) {
    // We need Pimlico proxy to relay the UserOp
    // Use the SDK's pimlico proxy with 'sepolia' chain name
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
            ...params,
            context: { token: TESTNET_TOKENS.SEPOLIA_USDC.address },
          });
        },
        async getPaymasterStubData(params) {
          return paymasterClient.getPaymasterStubData({
            ...params,
            context: { token: TESTNET_TOKENS.SEPOLIA_USDC.address },
          });
        },
      },
    });

    // Get gas prices
    const gasPrice = await pimlicoRpc(
      sdk, 'sepolia', 'pimlico_getUserOperationGasPrice', [],
    ) as { fast: { maxFeePerGas: string; maxPriorityFeePerGas: string } };

    // Deploy with a simple USDC approve call (needed for future paymaster use)
    const userOpHash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: [
        {
          to: TESTNET_TOKENS.SEPOLIA_USDC.address as `0x${string}`,
          value: 0n,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [
              '0x6666666666667849c56f2850848cE1C4da65c68b' as `0x${string}`, // Pimlico PM v0.6
              BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'),
            ],
          }),
        },
      ],
      maxFeePerGas: BigInt(gasPrice.fast.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(gasPrice.fast.maxPriorityFeePerGas),
    });

    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
      timeout: 120_000,
    });

    if (!receipt.success) {
      throw new Error('Smart account deployment UserOp failed');
    }
  }
}
