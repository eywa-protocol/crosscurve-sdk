/**
 * @fileoverview Search endpoint implementation
 */

import type { HttpClient } from '../client/index.js';
import type { SearchResponse } from '../../../types/api/index.js';

/**
 * Search transactions
 * GET /search?search={search}
 */
export async function searchTransactions(
  client: HttpClient,
  query: string
): Promise<SearchResponse> {
  return client.get<SearchResponse>('/search', { search: query });
}

/**
 * Get transaction history for an address
 * GET /history?address={address}
 */
export async function getHistory(
  client: HttpClient,
  address: string
): Promise<SearchResponse> {
  return client.get<SearchResponse>('/history', { address });
}
