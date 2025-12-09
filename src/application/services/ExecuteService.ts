/**
 * @fileoverview Transaction execution service
 * @implements PRD Section 3.2 US-1 - Simple Swap with Auto-Recovery
 * @implements PRD Section 5.1 - Tier 1 Flow
 * @layer application - Depends ONLY on domain
 */

import type {
  IApiClient,
  ITrackingService,
  IRecoveryService,
  IApprovalService,
  ApprovalTokenInfo,
} from '../../domain/interfaces/index.js';
import type {
  Quote,
  ExecuteOptions,
  ExecuteResult,
  TransactionStatus,
  TransactionRequest,
  TrackingOptions,
  ApprovalMode,
} from '../../types/index.js';
import { RouteProvider, type RouteProviderValue } from '../../constants/providers.js';
import { pollWithCallback } from '../../utils/polling.js';
import { validateAddress } from '../../utils/validation.js';
import { encodeCalldataFromResponse } from '../../utils/calldata.js';
import { isNativeToken } from '../../utils/permit.js';

/**
 * ComplexOpProcessed event topic hash
 * event ComplexOpProcessed(uint64 indexed chainIdFrom, bytes32 indexed currentRequestId,
 *   uint64 chainIdTo, bytes32 nextRequestId, uint8 result, uint8 lastOp)
 *
 * Computed: keccak256('ComplexOpProcessed(uint64,bytes32,uint64,bytes32,uint8,uint8)')
 */
const COMPLEX_OP_PROCESSED_TOPIC = '0x830adbcf80ee865e0f0883ad52e813fdbf061b0216b724694a2b4e06708d243c';

/** Default polling config for external bridges (slower than CrossCurve) */
const EXTERNAL_BRIDGE_POLLING = {
  initialInterval: 15000,   // 15 seconds
  backoffMultiplier: 1.3,
  maxInterval: 60000,       // 60 seconds
  timeout: 30 * 60 * 1000,  // 30 minutes
};

/**
 * Service for executing swap quotes
 */
export class ExecuteService {
  constructor(
    private readonly apiClient: IApiClient,
    private readonly trackingService: ITrackingService,
    private readonly recoveryService: IRecoveryService,
    private readonly approvalService: IApprovalService,
    private readonly approvalMode: ApprovalMode
  ) {}

  /**
   * Execute a quote
   * @implements PRD Section 5.1 - executeQuote()
   */
  async executeQuote(quote: Quote, options: ExecuteOptions): Promise<ExecuteResult> {
    const address = await options.signer.getAddress();
    const recipient = options.recipient ?? address;

    validateAddress(recipient, 'recipient');

    // Step 1: Get transaction data from API (includes spender address)
    let txData = await this.apiClient.createTransaction({
      from: address,
      recipient,
      routing: quote,
      buildCalldata: false,
    });

    // Step 2: Handle token approval if needed
    const sourceToken = this.extractSourceToken(quote);
    if (sourceToken && !isNativeToken(sourceToken.address)) {
      const approvalResult = await this.approvalService.handleApproval({
        token: sourceToken,
        chainId: quote.route[0]?.fromChainId ?? 0,
        owner: address,
        spender: txData.to,
        amount: BigInt(quote.amountIn),
        signer: options.signer,
        mode: this.approvalMode,
      });

      // If permit was used, re-call API with permit signature
      if (approvalResult.type === 'permit' && approvalResult.permit) {
        txData = await this.apiClient.createTransaction({
          from: address,
          recipient,
          routing: quote,
          buildCalldata: false,
          permit: {
            v: approvalResult.permit.v,
            r: approvalResult.permit.r,
            s: approvalResult.permit.s,
            deadline: approvalResult.permit.deadline,
          },
        });
      }
    }

    // Step 3: Encode and send transaction
    const calldata = encodeCalldataFromResponse(txData);

    const txRequest: TransactionRequest = {
      to: txData.to,
      data: calldata,
      value: txData.value,
      gasLimit: options.gasLimit,
      gasPrice: options.gasPrice,
      maxFeePerGas: options.maxFeePerGas,
      maxPriorityFeePerGas: options.maxPriorityFeePerGas,
      nonce: options.nonce,
    };

    const sentTx = await options.signer.sendTransaction(txRequest);
    const receipt = await sentTx.wait();

    const provider = this.extractProvider(quote);
    const requestId = this.extractRequestIdFromLogs(receipt);
    const bridgeId = this.extractBridgeId(quote, provider);

    if (!options.autoRecover) {
      return {
        transactionHash: sentTx.hash,
        requestId,
        provider,
        bridgeId,
      };
    }

    return this.trackByProvider(sentTx.hash, provider, requestId, bridgeId, quote, options);
  }

