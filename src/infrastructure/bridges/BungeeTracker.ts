/**
 * @fileoverview Bungee bridge tracker implementation
 * @layer infrastructure - Implements IBridgeTracker
 *
 * Tracks cross-chain transactions through Bungee/Socket API
 * @see https://public-backend.bungee.exchange/api/v1/bungee/status
 */

import type {
  IBridgeTracker,
  BridgeTrackingParams,
  BridgeStatus,
} from '../../domain/interfaces/index.js';
import type {
  BungeeStatusResponse,
  BungeeTransactionResult,
  BungeeSourceStatus,
  BungeeDestinationStatus,
} from './types.js';
import { fetchWithRetry } from '../utils/fetchWithRetry.js';

const BUNGEE_API_BASE = 'https://public-backend.bungee.exchange';

/**
 * Bungee/Socket bridge transaction tracker
 * Implements IBridgeTracker for Bungee cross-chain swaps
 */
export class BungeeTracker implements IBridgeTracker {
  readonly provider = 'bungee';

  /**
   * Track a transaction through Bungee's API
   * @param params Transaction hash (bridgeId not needed for Bungee)
   * @returns Normalized bridge status
   */
  async track(params: BridgeTrackingParams): Promise<BridgeStatus> {
    const url = new URL('/api/v1/bungee/status', BUNGEE_API_BASE);
    url.searchParams.set('txHash', params.transactionHash);

    const data = await fetchWithRetry<BungeeStatusResponse>(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!data.success || !data.result || data.result.length === 0) {
      throw new Error(data.message || 'Bungee API returned unsuccessful response');
    }

    const firstResult = data.result[0];
    if (!firstResult?.originData || !firstResult?.destinationData) {
      throw new Error('Bungee API returned malformed transaction data');
    }

    return this.mapResponse(firstResult);
  }

  /**
   * Map Bungee API response to normalized BridgeStatus
   */
  private mapResponse(result: BungeeTransactionResult): BridgeStatus {
    const sourceStatus = result.originData.status;
    const destStatus = result.destinationData.status;

    return {
      status: this.mapOverallStatus(sourceStatus, destStatus),
      sourceTx: {
        hash: result.originData.txHash,
        status: this.mapSourceStatus(sourceStatus),
      },
      destinationTx: {
        hash: result.destinationData.txHash,
        status: this.mapDestinationStatus(destStatus),
      },
      raw: result,
    };
  }

  /**
   * Derive overall status from source and destination statuses
   */
  private mapOverallStatus(
    sourceStatus: BungeeSourceStatus,
    destStatus: BungeeDestinationStatus
  ): BridgeStatus['status'] {
    // Source failed = overall failed
    if (sourceStatus === 'FAILED') {
      return 'failed';
    }

    // Source pending = overall pending
    if (sourceStatus === 'PENDING') {
      return 'pending';
    }

    // Source completed, check destination
    switch (destStatus) {
      case 'COMPLETED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      case 'PENDING':
      case 'READY_FOR_CLAIM':
        return 'in_progress';
      default:
        return 'in_progress';
    }
  }

  /**
   * Map Bungee source status to string
   */
  private mapSourceStatus(status: BungeeSourceStatus): string {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'COMPLETED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Map Bungee destination status to string
   */
  private mapDestinationStatus(status: BungeeDestinationStatus): string {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'COMPLETED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      case 'READY_FOR_CLAIM':
        return 'ready_for_claim';
      default:
        return 'pending';
    }
  }
}
