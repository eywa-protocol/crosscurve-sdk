/**
 * @fileoverview Transaction status tracking service
 * @implements PRD Section 3.2 US-2 - Manual Tracking
 * @implements PRD Section 7.10 - Recovery detection
 * @layer application - Depends ONLY on domain
 *
 * Supports multiple providers:
 * - CrossCurve native routes (via /transaction/{requestId})
 * - External bridges (Rubic, Bungee) via their respective APIs
 */

import type {
  IApiClient,
  IBridgeTracker,
  BridgeStatus,
} from '../../domain/interfaces/index.js';
import type {
  TransactionStatus,
  RecoveryInfo,
  TrackingOptions,
} from '../../types/index.js';
import { RouteProvider, type RouteProviderValue } from '../../constants/providers.js';

/**
 * Service for tracking transaction status across multiple providers
 */
export class TrackingService {
  private readonly bridgeTrackers: Map<RouteProviderValue, IBridgeTracker>;

  constructor(
    private readonly apiClient: IApiClient,
    bridgeTrackers: IBridgeTracker[] = []
  ) {
    this.bridgeTrackers = new Map(
      bridgeTrackers.map((tracker) => [tracker.provider as RouteProviderValue, tracker])
    );
  }

  /**
   * Get transaction status by identifier
   *
   * For CrossCurve routes: identifier is requestId
   * For external bridges: identifier is transaction hash
   *
   * @param identifier Request ID or transaction hash
   * @param options Provider info and bridge-specific identifiers
   */
  async getTransactionStatus(
    identifier: string,
    options?: TrackingOptions
  ): Promise<TransactionStatus> {
    const provider = options?.provider;

    // CrossCurve native routes: use API with requestId
    if (!provider || provider === RouteProvider.CROSS_CURVE) {
      return this.trackViaCrossCurveApi(identifier);
    }

    // External bridges: use bridge tracker
    const tracker = this.bridgeTrackers.get(provider);
    if (!tracker) {
      throw new Error(
        `No tracker available for provider: ${provider}. ` +
        `Available trackers: ${Array.from(this.bridgeTrackers.keys()).join(', ') || 'none'}`
      );
    }

    const bridgeStatus = await tracker.track({
      transactionHash: identifier,
      bridgeId: options?.bridgeId,
    });

    return this.mapBridgeStatusToTransactionStatus(bridgeStatus, provider);
  }

  /**
   * Track via CrossCurve API (original behavior)
   */
  private async trackViaCrossCurveApi(requestId: string): Promise<TransactionStatus> {
    const response = await this.apiClient.getTransaction(requestId);

    const status: TransactionStatus = {
      ...response,
      recovery: this.computeRecoveryInfo(response),
    };

    return status;
  }

  /**
   * Map external bridge status to unified TransactionStatus
   */
  private mapBridgeStatusToTransactionStatus(
    bridge: BridgeStatus,
    provider: RouteProviderValue
  ): TransactionStatus {
    return {
      status: this.mapBridgeStatusToOverall(bridge.status),
      inconsistency: false,
      source: {
        chainId: 0, // Not available from bridge APIs
        transactionHash: bridge.sourceTx?.hash || '',
        from: '',
        events: [],
        status: this.mapToSourceStatus(bridge.sourceTx?.status),
      },
      oracle: {
        relayChainId: 0,
        requestId: '',
        status: 'in progress',
        height: null,
        epoch: null,
        time: null,
      },
      destination: {
        chainId: 0, // Not available from bridge APIs
        transactionHash: bridge.destinationTx?.hash || null,
        events: [],
        emergency: false,
        status: this.mapToDestinationStatus(bridge.destinationTx?.status),
        bridgeState: {
          [provider]: { txHash: bridge.destinationTx?.hash },
        },
      },
      data: bridge.raw,
      recovery: undefined, // External bridges don't support CrossCurve recovery
    };
  }

  /**
   * Map bridge status to overall TransactionStatus.status
   */
  private mapBridgeStatusToOverall(
    status: BridgeStatus['status']
  ): TransactionStatus['status'] {
    switch (status) {
      case 'pending':
        return 'in progress';
      case 'in_progress':
        return 'in progress';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'refunded':
        return 'reverted';
      default:
        return 'in progress';
    }
  }

  /**
   * Map source status string to TransactionStatus.source.status
   */
  private mapToSourceStatus(status?: string): 'pending' | 'completed' | 'failed' {
    if (!status) return 'pending';
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'completed';
      case 'failed':
      case 'fail':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Map destination status string to TransactionStatus.destination.status
   */
  private mapToDestinationStatus(
    status?: string
  ): 'pending' | 'in progress' | 'completed' | 'failed' | 'retry' {
    if (!status) return 'pending';
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'completed';
      case 'failed':
      case 'fail':
        return 'failed';
      case 'in_progress':
      case 'in progress':
        return 'in progress';
      default:
        return 'pending';
    }
  }

  /**
   * Search transactions by address or hash
   * @implements PRD Section 5.1 - searchTransactions()
   *
   * Note: Only searches CrossCurve API. External bridges not searchable.
   */
  async searchTransactions(query: string): Promise<TransactionStatus[]> {
    try {
      const response = await this.apiClient.searchTransactions(query);
      return response.transactions.map((tx) => ({
        ...tx,
        recovery: this.computeRecoveryInfo(tx),
      }));
    } catch (error: unknown) {
      // API returns 404 when no transactions found - return empty array
      if ((error as any)?.statusCode === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Compute recovery information from transaction status
   * @implements PRD Section 7.10 - Recovery types
   */
  private computeRecoveryInfo(tx: TransactionStatus | any): RecoveryInfo | undefined {
    if (tx.destination?.emergency) {
      return {
        type: 'emergency',
        available: true,
      };
    }

    if (tx.destination?.status === 'retry') {
      return {
        type: 'retry',
        available: true,
      };
    }

    if (tx.inconsistency === true) {
      return {
        type: 'inconsistency',
        available: true,
      };
    }

    return undefined;
  }
}
