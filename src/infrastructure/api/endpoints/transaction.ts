/**
 * @fileoverview Transaction endpoint implementations
 * @implements PRD Appendix A - Transaction endpoints
 */

import type { HttpClient } from '../client/index.js';
import type {
  TxCreateRequest,
  TxCreateResponse,
  TransactionGetResponse,
} from '../../../types/api/index.js';

/**
 * Create transaction calldata
 * POST /tx/create
 */
export async function createTransaction(
  client: HttpClient,
  request: TxCreateRequest
): Promise<TxCreateResponse> {
  return client.post<TxCreateResponse>('/tx/create', request);
}

/**
 * Get transaction status
 * GET /transaction/{requestId}
 */
export async function getTransaction(
  client: HttpClient,
  requestId: string
): Promise<TransactionGetResponse> {
  return client.get<TransactionGetResponse>(`/transaction/${requestId}`);
}
