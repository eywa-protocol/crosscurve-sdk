/**
 * @fileoverview Chain ID constants
 *
 * Using const object instead of enum for tree-shaking optimization
 */

/**
 * Supported chain IDs
 * Const object for better tree-shaking than enum
 */
export const ChainId = {
  ETHEREUM: 1,
  OPTIMISM: 10,
  BSC: 56,
  POLYGON: 137,
  ARBITRUM: 42161,
  AVALANCHE: 43114,
  BASE: 8453,
} as const;

/**
 * Type for chain ID values
 */
export type ChainIdValue = typeof ChainId[keyof typeof ChainId];
