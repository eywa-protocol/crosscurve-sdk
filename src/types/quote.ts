/**
 * @fileoverview Quote and routing types
 */

import type { RouteProviderValue } from '../constants/providers.js';

/**
 * Chain identifier - accepts either numeric chain ID or CAIP-2 string
 * @example 42161 (numeric)
 * @example "eip155:42161" (CAIP-2 format)
 */
export type ChainIdentifier = number | string;

/**
 * Parameters for requesting a quote
 */
export interface GetQuoteParams {
  /** Source chain ID (number or CAIP-2 string like "eip155:42161") */
  fromChain: ChainIdentifier;
  /** Destination chain ID (number or CAIP-2 string like "eip155:1") */
  toChain: ChainIdentifier;
  /** Source token address */
  fromToken: string;
  /** Destination token address */
  toToken: string;
  /** Amount to swap in wei (string) */
  amount: string;
  /** Slippage tolerance percentage (e.g., 0.5 for 0.5%) */
  slippage: number;
  /** Sender address (optional for quote, required for execution) */
  sender?: string;
  /** Recipient address (if different from sender) */
  recipient?: string;
  /** Deduct fee from input amount */
  feeFromAmount?: boolean;
  /** Token to pay fees in */
  feeToken?: string;
  /** Filter by specific route providers (cross-curve, rubic, bungee) */
  providers?: RouteProviderValue[];
  /** Fee share in basis points (0-10000) for partner commission - overrides SDK config */
  feeShareBps?: number;
}

/**
 * Transaction data returned by API (ready to send)
 */
export interface TxData {
  /** Contract address to call */
  to: string;
  /** Encoded calldata */
  data: string;
  /** ETH value to send (in wei) */
  value: string;
  /** Chain ID */
  chainId: number;
}

/**
 * Token reference within a route step
 */
export interface RouteStepToken {
  /** Token contract address */
  address: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Chain ID where token exists */
  chainId: number;
}

/**
 * Single step in a routing path (matches actual API response)
 */
export interface RouteStep {
  /** Route provider type (cross-curve, rubic, bungee) */
  type: string;
  /** Source chain ID for this step */
  fromChainId: number;
  /** Destination chain ID for this step */
  toChainId: number;
  /** Source token details */
  fromToken: RouteStepToken;
  /** Destination token details */
  toToken: RouteStepToken;
  /** Provider-specific parameters */
  params?: Record<string, unknown>;
  /** Quote details from provider (contains txData and tracking IDs) */
  quote?: {
    /** Rubic quote ID (used for tracking) */
    id?: string;
    /** Nested quote structure (Rubic API returns quote.quote.id) */
    quote?: {
      id?: string;
      [key: string]: unknown;
    };
    /** For bungee routes */
    route?: {
      txData?: TxData;
      [key: string]: unknown;
    };
    /** For rubic routes */
    transaction?: TxData;
    [key: string]: unknown;
  };
}

/**
 * Transaction information for a quote
 */
export interface TransactionInfo {
  /** Chain ID where transaction occurs */
  chainId: number;
  /** Resource consumption details */
  consumptions: {
    /** Estimated gas consumption */
    gasConsumption: number;
    /** Bridge provider name (null for DEX-only) */
    bridge: string | null;
    /** Transaction type */
    type: 'start' | 'data' | 'hash';
  }[];
}

/**
 * Swap quote with routing information
 */
export interface Quote {
  /** Multi-step routing path */
  route: RouteStep[];
  /** Input amount in wei */
  amountIn: string;
  /** Expected output amount in wei */
  amountOut: string;
  /** Delivery fee details */
  deliveryFee: {
    /** Fee token address */
    token: string;
    /** Fee amount in wei */
    amount: string;
    /** Fee in USD */
    usd: number;
  };
  /** Transaction details for each chain */
  txs: TransactionInfo[];
  /** API signature for quote validation (expires in 5 minutes) */
  signature: string;

  /** Output amount before slippage deduction (in wei) */
  amountOutWithoutSlippage: string;
  /** Price impact as a decimal (e.g., 0.01 = 1%) */
  priceImpact: number;
  /** Price of input token in USD */
  tokenInPrice: number;
  /** Price of output token in USD */
  tokenOutPrice: number;
  /** Source chain fee details */
  sourceFee: {
    /** Fee token address */
    token: string;
    /** Fee amount in wei */
    amount: string;
    /** Fee in USD */
    usd: number;
  };
  /** Aggregated total fee */
  totalFee: {
    /** Fee type (e.g., 'fixed') */
    type: string;
    /** Fee percentage as string */
    percent: string;
    /** Total fee amount in wei */
    amount: string;
  };
  /** Expected time to finality in seconds */
  expectedFinalitySeconds: number;
  /** Quote deadline as unix timestamp */
  deadline: number;
  /** Slippage tolerance applied to this quote */
  slippage: number;
  /** Fee share in basis points (partner commission) */
  feeShare?: string;
  /** Address receiving the fee share */
  feeShareRecipient?: string;
  /** Token used for fee share payment */
  feeShareToken?: string;
  /** Runner details for relayed execution */
  runner?: {
    /** Runner wallet address */
    address: string;
    /** Token used for runner payment */
    token: string;
    /** Runner deadline as unix timestamp */
    deadline: number;
  };
}

/**
 * A single item from a streaming route scan
 * Each item is either a successful quote or an error
 */
export interface StreamedRoute {
  quote?: Quote;
  error?: string;
}
