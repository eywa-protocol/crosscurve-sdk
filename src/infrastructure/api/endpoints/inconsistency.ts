/**
 * @fileoverview Inconsistency endpoint implementations
 */

import type { HttpClient } from '../client/index.js';
import type {
  InconsistencyGetResponse,
  InconsistencyCreateRequest,
  InconsistencyCreateResponse,
} from '../../../types/api/index.js';

/**
 * Get inconsistency parameters
 * GET /inconsistency/{requestId}
 */
export async function getInconsistencyParams(
  client: HttpClient,
  requestId: string
): Promise<InconsistencyGetResponse> {
  return client.get<InconsistencyGetResponse>(`/inconsistency/${requestId}`);
}

/**
 * Create inconsistency resolution route
 * POST /inconsistency
 */
export async function createInconsistency(
  client: HttpClient,
  request: InconsistencyCreateRequest
): Promise<InconsistencyCreateResponse> {
  return client.post<InconsistencyCreateResponse>('/inconsistency', request);
}