  /**
   * Extract source token info from quote for approval
   */
  private extractSourceToken(quote: Quote): ApprovalTokenInfo | undefined {
    const firstStep = quote.route[0];
    if (!firstStep?.fromToken) {
      return undefined;
    }

    return {
      address: firstStep.fromToken.address,
      permit: true, // Assume permit support, ApprovalService will handle fallback
    };
  }

  private async trackByProvider(
    txHash: string,
    provider: RouteProviderValue,
    requestId: string | undefined,
    bridgeId: string | undefined,
    quote: Quote,
    options: ExecuteOptions
  ): Promise<ExecuteResult> {
    switch (provider) {
      case RouteProvider.CROSS_CURVE: {
        if (!requestId) {
          throw new Error('CrossCurve transaction missing requestId from ComplexOpProcessed event');
        }
        const status = await this.pollAndRecover(requestId, quote, options);
        return { transactionHash: txHash, requestId, provider, status };
      }

      case RouteProvider.RUBIC:
      case RouteProvider.BUNGEE: {
        const chainId = this.getSourceChainId(quote);
        const status = await this.pollExternalBridge(txHash, provider, bridgeId, chainId, options);
        return { transactionHash: txHash, provider, bridgeId, status };
      }
    }
  }

  /**
   * Get source chain ID from quote
   */
  private getSourceChainId(quote: Quote): number | undefined {
    return quote.route[0]?.fromChainId ?? quote.txs[0]?.chainId;
  }

  /**
   * Poll external bridge status (Rubic/Bungee)
   * No recovery available - just poll until completion or failure
   */
  private async pollExternalBridge(
    txHash: string,
    provider: RouteProviderValue,
    bridgeId: string | undefined,
    chainId: number | undefined,
    options: ExecuteOptions
  ): Promise<TransactionStatus> {
    const trackingOptions: TrackingOptions = {
      provider,
      bridgeId,
      chainId,
    };

    return pollWithCallback(
      async () => {
        return this.trackingService.getTransactionStatus(txHash, trackingOptions);
      },
      (status) => {
        // Continue polling while in progress or pending
        return status.status === 'in progress';
      },
      (status) => {
        if (options.onStatusChange) {
          options.onStatusChange(status);
        }
      },
      EXTERNAL_BRIDGE_POLLING
    );
  }

  /**
   * Extract provider from quote route
   */
  private extractProvider(quote: Quote): RouteProviderValue {
    if (quote.route.length === 0) {
      return RouteProvider.CROSS_CURVE;
    }

    const routeType = quote.route[0].type?.toLowerCase();

    if (routeType === 'rubic') {
      return RouteProvider.RUBIC;
    }
    if (routeType === 'bungee') {
      return RouteProvider.BUNGEE;
    }

    return RouteProvider.CROSS_CURVE;
  }

  /**
   * Extract bridge-specific ID from quote (e.g., rubicId)
   * For Rubic routes: route[0].quote.quote.id (nested quote structure)
   */
  private extractBridgeId(quote: Quote, provider: RouteProviderValue): string | undefined {
    if (provider !== RouteProvider.RUBIC) {
      return undefined;
    }

    // Rubic ID is at route[0].quote.quote.id (nested quote from Rubic API)
    const routeQuote = quote.route[0]?.quote as Record<string, unknown> | undefined;
    const nestedQuote = routeQuote?.quote as Record<string, unknown> | undefined;
    const rubicId = nestedQuote?.id as string | undefined;

    return rubicId;
  }

