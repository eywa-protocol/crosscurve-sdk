import { ChainId } from '@crosscurve/sdk';

export interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
}

export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Common tokens by chain - used for test scenarios
export const TOKENS: Record<number, Record<string, TokenConfig>> = {
  [ChainId.ARBITRUM]: {
    USDC: {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      decimals: 6,
    },
    USDT: {
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      decimals: 6,
    },
    ETH: {
      address: NATIVE_TOKEN,
      symbol: 'ETH',
      decimals: 18,
    },
  },
  [ChainId.OPTIMISM]: {
    USDC: {
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      symbol: 'USDC',
      decimals: 6,
    },
    USDT: {
      address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      symbol: 'USDT',
      decimals: 6,
    },
    ETH: {
      address: NATIVE_TOKEN,
      symbol: 'ETH',
      decimals: 18,
    },
  },
  [ChainId.BASE]: {
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      decimals: 6,
    },
    ETH: {
      address: NATIVE_TOKEN,
      symbol: 'ETH',
      decimals: 18,
    },
  },
  [ChainId.POLYGON]: {
    USDC: {
      address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      symbol: 'USDC',
      decimals: 6,
    },
    USDT: {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      decimals: 6,
    },
    MATIC: {
      address: NATIVE_TOKEN,
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  [ChainId.BSC]: {
    USDC: {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      symbol: 'USDC',
      decimals: 18,
    },
    USDT: {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      decimals: 18,
    },
    BNB: {
      address: NATIVE_TOKEN,
      symbol: 'BNB',
      decimals: 18,
    },
  },
};

export function getToken(chainId: number, symbol: string): TokenConfig {
  const chainTokens = TOKENS[chainId];
  if (!chainTokens) {
    throw new Error(`No tokens configured for chain ${chainId}`);
  }
  const token = chainTokens[symbol];
  if (!token) {
    throw new Error(`Token ${symbol} not found on chain ${chainId}`);
  }
  return token;
}
