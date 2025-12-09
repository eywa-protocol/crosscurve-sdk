/**
 * @fileoverview Recovery flow detection and execution service
 * @layer application - Depends ONLY on domain
 */

import type {
  IApiClient,
  ITrackingService,
  IApprovalService,
  ApprovalTokenInfo,
} from '../../domain/interfaces/index.js';
import type {
  RecoveryOptions,
  ExecuteResult,
  TransactionStatus,
  TransactionRequest,
  RecoveryType,
  ApprovalMode,
} from '../../types/index.js';
import { RouteProvider } from '../../constants/providers.js';
import {
  createEmergencySignatureMessage,
  createRetrySignatureMessage,
  createInconsistencySignatureMessage,
} from '../../utils/signature.js';
import { encodeCalldataFromResponse } from '../../utils/calldata.js';
import { isNativeToken } from '../../utils/permit.js';
import { TransactionError } from '../../errors/index.js';

/**
 * Service for handling recovery operations
 */
export class RecoveryService {
  constructor(
    private readonly apiClient: IApiClient,
    private readonly trackingService: ITrackingService,
    private readonly approvalService: IApprovalService,
    private readonly approvalMode: ApprovalMode
  ) {}

  /**
   * Execute recovery operation (detects type automatically)
   */
  async recover(requestId: string, options: RecoveryOptions): Promise<ExecuteResult> {
    const status = await this.trackingService.getTransactionStatus(requestId);

    if (!status.recovery?.available) {
      throw new Error('No recovery available for this transaction');
    }

    const recoveryType = status.recovery.type;

    switch (recoveryType) {
      case 'emergency':
        return this.executeEmergency(requestId, status, options);
      case 'retry':
        return this.executeRetry(requestId, status, options);
      case 'inconsistency':
        return this.executeInconsistency(requestId, status, options);
      default:
        throw new Error(`Unknown recovery type: ${recoveryType}`);
    }
  }

  /**
   * Execute emergency withdrawal
   */
  private async executeEmergency(
    requestId: string,
    status: TransactionStatus,
    options: RecoveryOptions
  ): Promise<ExecuteResult> {
    const message = createEmergencySignatureMessage(requestId);
    const signature = await options.signer.signMessage(message);

    const txResponse = await this.apiClient.createEmergencyTransaction({
      requestId,
      signature,
    });

    const txHash = await this.sendRecoveryTransaction(txResponse, options, 'emergency');

    return {
      transactionHash: txHash,
      requestId,
      provider: RouteProvider.CROSS_CURVE,
      status,
    };
  }

  /**
   * Execute retry delivery
   */
  private async executeRetry(
    requestId: string,
    status: TransactionStatus,
    options: RecoveryOptions
  ): Promise<ExecuteResult> {
    const message = createRetrySignatureMessage(requestId);
    const signature = await options.signer.signMessage(message);

    const txResponse = await this.apiClient.createRetryTransaction({
      requestId,
      signature,
    });

    const txHash = await this.sendRecoveryTransaction(txResponse, options, 'retry');

    return {
      transactionHash: txHash,
      requestId,
      provider: RouteProvider.CROSS_CURVE,
      status,
    };
  }

  /**
   * Execute inconsistency resolution
   *
   * Flow:
   * 1. Validate slippage is provided
   * 2. Get inconsistency params and find route
   * 3. Create and sign transaction with approval handling
   * 4. Send transaction
   *
   * @throws Error if slippage is not provided (required per CLAUDE.md - no hardcoded defaults)
   */
  private async executeInconsistency(
    requestId: string,
    status: TransactionStatus,
    options: RecoveryOptions
  ): Promise<ExecuteResult> {
    const slippage = this.validateInconsistencySlippage(options.slippage);
    const address = await options.signer.getAddress();

    // Step 1: Get inconsistency params and find route
    const { params, route } = await this.findInconsistencyRoute(
      requestId,
      slippage,
      address
    );

    // Emit warning about slippage being used for new route
    this.emitSlippageWarning(status, slippage, options.onStatusChange);

    // Step 2: Create transaction with approval handling
    const txResponse = await this.createInconsistencyTransaction(
      requestId,
      route,
      params,
      address,
      options.signer
    );

    // Step 3: Send transaction
    const txHash = await this.sendRecoveryTransaction(
      txResponse,
      options,
      'inconsistency resolution'
    );

    return {
      transactionHash: txHash,
      requestId,
      provider: RouteProvider.CROSS_CURVE,
      status,
    };
  }

  /**
   * Validate that slippage is provided for inconsistency resolution
   */
  private validateInconsistencySlippage(slippage: number | undefined): number {
    if (slippage === undefined) {
      throw new Error(
        'Slippage is required for inconsistency resolution. ' +
        'Provide slippage in RecoveryOptions to proceed.'
      );
    }
    return slippage;
  }

