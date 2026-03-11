import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
} from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { sepolia, arbitrumSepolia } from 'viem/chains';

const CHAIN_CONFIG: Record<number, { chain: Chain; rpcUrl: (alchemyKey?: string) => string }> = {
  11155111: {
    chain: sepolia,
    rpcUrl: (key) => key
      ? `https://eth-sepolia.g.alchemy.com/v2/${key}`
      : 'https://1rpc.io/sepolia',
  },
  421614: {
    chain: arbitrumSepolia,
    rpcUrl: (key) => key
      ? `https://arb-sepolia.g.alchemy.com/v2/${key}`
      : 'https://sepolia-rollup.arbitrum.io/rpc',
  },
};

export function getAccount(): PrivateKeyAccount {
  const key = process.env.E2E_PRIVATE_KEY;
  if (!key) throw new Error('E2E_PRIVATE_KEY not set');
  return privateKeyToAccount(key as `0x${string}`);
}

export function createPublicClientForChain(chainId: number): PublicClient {
  const config = CHAIN_CONFIG[chainId];
  if (!config) throw new Error(`Unsupported chain: ${chainId}`);
  const rpcUrl = config.rpcUrl(process.env.E2E_ALCHEMY_API_KEY);
  return createPublicClient({ chain: config.chain, transport: http(rpcUrl) });
}

export function createWalletClientForChain(chainId: number): WalletClient {
  const config = CHAIN_CONFIG[chainId];
  if (!config) throw new Error(`Unsupported chain: ${chainId}`);
  const rpcUrl = config.rpcUrl(process.env.E2E_ALCHEMY_API_KEY);
  const account = getAccount();
  return createWalletClient({
    account,
    chain: config.chain,
    transport: http(rpcUrl),
  });
}

export function getChainDef(chainId: number): Chain {
  const config = CHAIN_CONFIG[chainId];
  if (!config) throw new Error(`Unsupported chain: ${chainId}`);
  return config.chain;
}
