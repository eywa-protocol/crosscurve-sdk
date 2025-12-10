/**
 * @fileoverview Chain identification utilities
 */

import type { ChainIdentifier } from '../types/quote.js';

/**
 * CAIP-2 regex pattern for EVM chains: eip155:{chainId}
 */
const CAIP2_EVM_PATTERN = /^eip155:(\d+)$/;

/**
 * Resolve a chain identifier to numeric chain ID
 *
 * @param chain Chain identifier (number or CAIP-2 string)
 * @returns Numeric chain ID
 * @throws Error if CAIP-2 format is invalid
 *
 * @example
 * resolveChainId(42161) // => 42161
 * resolveChainId("eip155:42161") // => 42161
 * resolveChainId("invalid") // throws Error
 */
export function resolveChainId(chain: ChainIdentifier): number {
  if (typeof chain === 'number') {
    return chain;
  }

  const match = chain.match(CAIP2_EVM_PATTERN);
  if (match) {
    return parseInt(match[1], 10);
  }

  throw new Error(
    `Invalid chain identifier: ${chain}. ` +
    `Expected numeric chain ID or CAIP-2 format (e.g., "eip155:42161")`
  );
}

