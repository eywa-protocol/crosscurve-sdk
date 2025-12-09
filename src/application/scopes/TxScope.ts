/**
 * @fileoverview Transaction scope for Tier 2 API
 * @implements PRD Section 3.2 US-5 - Manual Transaction Building
 * @implements PRD Section 5.1 - Tier 2 Flow
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient } from '../../domain/interfaces/index.js';
import type { TxCreateRequest, TxCreateResponse } from '../../types/api/index.js';

/**
 * Transaction scope: sdk.tx.*
 */
export class TxScope {
  constructor(private readonly apiClient: IApiClient) {}

  /**
   * Create transaction calldata
   * POST /tx/create
   */
  async create(request: TxCreateRequest): Promise<TxCreateResponse> {
    return this.apiClient.createTransaction(request);
  }

  /**
   * Create emergency withdrawal transaction
   * POST /tx/create/emergency
   */
  async createEmergency(requestId: string, signature: string): Promise<TxCreateResponse> {
    return this.apiClient.createEmergencyTransaction({
      requestId,
      signature,
    });
  }

  /**
   * Create retry transaction
   * POST /tx/create/retry
   */
  async createRetry(requestId: string, signature: string): Promise<TxCreateResponse> {
    return this.apiClient.createRetryTransaction({
      requestId,
      signature,
    });
  }
}
