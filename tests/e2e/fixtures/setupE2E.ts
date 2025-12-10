/**
 * @fileoverview E2E test setup fixture
 * Provides shared setup for E2E tests to reduce duplication
 */

import { mnemonicToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, type Chain } from 'viem';
import { arbitrum, optimism, mainnet, avalanche, bsc, polygon, base } from 'viem/chains';
import { CrossCurveSDK, ViemAdapter } from '../../../src/index.js';
import { TEST_CONFIG } from '../../setup.js';

/**
 * E2E setup result
 */
export interface E2ESetup {
  /** Initialized CrossCurve SDK instance */
  sdk: CrossCurveSDK;
  /** Viem signer adapter */
  signer: ViemAdapter;
  /** Wallet address */
  address: string;
  /** Cleanup function */
  cleanup: () => void;
}

/**
 * Available chains for E2E tests
 */
export const CHAINS = {
  arbitrum,
  optimism,
  mainnet,
  avalanche,
  bsc,
  polygon,
  base,
} as const;

/**
 * Common chain IDs for tests
 */
export const TEST_CHAINS = {
  arbitrum: 42161,
  optimism: 10,
  ethereum: 1,
  avalanche: 43114,
  bsc: 56,
  polygon: 137,
  base: 8453,
} as const;

/**
 * Set up E2E test environment
 *
 * @param chain - Viem chain configuration to use
 * @returns E2E setup with SDK, signer, and address
 * @throws Error if TEST_MNEMONIC environment variable not set
 *
 * @example
 * ```typescript
 * const setup = await setupE2E(CHAINS.arbitrum);
 * const { sdk, signer, address } = setup;
 *
 * // Use in tests...
 *
 * setup.cleanup();
 * ```
 */
export async function setupE2E(chain: Chain): Promise<E2ESetup> {
  const mnemonic = TEST_CONFIG.testMnemonic;
  if (!mnemonic) {
    throw new Error(
      'TEST_MNEMONIC environment variable not set. ' +
      'Create a .env.test file with TEST_MNEMONIC=your mnemonic phrase'
    );
  }

  const account = mnemonicToAccount(mnemonic);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const signer = new ViemAdapter(walletClient, publicClient, account);

  const sdk = new CrossCurveSDK({
    baseUrl: TEST_CONFIG.apiBaseUrl,
  });

  await sdk.init();

  return {
    sdk,
    signer,
    address: account.address,
    cleanup: () => {
      // Placeholder for any cleanup needed
    },
  };
}

/**
 * Get a token address for a specific chain
 * Common tokens used in E2E tests
 */
export const TEST_TOKENS = {
  // Native ETH (zero address)
  NATIVE: '0x0000000000000000000000000000000000000000',

  // USDC addresses per chain
  USDC: {
    [TEST_CHAINS.arbitrum]: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    [TEST_CHAINS.optimism]: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    [TEST_CHAINS.ethereum]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    [TEST_CHAINS.avalanche]: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    [TEST_CHAINS.bsc]: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    [TEST_CHAINS.polygon]: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    [TEST_CHAINS.base]: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  },

  // USDT addresses per chain
  USDT: {
    [TEST_CHAINS.arbitrum]: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    [TEST_CHAINS.optimism]: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    [TEST_CHAINS.ethereum]: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    [TEST_CHAINS.avalanche]: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    [TEST_CHAINS.bsc]: '0x55d398326f99059ff775485246999027b3197955',
    [TEST_CHAINS.polygon]: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  },
} as const;
