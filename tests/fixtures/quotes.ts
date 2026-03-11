/**
 * @fileoverview Quote test fixtures
 */

import type { Quote } from '../../src/types/quote.js';

/**
 * Factory function for creating mock quotes with sensible defaults
 */
export function createMockQuote(overrides?: Partial<Quote>): Quote {
  return {
    route: [],
    amountIn: '1000000',
    amountOut: '990000',
    deliveryFee: { token: '0x0000000000000000000000000000000000000000', amount: '1000', usd: 0.1 },
    txs: [],
    signature: '0xsig',
    amountOutWithoutSlippage: '1000000',
    priceImpact: 0.01,
    tokenInPrice: 1.0,
    tokenOutPrice: 1.0,
    sourceFee: { token: '0x0000000000000000000000000000000000000000', amount: '500', usd: 0.05 },
    totalFee: { type: 'fixed', percent: '0.1', amount: '1500' },
    expectedFinalitySeconds: 120,
    deadline: Math.floor(Date.now() / 1000) + 3600,
    slippage: 0.5,
    ...overrides,
  };
}

/**
 * Cross-chain swap quote (Arbitrum USDC -> Optimism USDC)
 */
export const crossChainQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '999000000',
  deliveryFee: {
    token: '0x0000000000000000000000000000000000000000',
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
  amountOutWithoutSlippage: '1000000000',
  priceImpact: 0.001,
  tokenInPrice: 1.0,
  tokenOutPrice: 1.0,
  sourceFee: { token: '0x0000000000000000000000000000000000000000', amount: '500000', usd: 0.5 },
  totalFee: { type: 'fixed', percent: '0.15', amount: '1500000' },
  expectedFinalitySeconds: 180,
  deadline: 1742331600,
  slippage: 0.5,
};

/**
 * Same-chain swap quote (Arbitrum USDC -> Arbitrum WETH)
 */
export const sameChainQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '500000000000000000',
  deliveryFee: {
    token: '0x0000000000000000000000000000000000000000',
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
  amountOutWithoutSlippage: '502500000000000000',
  priceImpact: 0.005,
  tokenInPrice: 1.0,
  tokenOutPrice: 2000.0,
  sourceFee: { token: '0x0000000000000000000000000000000000000000', amount: '50000', usd: 0.05 },
  totalFee: { type: 'fixed', percent: '0.01', amount: '150000' },
  expectedFinalitySeconds: 15,
  deadline: 1742331600,
  slippage: 0.5,
};

/**
 * Rubic bridge quote
 */
export const rubicQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '998000000',
  deliveryFee: {
    token: '0x0000000000000000000000000000000000000000',
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
  amountOutWithoutSlippage: '1000000000',
  priceImpact: 0.002,
  tokenInPrice: 1.0,
  tokenOutPrice: 1.0,
  sourceFee: { token: '0x0000000000000000000000000000000000000000', amount: '1000000', usd: 1.0 },
  totalFee: { type: 'fixed', percent: '0.3', amount: '3000000' },
  expectedFinalitySeconds: 300,
  deadline: 1742331600,
  slippage: 1.0,
};

/**
 * Bungee bridge quote
 */
export const bungeeQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '997000000',
  deliveryFee: {
    token: '0x0000000000000000000000000000000000000000',
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
  amountOutWithoutSlippage: '1000000000',
  priceImpact: 0.003,
  tokenInPrice: 1.0,
  tokenOutPrice: 1.0,
  sourceFee: { token: '0x0000000000000000000000000000000000000000', amount: '1500000', usd: 1.5 },
  totalFee: { type: 'fixed', percent: '0.45', amount: '4500000' },
  expectedFinalitySeconds: 600,
  deadline: 1742331600,
  slippage: 0.5,
};

/**
 * Empty route quote (fallback to CrossCurve)
 */
export const emptyRouteQuote: Quote = {
  amountIn: '1000000000',
  amountOut: '1000000000',
  deliveryFee: {
    token: '0x0000000000000000000000000000000000000000',
    amount: '0',
    usd: 0,
  },
  signature: 'mock-signature-empty',
  route: [],
  txs: [],
  amountOutWithoutSlippage: '1000000000',
  priceImpact: 0,
  tokenInPrice: 1.0,
  tokenOutPrice: 1.0,
  sourceFee: { token: '0x0000000000000000000000000000000000000000', amount: '0', usd: 0 },
  totalFee: { type: 'fixed', percent: '0', amount: '0' },
  expectedFinalitySeconds: 0,
  deadline: 1742331600,
  slippage: 0,
};
