/**
 * @fileoverview Recovery service interface
 * @layer domain - Port for recovery functionality
 */

import type { ExecuteResult } from '../../types/transaction.js';
import type { RecoveryOptions } from '../../types/recovery.js';

/**
 * Interface for recovery operations
 * Implemented by RecoveryService in application layer
 */
export interface IRecoveryService {
  /**
   * Execute recovery operation (detects type automatically)
   *
   * @param requestId The request ID of the failed transaction
   * @param options Recovery options including signer and gas parameters
   */
  recover(requestId: string, options: RecoveryOptions): Promise<ExecuteResult>;
}
