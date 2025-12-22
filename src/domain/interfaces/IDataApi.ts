/**
 * @fileoverview Data API interface
 * @layer domain - ISP-compliant interface for data retrieval operations
 */

import type {
  TokenListResponse,
  ChainListResponse,
} from '../../types/api/index.js';

/**
 * Interface for data retrieval operations
 */
export interface IDataApi {
  /**
   * Get token list
   * GET /tokenlist
   */
  getTokenList(): Promise<TokenListResponse>;

  /**
   * Get chain list
   * GET /chains (inferred endpoint)
   */
  getChainList(): Promise<ChainListResponse>;
}
