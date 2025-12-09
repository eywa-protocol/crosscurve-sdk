/**
 * @fileoverview Transaction domain entity
 * @layer domain - ZERO external dependencies
 */

import type { TransactionStatus, RecoveryInfo } from '../../types/transaction.js';

/**
 * Transaction entity representing transaction status
 * Immutable value object
 */
export class TransactionEntity implements TransactionStatus {
  readonly status: 'in progress' | 'completed' | 'failed' | 'reverted' | 'retry' | 'canceled';
  readonly inconsistency: boolean;
  readonly source: TransactionStatus['source'];
  readonly oracle: TransactionStatus['oracle'];
  readonly destination: TransactionStatus['destination'];
  readonly data: any;
  readonly recovery?: RecoveryInfo;
  readonly warning?: TransactionStatus['warning'];

  constructor(data: TransactionStatus) {
    this.status = data.status;
    this.inconsistency = data.inconsistency;
    this.source = { ...data.source, events: [...data.source.events] };
    this.oracle = { ...data.oracle };
    this.destination = {
      ...data.destination,
      events: [...data.destination.events],
      bridgeState: { ...data.destination.bridgeState },
    };
    this.data = data.data;
    this.recovery = data.recovery ? { ...data.recovery } : undefined;
    this.warning = data.warning ? { ...data.warning } : undefined;
  }

  /**
   * Check if transaction is complete
   */
  isComplete(): boolean {
    return this.status === 'completed';
  }

  /**
   * Check if transaction failed
   */
  isFailed(): boolean {
    return this.status === 'failed' || this.status === 'reverted' || this.status === 'canceled';
  }

  /**
   * Check if transaction is in progress
   */
  isInProgress(): boolean {
    return this.status === 'in progress' || this.status === 'retry';
  }

  /**
   * Check if recovery is available
   */
  hasRecovery(): boolean {
    return this.recovery?.available === true;
  }

  /**
   * Get recovery type if available
   */
  getRecoveryType(): 'emergency' | 'retry' | 'inconsistency' | null {
    return this.recovery?.available ? this.recovery.type : null;
  }
}
