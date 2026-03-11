/**
 * @fileoverview Search API interface
 * @layer domain - ISP-compliant interface for search operations
 */

import type { SearchResponse } from '../../types/api/index.js';

/**
 * Interface for search operations
 */
export interface ISearchApi {
  /**
   * Search transactions
   * GET /search?search={search}
   */
  searchTransactions(query: string): Promise<SearchResponse>;

  /**
   * Get transaction history for an address
   * GET /history?address={address}
   */
  getHistory(address: string): Promise<SearchResponse>;
}
