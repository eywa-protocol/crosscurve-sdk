/**
 * @fileoverview Inconsistency scope for Tier 2 API
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient } from '../../domain/interfaces/index.js';
import type {
  InconsistencyGetResponse,
  InconsistencyCreateRequest,
  InconsistencyCreateResponse,
} from '../../types/api/index.js';
import { createInconsistencySignatureMessage } from '../../utils/signature.js';
import type { ChainSigner } from '../../types/index.js';

/**
 * Inconsistency scope: sdk.inconsistency.*
 */
export class InconsistencyScope {
  constructor(private readonly apiClient: IApiClient) {}

  /**
   * Get inconsistency parameters
   * GET /inconsistency/{requestId}
   */
  async getParams(requestId: string): Promise<InconsistencyGetResponse> {
    return this.apiClient.getInconsistencyParams(requestId);
  }

  /**
   * Create inconsistency resolution route
   * POST /inconsistency
   */
  async create(request: InconsistencyCreateRequest): Promise<InconsistencyCreateResponse> {
    return this.apiClient.createInconsistency(request);
  }

  /**
   * Get signature message for inconsistency resolution
   */
  getSignatureMessage(requestId: string): Uint8Array {
    return createInconsistencySignatureMessage(requestId);
  }
}
