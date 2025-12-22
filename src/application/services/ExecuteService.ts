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
  RouteStep,
} from '../../types/index.js';
import { RouteProvider, type RouteProviderValue } from '../../constants/providers.js';
import { pollWithCallback } from '../../utils/polling.js';
import { validateAddress } from '../../utils/validation.js';
import { encodeCalldataFromResponse } from '../../utils/calldata.js';
import { isNativeToken } from '../../utils/permit.js';
import { extractRequestIdFromLogs } from '../../utils/logParser.js';
import {
  getFirstRouteStepOrUndefined,
  extractSourceChainIdFromStep,
} from '../../utils/routeValidation.js';
import { TransactionError } from '../../errors/index.js';
import { ValidationError } from '../../infrastructure/api/errors/index.js';
import type { PollingConfig } from '../../types/config.js';

/**
 * Maximum gas limit (30M - typical block gas limit)
 */
const MAX_GAS_LIMIT = 30_000_000n;

/**
 * Maximum gas price (10000 gwei - unreasonably high)
 */
const MAX_GAS_PRICE = 10_000_000_000_000n; // 10000 gwei

/** Default polling config for external bridges (slower than CrossCurve) */
const DEFAULT_BRIDGE_POLLING: PollingConfig = {
  initialInterval: 15000,   // 15 seconds
  backoffMultiplier: 1.3,
  maxInterval: 60000,       // 60 seconds
  timeout: 30 * 60 * 1000,  // 30 minutes
};

/**
 * Function to get router address by chainId
 */
export type RouterLookup = (chainId: number) => string | undefined;

/**
 * Service for executing swap quotes
 */
export class ExecuteService {
  private readonly bridgePolling: PollingConfig;

  constructor(
    private readonly apiClient: IApiClient,
    private readonly trackingService: ITrackingService,
    private readonly recoveryService: IRecoveryService,
    private readonly approvalService: IApprovalService,
    private readonly approvalMode: ApprovalMode,
    private readonly getRouter?: RouterLookup,
    bridgePolling?: PollingConfig
  ) {
    this.bridgePolling = bridgePolling ?? DEFAULT_BRIDGE_POLLING;
  }

  /**
   * Validate gas parameters
   */
  private validateGasParams(options: ExecuteOptions): void {
    if (options.gasLimit !== undefined) {
      const limit = BigInt(options.gasLimit);
      if (limit <= 0n) {
        throw new ValidationError('gasLimit must be positive', 'gasLimit');
      }
      if (limit > MAX_GAS_LIMIT) {
        throw new ValidationError(
          `gasLimit ${limit} exceeds maximum allowed (${MAX_GAS_LIMIT})`,
          'gasLimit'
        );
      }
    }

    if (options.gasPrice !== undefined) {
      const price = BigInt(options.gasPrice);
      if (price <= 0n) {
        throw new ValidationError('gasPrice must be positive', 'gasPrice');
      }
      if (price > MAX_GAS_PRICE) {
        throw new ValidationError(
          `gasPrice ${price} exceeds maximum allowed (${MAX_GAS_PRICE})`,
          'gasPrice'
        );
      }
    }

    if (options.maxFeePerGas !== undefined) {
      const maxFee = BigInt(options.maxFeePerGas);
      if (maxFee <= 0n) {
        throw new ValidationError('maxFeePerGas must be positive', 'maxFeePerGas');
      }
      if (maxFee > MAX_GAS_PRICE) {
        throw new ValidationError(
          `maxFeePerGas ${maxFee} exceeds maximum allowed (${MAX_GAS_PRICE})`,
          'maxFeePerGas'
        );
      }
    }

    if (options.maxPriorityFeePerGas !== undefined) {
      const priorityFee = BigInt(options.maxPriorityFeePerGas);
      if (priorityFee <= 0n) {
        throw new ValidationError('maxPriorityFeePerGas must be positive', 'maxPriorityFeePerGas');
      }
      if (priorityFee > MAX_GAS_PRICE) {
        throw new ValidationError(
          `maxPriorityFeePerGas ${priorityFee} exceeds maximum allowed (${MAX_GAS_PRICE})`,
          'maxPriorityFeePerGas'
        );
      }
    }

    // Validate EIP-1559 consistency
    if (options.maxFeePerGas !== undefined && options.maxPriorityFeePerGas !== undefined) {
      const maxFee = BigInt(options.maxFeePerGas);
      const priorityFee = BigInt(options.maxPriorityFeePerGas);
      if (priorityFee > maxFee) {
        throw new ValidationError(
          'maxPriorityFeePerGas cannot exceed maxFeePerGas',
          'maxPriorityFeePerGas'
        );
      }
    }
  }

