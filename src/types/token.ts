/**
 * @fileoverview Token-related types
 */

/**
 * Reference to a token on a specific chain
 */
export interface TokenReference {
  /** Chain ID where the token exists */
  chainId: number;
  /** Token contract address */
  address: string;
}

/**
 * Token information
 */
export interface Token {
  /** Chain ID where this token exists */
  chainId: number;
  /** Token contract address */
  address: string;
  /** Token name */
  name: string;
  /** Token symbol (e.g., "USDC") */
  symbol: string;
  /** Number of decimals */
  decimals: number;
  /** EIP-2612 permit support */
  permit: boolean;
  /** Token classification tags (erc20, native, stable, synth, curve_lp, etc.) */
  tags: string[];
  /** Wrapped token reference (for native tokens) */
  wrapped?: TokenReference;
  /** Real token reference (for synthetic tokens) */
  realToken?: TokenReference;
  /** Constituent token addresses (for LP tokens) */
  coins?: string[];
}
