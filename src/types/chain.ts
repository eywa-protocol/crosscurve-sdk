/**
 * @fileoverview Chain-related types
 * @implements PRD Section 6.9 - Chain Object
 * @implements SDK_OVERVIEW.md Section 5 - CAIP-2 Chain Identification
 */

/**
 * Blockchain network information
 */
export interface Chain {
  /** Numeric chain ID (e.g., 1 for Ethereum mainnet) */
  id: number;
  /** CAIP-2 identifier (e.g., "eip155:1") */
  caip2: string;
  /** Human-readable chain name */
  name: string;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** Native currency information */
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
