/**
 * @fileoverview Static chain metadata registry
 *
 * Provides reliable explorer URLs and native currency info for known chains,
 * rather than relying on API responses which may not include this data.
 */

interface ChainMeta {
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const CHAIN_METADATA: Record<number, ChainMeta> = {
  1: { explorerUrl: 'https://etherscan.io', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  10: { explorerUrl: 'https://optimistic.etherscan.io', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  56: { explorerUrl: 'https://bscscan.com', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 } },
  137: { explorerUrl: 'https://polygonscan.com', nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 } },
  42161: { explorerUrl: 'https://arbiscan.io', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  43114: { explorerUrl: 'https://snowtrace.io', nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 } },
  8453: { explorerUrl: 'https://basescan.org', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  7565164: { explorerUrl: 'https://solscan.io', nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 } },
  728126428: { explorerUrl: 'https://tronscan.org', nativeCurrency: { name: 'Tron', symbol: 'TRX', decimals: 6 } },
};

const DEFAULT_CHAIN_META: ChainMeta = {
  explorerUrl: '',
  nativeCurrency: { name: 'Native', symbol: 'ETH', decimals: 18 },
};

export function getChainMeta(chainId: number): ChainMeta {
  return CHAIN_METADATA[chainId] ?? DEFAULT_CHAIN_META;
}
