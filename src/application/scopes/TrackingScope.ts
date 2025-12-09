/**
 * @fileoverview Tracking scope for Tier 2 API
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient, ITrackingService } from '../../domain/interfaces/index.js';
import type { TransactionStatus } from '../../types/index.js';

/**
 * Tracking scope: sdk.tracking.*
 */
export class TrackingScope {
  constructor(
    private readonly apiClient: IApiClient,
    private readonly trackingService: ITrackingService
  ) {}

  /**
   * Get transaction status
   * GET /transaction/{requestId}
   */
  async get(requestId: string): Promise<TransactionStatus> {
    return this.trackingService.getTransactionStatus(requestId);
  }

  /**
   * Search transactions
   * GET /search
   */
  async search(query: string): Promise<TransactionStatus[]> {
    return this.trackingService.searchTransactions(query);
  }
}
