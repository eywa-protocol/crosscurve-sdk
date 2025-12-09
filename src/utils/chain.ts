/**
 * @fileoverview Chain identification utilities
 * @implements PRD Section 7.4 - CAIP-2 chain identification support
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

/**
 * Convert numeric chain ID to CAIP-2 format
 *
 * @param chainId Numeric chain ID
 * @returns CAIP-2 identifier (e.g., "eip155:42161")
 */
export function toCAIP2(chainId: number): string {
  return `eip155:${chainId}`;
}

/**
 * Check if a chain identifier is in CAIP-2 format
 *
 * @param chain Chain identifier to check
 * @returns true if CAIP-2 format, false otherwise
 */
export function isCAIP2(chain: ChainIdentifier): chain is string {
  if (typeof chain !== 'string') {
    return false;
  }
  return CAIP2_EVM_PATTERN.test(chain);
}
