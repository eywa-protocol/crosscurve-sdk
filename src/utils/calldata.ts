/**
 * @fileoverview Calldata encoding utilities
 * Workaround for API buildCalldata: true bug
 *
 * Uses ethers.js Interface for ABI encoding.
 * Converts object args to arrays since API returns named objects
 * but ABI has unnamed tuple parameters.
 */

import { Interface } from 'ethers';

/**
 * Transaction response that may have data or abi+args
 */
export interface TxResponseWithAbi {
  data?: string;
  abi?: string;
  args?: unknown[];
}

/**
 * Recursively convert objects to arrays for ABI encoding
 * API returns objects with named keys, but ethers needs arrays for unnamed tuples
 *
 * Object key order in JavaScript is preserved (ES2015+), and the API returns
 * keys in the same order as the ABI tuple parameters.
 */
function convertObjectsToArrays(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(convertObjectsToArrays);
  }

  if (typeof value === 'object') {
    // Convert object to array, recursively processing values
    return Object.values(value as Record<string, unknown>).map(convertObjectsToArrays);
  }

  return value;
}

/**
 * Encode calldata from API response
 * Handles both buildCalldata: true (data field) and buildCalldata: false (abi+args)
 */
export function encodeCalldataFromResponse(txResponse: TxResponseWithAbi): string {
  // If data is already provided (buildCalldata: true worked), use it
  if (txResponse.data) {
    return txResponse.data;
  }

  // Otherwise encode from abi + args
  if (!txResponse.abi || !txResponse.args) {
    throw new Error('Transaction response missing both data and abi/args');
  }

  try {
    const iface = new Interface([txResponse.abi]);

    // Extract function name from abi
    const functionName = txResponse.abi.match(/function\s+(\w+)/)?.[1];
    if (!functionName) {
      throw new Error(`Cannot extract function name from: ${txResponse.abi}`);
    }

    // Convert object args to arrays for encoding
    const convertedArgs = txResponse.args.map(convertObjectsToArrays);

    return iface.encodeFunctionData(functionName, convertedArgs);
  } catch (error) {
    throw new Error(
      `Failed to encode calldata. ABI: ${txResponse.abi}, Error: ${error}`
    );
  }
}
