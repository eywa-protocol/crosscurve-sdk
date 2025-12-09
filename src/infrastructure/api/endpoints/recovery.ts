/**
 * @fileoverview Recovery endpoint implementations
 * @implements PRD Appendix A - Recovery endpoints
 */

import type { HttpClient } from '../client/index.js';
import type {
  TxCreateEmergencyRequest,
  TxCreateRetryRequest,
  TxCreateResponse,
} from '../../../types/api/index.js';

/**
 * Create emergency withdrawal transaction
 * POST /tx/create/emergency
 */
export async function createEmergencyTransaction(
  client: HttpClient,
  request: TxCreateEmergencyRequest
): Promise<TxCreateResponse> {
  return client.post<TxCreateResponse>('/tx/create/emergency', request);
}

/**
 * Create retry transaction
 * POST /tx/create/retry
 */
export async function createRetryTransaction(
  client: HttpClient,
  request: TxCreateRetryRequest
): Promise<TxCreateResponse> {
  return client.post<TxCreateResponse>('/tx/create/retry', request);
}
