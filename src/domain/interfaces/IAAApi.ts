/**
 * @fileoverview Interface for account abstraction transaction creation
 */

import type { AACreateTxParams, AATransaction } from '../../types/aa.js';

export interface IAAApi {
  createAATransaction(params: AACreateTxParams): Promise<AATransaction>;
}
