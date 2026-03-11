/**
 * @fileoverview Transaction API interface
 * @layer domain - ISP-compliant interface for transaction operations
 */

import type {
  TxCreateRequest,
  TxCreateResponse,
  TxCreateEmergencyRequest,
  TxCreateRetryRequest,
  TransactionGetResponse,
} from '../../types/api/index.js';
import type { CalldataOnlyResponse } from '../../types/transaction.js';

/**
 * Interface for transaction operations
 */
export interface ITransactionApi {
  /**
   * Create transaction calldata
   * POST /tx/create
   */
  createTransaction(request: TxCreateRequest): Promise<TxCreateResponse>;

  /**
   * Create emergency withdrawal transaction
   * POST /tx/create/emergency
   */
  createEmergencyTransaction(request: TxCreateEmergencyRequest): Promise<TxCreateResponse>;

  /**
   * Create retry transaction
   * POST /tx/create/retry
   */
  createRetryTransaction(request: TxCreateRetryRequest): Promise<TxCreateResponse>;

  /**
   * Create calldataOnly transaction
   * POST /tx/create with calldataOnly: true
   */
  createCalldataOnly(request: TxCreateRequest): Promise<CalldataOnlyResponse>;

  /**
   * Get transaction status
   * GET /transaction/{requestId}
   */
  getTransaction(requestId: string): Promise<TransactionGetResponse>;
}
