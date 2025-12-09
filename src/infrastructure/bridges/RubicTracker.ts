/**
 * @fileoverview Rubic bridge tracker implementation
 * @layer infrastructure - Implements IBridgeTracker
 *
 * Tracks cross-chain transactions through Rubic's API
 * @see https://api-v2.rubic.exchange/api/info/statusExtended
 */

import type {
  IBridgeTracker,
  BridgeTrackingParams,
  BridgeStatus,
} from '../../domain/interfaces/index.js';
import type { RubicStatusResponse, RubicStatus } from './types.js';
import { fetchWithRetry } from '../utils/fetchWithRetry.js';

const RUBIC_API_BASE = 'https://api-v2.rubic.exchange';

/**
 * Rubic bridge transaction tracker
 * Implements IBridgeTracker for Rubic cross-chain swaps
 */
export class RubicTracker implements IBridgeTracker {
  readonly provider = 'rubic';

  /**
   * Track a transaction through Rubic's API
   * @param params Transaction hash and optional rubicId
   * @returns Normalized bridge status
   */
  async track(params: BridgeTrackingParams): Promise<BridgeStatus> {
    const url = new URL('/api/info/statusExtended', RUBIC_API_BASE);
    url.searchParams.set('srcTxHash', params.transactionHash);

    if (params.bridgeId) {
      url.searchParams.set('rubicId', params.bridgeId);
    }

    const data = await fetchWithRetry<RubicStatusResponse | { code: number; reason: string }>(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    // Check for error response from Rubic API
    if ('code' in data && 'reason' in data) {
      // Return pending status if Rubic can't find the transaction yet
      // This can happen if the transaction was just submitted
      return {
        status: 'pending',
        sourceTx: {
          hash: params.transactionHash,
          status: 'pending',
        },
        destinationTx: {
          hash: null,
          status: 'pending',
        },
        raw: data,
      };
    }

    return this.mapResponse(data);
  }

  /**
   * Map Rubic API response to normalized BridgeStatus
   */
  private mapResponse(data: RubicStatusResponse): BridgeStatus {
    return {
      status: this.mapStatus(data.status),
      sourceTx: {
        hash: data.srcTxHash ?? data.sourceTxHash ?? null,
        status: this.mapSourceStatus(data.status),
      },
      destinationTx: {
        hash: data.dstTxHash ?? data.destinationTxHash ?? null,
        status: this.mapDestinationStatus(data.status),
      },
      raw: data,
    };
  }

  /**
   * Map Rubic status to normalized status
   */
  private mapStatus(status: RubicStatus): BridgeStatus['status'] {
    switch (status) {
      case 'pending':
      case 'source_pending':
        return 'pending';

      case 'source_confirmed':
      case 'destination_pending':
        return 'in_progress';

      case 'success':
      case 'SUCCESS':
        return 'completed';

      case 'fail':
      case 'FAIL':
      case 'cancelled':
        return 'failed';

      case 'revert':
        return 'refunded';

      default:
        return 'in_progress';
    }
  }

  /**
   * Map Rubic status to source transaction status string
   */
  private mapSourceStatus(status: RubicStatus): string {
    switch (status) {
      case 'pending':
      case 'source_pending':
        return 'pending';

      case 'source_confirmed':
      case 'destination_pending':
      case 'success':
      case 'SUCCESS':
        return 'completed';

      case 'fail':
      case 'FAIL':
      case 'cancelled':
      case 'revert':
        return 'failed';

      default:
        return 'pending';
    }
  }

  /**
   * Map Rubic status to destination transaction status string
   */
  private mapDestinationStatus(status: RubicStatus): string {
    switch (status) {
      case 'pending':
      case 'source_pending':
      case 'source_confirmed':
        return 'pending';

      case 'destination_pending':
        return 'in_progress';

      case 'success':
      case 'SUCCESS':
        return 'completed';

      case 'fail':
      case 'FAIL':
      case 'cancelled':
        return 'failed';

      case 'revert':
        return 'refunded';

      default:
        return 'pending';
    }
  }
}