  /**
   * Get inconsistency params and find a route for resolution
   */
  private async findInconsistencyRoute(
    requestId: string,
    slippage: number,
    address: string
  ): Promise<{
    params: { tokenIn: string; amountIn: string; chainIdIn: number; tokenOut: string; chainIdOut: number };
    route: { route: Array<{ fromToken?: { address: string } }> };
  }> {
    const inconsistencyParams = await this.apiClient.getInconsistencyParams(requestId);

    const routes = await this.apiClient.scanRoutes({
      params: {
        tokenIn: inconsistencyParams.params.tokenIn,
        amountIn: inconsistencyParams.params.amountIn,
        chainIdIn: inconsistencyParams.params.chainIdIn,
        tokenOut: inconsistencyParams.params.tokenOut,
        chainIdOut: inconsistencyParams.params.chainIdOut,
      },
      slippage,
      from: address,
    });

    if (!routes || routes.length === 0) {
      throw new Error('No routes available for inconsistency resolution');
    }

    return {
      params: inconsistencyParams.params,
      route: routes[0] as { route: Array<{ fromToken?: { address: string } }> },
    };
  }

  /**
   * Emit warning about slippage being used for inconsistency resolution
   */
  private emitSlippageWarning(
    status: TransactionStatus,
    slippage: number,
    onStatusChange?: (status: TransactionStatus) => void
  ): void {
    if (onStatusChange) {
      const statusWithWarning: TransactionStatus = {
        ...status,
        warning: {
          type: 'inconsistency_slippage',
          message: `Using ${slippage}% slippage for inconsistency resolution route`,
        },
      };
      onStatusChange(statusWithWarning);
    }
  }

  /**
   * Create inconsistency transaction with signature and approval handling
   */
  private async createInconsistencyTransaction(
    requestId: string,
    route: { route: Array<{ fromToken?: { address: string } }> },
    params: { chainIdIn: number; amountIn: string },
    address: string,
    signer: RecoveryOptions['signer']
  ): Promise<{ to: string; value: string; data?: string; abi?: string; args?: unknown[] }> {
    const message = createInconsistencySignatureMessage(requestId);
    const signature = await signer.signMessage(message);

    let txResponse = await this.apiClient.createInconsistency({
      requestId,
      signature,
      routing: route as unknown as Parameters<typeof this.apiClient.createInconsistency>[0]['routing'],
    });

    // Handle token approval if needed
    const sourceToken = this.extractSourceToken(route);
    if (sourceToken && !isNativeToken(sourceToken.address)) {
      const approvalResult = await this.approvalService.handleApproval({
        token: sourceToken,
        chainId: params.chainIdIn,
        owner: address,
        spender: txResponse.to,
        amount: BigInt(params.amountIn),
        signer,
        mode: this.approvalMode,
      });

      // If permit was used, re-call API with permit signature
      if (approvalResult.type === 'permit' && approvalResult.permit) {
        txResponse = await this.apiClient.createInconsistency({
          requestId,
          signature,
          routing: route as unknown as Parameters<typeof this.apiClient.createInconsistency>[0]['routing'],
          permit: {
            v: approvalResult.permit.v,
            r: approvalResult.permit.r,
            s: approvalResult.permit.s,
            deadline: approvalResult.permit.deadline,
          },
        });
      }
    }

    return txResponse;
  }

  /**
   * Send recovery transaction with error handling
   * Shared by all recovery methods
   */
  private async sendRecoveryTransaction(
    txResponse: { to: string; value: string; data?: string; abi?: string; args?: unknown[] },
    options: RecoveryOptions,
    operationType: string
  ): Promise<string> {
    const calldata = encodeCalldataFromResponse(txResponse);

    const txRequest: TransactionRequest = {
      to: txResponse.to,
      data: calldata,
      value: txResponse.value,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TransactionError(
        `Failed to send ${operationType} transaction: ${errorMessage}`,
        undefined,
        errorMessage
      );
    }

    // Wait for receipt with error handling
    try {
      const receipt = await sentTx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null - transaction may have been dropped');
      }
      if (receipt.status === 0) {
        throw new Error('Transaction reverted');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TransactionError(
        `${operationType.charAt(0).toUpperCase() + operationType.slice(1)} transaction failed: ${errorMessage}`,
        sentTx.hash,
        errorMessage
      );
    }

    return sentTx.hash;
  }

  /**
   * Extract source token info from quote for approval
   */
  private extractSourceToken(quote: { route: Array<{ fromToken?: { address: string } }> }): ApprovalTokenInfo | undefined {
    const firstStep = quote.route[0];
    if (!firstStep?.fromToken) {
      return undefined;
    }

    return {
      address: firstStep.fromToken.address,
      permit: true, // Assume permit support, ApprovalService will handle fallback
    };
  }
}
