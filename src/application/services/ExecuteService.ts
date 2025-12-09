/**
 * @fileoverview Transaction execution service
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
import { extractRequestIdFromLogs } from '../../utils/logParser.js';
import { TransactionError } from '../../errors/index.js';

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
      // If sourceToken exists, quote.route[0] must exist (extractSourceToken checks this)
      const firstStep = quote.route[0];
      const chainId = this.extractSourceChainId(firstStep);
      if (!chainId) {
        throw new Error('Quote route missing source chain ID');
      }

      const approvalResult = await this.approvalService.handleApproval({
        token: sourceToken,
        chainId,
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

    // Send transaction with error handling
    let sentTx;
    try {
      sentTx = await options.signer.sendTransaction(txRequest);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TransactionError(
        `Failed to send transaction: ${message}`,
        undefined,
        message
      );
    }

    // Wait for receipt with error handling
    let receipt;
    try {
      receipt = await sentTx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null - transaction may have been dropped');
      }
      if (receipt.status === 0) {
        throw new Error('Transaction reverted');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TransactionError(
        `Transaction failed: ${message}`,
        sentTx.hash,
        message
      );
    }

    const provider = this.extractProvider(quote);
    // Cast receipt to include logs - adapters return full receipt from underlying library
    const requestId = extractRequestIdFromLogs(receipt as { logs?: Array<{ topics?: string[]; data?: string }> });
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
   * Extract source chain ID from route step
   * Handles both standard format (fromChainId) and Rubic format (chainId, params.chainIdIn)
   */
  private extractSourceChainId(step: RouteStep | undefined): number | undefined {
    if (!step) {
      return undefined;
    }

    // Try standard format first
    if (step.fromChainId) {
      return step.fromChainId;
    }

    // Try Rubic format: step.chainId or step.params.chainIdIn
    const stepWithChainId = step as { chainId?: number };
    if (stepWithChainId.chainId) {
      return stepWithChainId.chainId;
    }

    if (step.params) {
      const params = step.params as Record<string, unknown>;
      if (typeof params.chainIdIn === 'number') {
        return params.chainIdIn;
      }
    }

    return undefined;
  }

  /**
   * Extract source token info from quote for approval
   * Note: External bridges (Rubic, Bungee) don't support permit signatures,
   * so we disable permit for those routes.
   */
  private extractSourceToken(quote: Quote): ApprovalTokenInfo | undefined {
    const firstStep = quote.route[0];
    if (!firstStep) {
      return undefined;
    }

    // Try to get token address from different possible locations in the route step
    // 1. Standard format: firstStep.fromToken.address
    // 2. Rubic format: firstStep.params.tokenIn.address
    let tokenAddress: string | undefined;

    if (firstStep.fromToken?.address) {
      tokenAddress = firstStep.fromToken.address;
    } else if (firstStep.params) {
      const params = firstStep.params as Record<string, unknown>;
      const tokenIn = params.tokenIn as { address?: string } | undefined;
      if (tokenIn?.address) {
        tokenAddress = tokenIn.address;
      }
    }

    if (!tokenAddress) {
      return undefined;
    }

    // External bridges don't support permit - they require standard approve()
    const provider = this.extractProvider(quote);
    const supportsPermit = provider === RouteProvider.CROSS_CURVE;

    return {
      address: tokenAddress,
      permit: supportsPermit,
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
    // All routes go through CrossCurve contract and emit ComplexOpProcessed event
    // So we should always track via CrossCurve API using requestId
    if (requestId) {
      const status = await this.pollAndRecover(requestId, quote, options);
      return { transactionHash: txHash, requestId, provider, status };
    }

    // Fallback to external bridge tracking only if no requestId was extracted
    // This shouldn't normally happen since CrossCurve always emits the event
    if (provider === RouteProvider.RUBIC || provider === RouteProvider.BUNGEE) {
      const chainId = this.getSourceChainId(quote);
      console.log('[DEBUG] trackByProvider - using external bridge tracking');
      console.log('[DEBUG] trackByProvider - txHash:', txHash);
      console.log('[DEBUG] trackByProvider - provider:', provider);
      console.log('[DEBUG] trackByProvider - bridgeId:', bridgeId);
      const status = await this.pollExternalBridge(txHash, provider, bridgeId, chainId, options);
      return { transactionHash: txHash, provider, bridgeId, status };
    }

    throw new Error('CrossCurve transaction missing requestId from ComplexOpProcessed event');
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

    console.log('[DEBUG] extractBridgeId - routeQuote:', routeQuote ? 'exists' : 'undefined');
    console.log('[DEBUG] extractBridgeId - nestedQuote:', nestedQuote ? 'exists' : 'undefined');
    console.log('[DEBUG] extractBridgeId - rubicId:', rubicId);

    return rubicId;
  }

  /**
   * Poll transaction status and handle auto-recovery
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
}
