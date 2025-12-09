/**
 * @fileoverview Quote test fixtures
 */

import type { Quote } from '../../src/types/quote.js';

/**
 * Cross-chain swap quote (Arbitrum USDC -> Optimism USDC)
 */
export const crossChainQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '999000000',
  amountOutMin: '989010000',
  fee: '1000000',
  estimatedTime: 300,
  route: [
    {
      type: 'crosscurve',
      fromChainId: 42161,
      toChainId: 10,
      fromToken: {
        address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        symbol: 'USDC',
        decimals: 6,
        chainId: 42161,
      },
      toToken: {
        address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
        symbol: 'USDC',
        decimals: 6,
        chainId: 10,
      },
    },
  ],
  txs: [
    {
      to: '0x1234567890123456789012345678901234567890',
      data: '0x',
      value: '0',
      chainId: 42161,
    },
  ],
};

/**
 * Same-chain swap quote (Arbitrum USDC -> Arbitrum WETH)
 */
export const sameChainQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '500000000000000000',
  amountOutMin: '495000000000000000',
  fee: '100000',
  estimatedTime: 30,
  route: [
    {
      type: 'crosscurve',
      fromChainId: 42161,
      toChainId: 42161,
      fromToken: {
        address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        symbol: 'USDC',
        decimals: 6,
        chainId: 42161,
      },
      toToken: {
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        symbol: 'WETH',
        decimals: 18,
        chainId: 42161,
      },
    },
  ],
  txs: [
    {
      to: '0x1234567890123456789012345678901234567890',
      data: '0x',
      value: '0',
      chainId: 42161,
    },
  ],
};

/**
 * Rubic bridge quote
 */
export const rubicQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '998000000',
  amountOutMin: '988020000',
  fee: '2000000',
  estimatedTime: 600,
  route: [
    {
      type: 'rubic',
      fromChainId: 42161,
      toChainId: 137,
      fromToken: {
        address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        symbol: 'USDC',
        decimals: 6,
        chainId: 42161,
      },
      toToken: {
        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        symbol: 'USDC',
        decimals: 6,
        chainId: 137,
      },
      quote: {
        quote: {
          id: 'rubic-quote-123',
        },
      },
    },
  ],
  txs: [
    {
      to: '0x1234567890123456789012345678901234567890',
      data: '0x',
      value: '0',
      chainId: 42161,
    },
  ],
};

/**
 * Bungee bridge quote
 */
export const bungeeQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '997000000',
  amountOutMin: '987030000',
  fee: '3000000',
  estimatedTime: 900,
  route: [
    {
      type: 'bungee',
      fromChainId: 42161,
      toChainId: 56,
      fromToken: {
        address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        symbol: 'USDC',
        decimals: 6,
        chainId: 42161,
      },
      toToken: {
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        symbol: 'USDC',
        decimals: 18,
        chainId: 56,
      },
    },
  ],
  txs: [
    {
      to: '0x1234567890123456789012345678901234567890',
      data: '0x',
      value: '0',
      chainId: 42161,
    },
  ],
};

/**
 * Empty route quote (fallback to CrossCurve)
 */
export const emptyRouteQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '1000000000',
  amountOutMin: '990000000',
  fee: '0',
  estimatedTime: 60,
  route: [],
  txs: [],
};
