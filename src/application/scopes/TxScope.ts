/**
 * @fileoverview Transaction scope for Tier 2 API
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient } from '../../domain/interfaces/index.js';
import type { TxCreateRequest, TxCreateResponse } from '../../types/api/index.js';
import type { CalldataOnlyResponse } from '../../types/transaction.js';

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
   * Create calldataOnly transaction
   * Returns raw calldata for integrators managing their own tx submission
   */
  async createCalldata(request: TxCreateRequest): Promise<CalldataOnlyResponse> {
    return this.apiClient.createCalldataOnly(request);
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
