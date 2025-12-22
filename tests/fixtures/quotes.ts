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
  deliveryFee: {
    amount: '1000000',
    usd: 1.0,
  },
  signature: 'mock-signature-cross-chain',
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
      chainId: 42161,
      consumptions: [
        {
          gasConsumption: 250000,
          bridge: 'crosscurve',
          type: 'start',
        },
      ],
    },
  ],
};

/**
 * Same-chain swap quote (Arbitrum USDC -> Arbitrum WETH)
 */
export const sameChainQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '500000000000000000',
  deliveryFee: {
    amount: '100000',
    usd: 0.1,
  },
  signature: 'mock-signature-same-chain',
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
      chainId: 42161,
      consumptions: [
        {
          gasConsumption: 150000,
          bridge: null,
          type: 'start',
        },
      ],
    },
  ],
};

/**
 * Rubic bridge quote
 */
export const rubicQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '998000000',
  deliveryFee: {
    amount: '2000000',
    usd: 2.0,
  },
  signature: 'mock-signature-rubic',
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
      chainId: 42161,
      consumptions: [
        {
          gasConsumption: 300000,
          bridge: 'rubic',
          type: 'start',
        },
      ],
    },
  ],
};

/**
 * Bungee bridge quote
 */
export const bungeeQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '997000000',
  deliveryFee: {
    amount: '3000000',
    usd: 3.0,
  },
  signature: 'mock-signature-bungee',
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
      chainId: 42161,
      consumptions: [
        {
          gasConsumption: 350000,
          bridge: 'bungee',
          type: 'start',
        },
      ],
    },
  ],
};

/**
 * Empty route quote (fallback to CrossCurve)
 */
export const emptyRouteQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '1000000000',
  deliveryFee: {
    amount: '0',
    usd: 0,
  },
  signature: 'mock-signature-empty',
  route: [],
  txs: [],
};
