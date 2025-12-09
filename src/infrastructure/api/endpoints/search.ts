/**
 * @fileoverview Search endpoint implementation
 * @implements PRD Appendix A - GET /search
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
