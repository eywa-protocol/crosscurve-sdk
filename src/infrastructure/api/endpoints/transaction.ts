/**
 * @fileoverview Transaction endpoint implementations
 */

import type { HttpClient } from '../client/index.js';
import type {
  TxCreateRequest,
  TxCreateResponse,
  TransactionGetResponse,
} from '../../../types/api/index.js';
import type { CalldataOnlyResponse } from '../../../types/transaction.js';

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
 * Create calldataOnly transaction
 * POST /tx/create with calldataOnly: true
 */
export async function createCalldataOnly(
  client: HttpClient,
  request: TxCreateRequest
): Promise<CalldataOnlyResponse> {
  return client.post<CalldataOnlyResponse>('/tx/create', { ...request, calldataOnly: true });
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