  /**
   * Execute a quote
   */
  async executeQuote(quote: Quote, options: ExecuteOptions): Promise<ExecuteResult> {
    // Validate gas parameters first
    this.validateGasParams(options);

    const address = await options.signer.getAddress();
    const recipient = options.recipient ?? address;

    validateAddress(recipient, 'recipient');

    // Step 1: Handle token approval if needed (before API call)
    const sourceToken = this.extractSourceToken(quote);
    const firstStep = getFirstRouteStepOrUndefined(quote.route);
    const chainId = extractSourceChainIdFromStep(firstStep);
    let permit: { v: number; r: string; s: string } | undefined;

    if (sourceToken && !isNativeToken(sourceToken.address) && chainId) {
      // Get router address from chains data
      const router = this.getRouter?.(chainId);
      if (!router) {
        throw new Error(`Router not found for chain ${chainId}. Call sdk.init() first.`);
      }

      const approvalResult = await this.approvalService.handleApproval({
        token: sourceToken,
        chainId,
        owner: address,
        spender: router,
        amount: BigInt(quote.amountIn),
        signer: options.signer,
        mode: this.approvalMode,
      });

      if (approvalResult.type === 'permit' && approvalResult.permit) {
        permit = {
          v: approvalResult.permit.v,
          r: approvalResult.permit.r,
          s: approvalResult.permit.s,
        };
      }
    }

    // Step 2: Get transaction data from API (single call, with permit if available)
    const txData = await this.apiClient.createTransaction({
      from: address,
      recipient,
      routing: quote,
      buildCalldata: false,
      permit,
    });

    // Step 3: Encode and send transaction
    const calldata = encodeCalldataFromResponse(txData);

    // Calculate total value: base value + executionPrice from invoice
    // When buildCalldata: false, we need to add executionPrice to the value
    // The invoice is in args[2].invoice.executionPrice
    let totalValue = BigInt(txData.value || '0');
    if (txData.args && txData.args[2]) {
      const invoiceArg = txData.args[2] as { invoice?: { executionPrice?: string } };
      if (invoiceArg.invoice?.executionPrice) {
        totalValue += BigInt(invoiceArg.invoice.executionPrice);
      }
    }

    if (process.env.DEBUG_TX === 'true') {
      console.log('[DEBUG TX] txData.value:', txData.value);
      console.log('[DEBUG TX] totalValue (with executionPrice):', totalValue.toString());
      console.log('[DEBUG TX] calldata length:', calldata.length);
    }

    const txRequest: TransactionRequest = {
      to: txData.to,
      data: calldata,
      value: totalValue.toString(),
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
      if (process.env.DEBUG_TX === 'true') {
        console.log('[DEBUG TX] Transaction hash:', sentTx.hash);
      }
      receipt = await sentTx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null - transaction may have been dropped');
      }
      if (receipt.status === 0) {
        throw new Error('Transaction reverted');
      }
      if (process.env.DEBUG_TX === 'true') {
        console.log('[DEBUG TX] Transaction confirmed, logs count:', (receipt as { logs?: unknown[] }).logs?.length);
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
    if (process.env.DEBUG_TX === 'true') {
      console.log('[DEBUG TX] Extracted requestId:', requestId);
    }
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
   * Note: External bridges (Rubic, Bungee) don't support permit signatures,
   * so we disable permit for those routes.
   */
  private extractSourceToken(quote: Quote): ApprovalTokenInfo | undefined {
    const firstStep = getFirstRouteStepOrUndefined(quote.route);
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

    // Disable permit for now - API has issues with permit signature format
    const supportsPermit = false;

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
      const status = await this.pollExternalBridge(txHash, provider, bridgeId, chainId, options);
      return { transactionHash: txHash, provider, bridgeId, status };
    }

    throw new Error('CrossCurve transaction missing requestId from ComplexOpProcessed event');
  }

  /**
   * Get source chain ID from quote
   */
  private getSourceChainId(quote: Quote): number | undefined {
    const firstStep = getFirstRouteStepOrUndefined(quote.route);
    return extractSourceChainIdFromStep(firstStep) ?? quote.txs[0]?.chainId;
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
      this.bridgePolling
    );
  }

  /**
   * Extract provider from quote route
   */
  private extractProvider(quote: Quote): RouteProviderValue {
    const firstStep = getFirstRouteStepOrUndefined(quote.route);
    if (!firstStep) {
      return RouteProvider.CROSS_CURVE;
    }

    const routeType = firstStep.type?.toLowerCase();

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
    const firstStep = getFirstRouteStepOrUndefined(quote.route);
    const routeQuote = firstStep?.quote as Record<string, unknown> | undefined;
    const nestedQuote = routeQuote?.quote as Record<string, unknown> | undefined;
    return nestedQuote?.id as string | undefined;
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
