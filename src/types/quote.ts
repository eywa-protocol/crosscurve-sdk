/**
 * @fileoverview Quote and routing types
 * @implements PRD Section 6.3 - GetQuote Parameters
 * @implements PRD Section 6.4 - Quote Object
 * @implements SDK_OVERVIEW.md Section 4 - Quote Types
 */

import type { RouteProviderValue } from '../constants/providers.js';

/**
 * Parameters for requesting a quote
 */
export interface GetQuoteParams {
  /** Source chain ID */
  fromChain: number;
  /** Destination chain ID */
  toChain: number;
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
  /** Deduct fee from input amount */
  feeFromAmount?: boolean;
  /** Token to pay fees in */
  feeToken?: string;
  /** Filter by specific route providers (cross-curve, rubic, bungee) */
  providers?: RouteProviderValue[];
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
 * Single step in a routing path (matches actual API response)
 */
export interface RouteStep {
  /** Route provider type (rubic, bungee, etc) */
  type: string;
  /** Chain ID for this step */
  chainId: number;
  /** Provider-specific parameters */
  params: Record<string, unknown>;
  /** Quote details from provider (contains txData) */
  quote?: {
    /** Rubic quote ID (used for tracking) */
    id?: string;
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
    /** Fee amount in wei */
    amount: string;
    /** Fee in USD */
    usd: number;
  };
  /** Transaction details for each chain */
  txs: TransactionInfo[];
  /** API signature for quote validation (expires in 5 minutes) */
  signature: string;
}
