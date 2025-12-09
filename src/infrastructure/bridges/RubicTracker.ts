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

    // Retry up to 3 times on transient errors
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Rubic API error: ${response.status} ${response.statusText}`);
        }

        const data: RubicStatusResponse = await response.json();
        return this.mapResponse(data);
      } catch (error) {
        lastError = error as Error;
        // Retry on network/timeout errors
        if (attempt < 2 && (lastError.name === 'AbortError' || lastError.message.includes('fetch'))) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError;
  }

  /**
   * Map Rubic API response to normalized BridgeStatus
   */
  private mapResponse(data: RubicStatusResponse): BridgeStatus {
    return {
      status: this.mapStatus(data.status),
      sourceTx: {
        hash: data.srcTxHash,
        status: this.mapSourceStatus(data.status),
      },
      destinationTx: {
        hash: data.dstTxHash,
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
        return 'completed';

      case 'fail':
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
        return 'completed';

      case 'fail':
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
        return 'completed';

      case 'fail':
      case 'cancelled':
        return 'failed';

      case 'revert':
        return 'refunded';

      default:
        return 'pending';
    }
  }
}
