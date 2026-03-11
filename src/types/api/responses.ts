/**
 * @fileoverview API response types
 */

import type { Quote, RouteStep } from '../quote.js';
import type { TransactionStatus, TransactionEvent, TransactionMetadata } from '../transaction.js';
import type { Chain } from '../chain.js';
import type { Token } from '../token.js';

/**
 * Token data as returned by GET /networks API
 * Different from SDK Token type
 */
export interface ApiTokenData {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  tags: string[];
  icon?: string;
  permit?: boolean;
  wrapped?: { chainId: number; address: string };
  realToken?: { chainId: number; address: string };
  coins?: string[];
}

/**
 * Raw network data from GET /networks API
 */
export interface NetworkApiData {
  name: string;
  icon: string;
  chainId: number;
  rpcHttp: string[];
  rpcPublic: string;
  hubChain: boolean;
  router: string;
  curveFactory: string;
  frontHelper: string;
  claimHelper: string;
  walletFactory: string;
  nft: string;
  tokens: ApiTokenData[];
  pools?: unknown[];
}

/**
 * Response from GET /networks
 * Map of chain name to network data
 */
export interface NetworksApiResponse {
  [chainName: string]: NetworkApiData;
}

/**
 * Response from POST /routing/scan
 * API returns array of quotes directly
 */
export type RoutingScanResponse = Quote[];

/**
 * Response from POST /tx/create, /tx/create/emergency, /tx/create/retry
 * When buildCalldata: true - returns data field
 * When buildCalldata: false - returns abi + args fields
 */
export interface TxCreateResponse {
  to: string;
  value: string;
  /** Encoded calldata (when buildCalldata: true) */
  data?: string;
  /** ABI signature (when buildCalldata: false) */
  abi?: string;
  /** Function arguments (when buildCalldata: false) */
  args?: unknown[];
}

/**
 * Response from GET /transaction/{requestId}
 */
export interface TransactionGetResponse {
  status: 'in progress' | 'completed' | 'failed' | 'reverted' | 'retry' | 'canceled';
  inconsistency: boolean;
  source: {
    chainId: number;
    transactionHash: string;
    from: string;
    events: TransactionEvent[];
    status: 'pending' | 'completed' | 'failed';
  };
  oracle: {
    relayChainId: number;
    requestId: string;
    status: 'in progress' | 'completed';
    height: number | null;
    epoch: number | null;
    time: number | null;
  };
  destination: {
    chainId: number;
    transactionHash: string | null;
    events: TransactionEvent[];
    emergency: boolean;
    status: 'pending' | 'in progress' | 'completed' | 'failed' | 'retry';
    bridgeState: Record<string, { txHash?: string | null }>;
  };
  data?: TransactionMetadata;
}

/**
 * Response from GET /search
 */
export interface SearchResponse {
  transactions: TransactionStatus[];
}

/**
 * Response from GET /inconsistency/{requestId}
 */
export interface InconsistencyGetResponse {
  params: {
    tokenIn: string;
    amountIn: string;
    chainIdIn: number;
    tokenOut: string;
    chainIdOut: number;
  };
  signature: string;
}

/**
 * Response from POST /inconsistency
 * Returns transaction data directly (same as /tx/create)
 */
export interface InconsistencyCreateResponse {
  to: string;
  data?: string;
  abi?: string;
  args?: unknown[];
  value: string;
}

/**
 * Response from GET /tokenlist
 */
export interface TokenListResponse {
  tokens: Token[];
}

/**
 * Response from chains endpoint (inferred from Chain type)
 */
export interface ChainListResponse {
  chains: Chain[];
}

/**
 * A token reference returned by discovery endpoint
 */
export interface TokenReference {
  address: string;
  chainId: number;
}

/**
 * Response from POST /routing/discover
 */
export type DiscoverResponse = TokenReference[];
