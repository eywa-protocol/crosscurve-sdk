import { Chain } from 'viem';
import {
  arbitrum,
  optimism,
  base,
  polygon,
  bsc,
  mainnet,
  sepolia,
} from 'viem/chains';

export type NetworkType = 'mainnet' | 'testnet';

export interface ChainConfig {
  chain: Chain;
  rpcEnvVar: string;
  networkType: NetworkType;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Mainnets
  [arbitrum.id]: {
    chain: arbitrum,
    rpcEnvVar: 'RPC_ARBITRUM',
    networkType: 'mainnet',
  },
  [optimism.id]: {
    chain: optimism,
    rpcEnvVar: 'RPC_OPTIMISM',
    networkType: 'mainnet',
  },
  [base.id]: {
    chain: base,
    rpcEnvVar: 'RPC_BASE',
    networkType: 'mainnet',
  },
  [polygon.id]: {
    chain: polygon,
    rpcEnvVar: 'RPC_POLYGON',
    networkType: 'mainnet',
  },
  [bsc.id]: {
    chain: bsc,
    rpcEnvVar: 'RPC_BSC',
    networkType: 'mainnet',
  },
  [mainnet.id]: {
    chain: mainnet,
    rpcEnvVar: 'RPC_ETHEREUM',
    networkType: 'mainnet',
  },
  // Testnets
  [sepolia.id]: {
    chain: sepolia,
    rpcEnvVar: 'RPC_SEPOLIA',
    networkType: 'testnet',
  },
};

export function getChainConfig(chainId: number): ChainConfig {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
}

export function getRpcUrl(chainId: number): string {
  const config = getChainConfig(chainId);
  const rpcUrl = process.env[config.rpcEnvVar];
  if (!rpcUrl) {
    throw new Error(`Missing RPC URL for chain ${chainId}. Set ${config.rpcEnvVar} in .env`);
  }
  return rpcUrl;
}

export function getChainsByNetwork(networkType: NetworkType): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(c => c.networkType === networkType);
}
