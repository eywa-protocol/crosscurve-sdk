/**
 * @fileoverview Tracking service interface
 * @layer domain - Port for tracking functionality
 */

import type { TransactionStatus, TrackingOptions } from '../../types/transaction.js';

/**
 * Interface for transaction status tracking
 * Implemented by TrackingService in application layer
 */
export interface ITrackingService {
  /**
   * Get transaction status by identifier
   *
   * For CrossCurve routes: identifier is requestId
   * For external bridges: identifier is transaction hash
   *
   * @param identifier Request ID or transaction hash
   * @param options Provider info and bridge-specific identifiers
   */
  getTransactionStatus(
    identifier: string,
    options?: TrackingOptions
  ): Promise<TransactionStatus>;

  /**
   * Search transactions by address or hash
   *
   * Note: Only searches CrossCurve API. External bridges not searchable.
   */
  searchTransactions(query: string): Promise<TransactionStatus[]>;
}