  /**
   * Poll transaction status and handle auto-recovery
   * @implements PRD Section 5.1 - autoRecover flow
   */
  private async pollAndRecover(
    requestId: string,
    quote: Quote,
    options: ExecuteOptions
  ): Promise<TransactionStatus> {
    const expectedTime = this.estimateCompletionTime(quote);
    const timeout = expectedTime + 15 * 60 * 1000;

    try {
      return await pollWithCallback(
        async () => {
          return await this.trackingService.getTransactionStatus(requestId);
        },
        (status) => {
          if (options.onStatusChange) {
            options.onStatusChange(status);
          }

          return this.shouldContinuePolling(status);
        },
        (status) => {
          if (options.onStatusChange) {
            options.onStatusChange(status);
          }
        },
        { timeout }
      );
    } catch (error) {
      const status = await this.trackingService.getTransactionStatus(requestId);

      if (status.recovery?.available) {
        const recoveryResult = await this.recoveryService.recover(requestId, {
          signer: options.signer,
          onStatusChange: options.onStatusChange,
          gasLimit: options.gasLimit,
          gasPrice: options.gasPrice,
          maxFeePerGas: options.maxFeePerGas,
          maxPriorityFeePerGas: options.maxPriorityFeePerGas,
          nonce: options.nonce,
        });

        return recoveryResult.status ?? status;
      }

      throw error;
    }
  }

  /**
   * Check if polling should continue
   */
  private shouldContinuePolling(status: TransactionStatus): boolean {
    if (status.status === 'completed') {
      return false;
    }

    if (status.status === 'failed' || status.status === 'reverted' || status.status === 'canceled') {
      return false;
    }

    return true;
  }

  /**
   * Estimate completion time from quote
   */
  private estimateCompletionTime(quote: Quote): number {
    const baseTime = 5 * 60 * 1000;
    const hopTime = quote.route.length * 2 * 60 * 1000;
    return baseTime + hopTime;
  }

  /**
   * Extract requestId from ComplexOpProcessed event in transaction logs
   *
   * Event signature:
   * event ComplexOpProcessed(
   *   uint64 indexed chainIdFrom,
   *   bytes32 indexed currentRequestId,
   *   uint64 chainIdTo,
   *   bytes32 nextRequestId,
   *   uint8 result,
   *   uint8 lastOp
   * )
   *
   * IMPORTANT: Must check topics[0] matches COMPLEX_OP_PROCESSED_TOPIC
   * External bridges (rubic/bungee) don't emit this event - requestId will be undefined
   */
  private extractRequestIdFromLogs(receipt: any): string | undefined {
    if (!receipt?.logs || !Array.isArray(receipt.logs)) {
      return undefined;
    }

    for (const log of receipt.logs) {
      // CRITICAL: First check if this is a ComplexOpProcessed event by matching topic hash
      // topics[0] is the event signature hash, topics[1] is chainIdFrom, topics[2] is currentRequestId
      if (!log.topics || log.topics.length < 3) {
        continue;
      }

      // Must match the ComplexOpProcessed event signature
      if (log.topics[0] !== COMPLEX_OP_PROCESSED_TOPIC) {
        continue;
      }

      try {
        // Decode non-indexed data: (uint64 chainIdTo, bytes32 nextRequestId, uint8 result, uint8 lastOp)
        // nextRequestId is at offset 32 (after chainIdTo which is padded to 32 bytes)
        const data = log.data;
        if (data && data.length >= 130) { // 0x + 64 chars for chainIdTo + 64 chars for nextRequestId
          // Extract nextRequestId (bytes32 at position 32-64)
          const nextRequestId = '0x' + data.slice(66, 130);
          if (nextRequestId && nextRequestId !== '0x' + '0'.repeat(64)) {
            return nextRequestId;
          }
        }

        // Fallback: use currentRequestId from topics[2]
        const currentRequestId = log.topics[2];
        if (currentRequestId && currentRequestId !== '0x' + '0'.repeat(64)) {
          return currentRequestId;
        }
      } catch (error) {
        // Log parsing failed for this entry, continue to next log
        // This can happen with malformed logs or unexpected data formats
        console.debug('Failed to parse ComplexOpProcessed log:', error);
      }
    }

    // No ComplexOpProcessed event found - this is expected for external bridges
    return undefined;
  }
}
