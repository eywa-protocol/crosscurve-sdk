/**
 * @fileoverview Recovery flow detection and execution service
 * @implements PRD Section 3.2 US-2 - Manual Recovery
 * @implements PRD Section 7.10 - Recovery
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient } from '../../domain/interfaces/index.js';
import type {
  RecoveryOptions,
  ExecuteResult,
  TransactionStatus,
  TransactionRequest,
  RecoveryType,
} from '../../types/index.js';
import { RouteProvider } from '../../constants/providers.js';
import {
  createEmergencySignatureMessage,
  createRetrySignatureMessage,
  createInconsistencySignatureMessage,
} from '../../utils/signature.js';
import { encodeCalldataFromResponse } from '../../utils/calldata.js';

/**
 * Service for handling recovery operations
 */
export class RecoveryService {
  constructor(
    private readonly apiClient: IApiClient,
    private readonly trackingService: any
  ) {}

  /**
   * Execute recovery operation (detects type automatically)
   * @implements PRD Section 5.1 - recover()
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

    const sentTx = await options.signer.sendTransaction(txRequest);
    await sentTx.wait();

    return {
      transactionHash: sentTx.hash,
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

    const sentTx = await options.signer.sendTransaction(txRequest);
    await sentTx.wait();

    return {
      transactionHash: sentTx.hash,
      requestId,
      provider: RouteProvider.CROSS_CURVE,
      status,
    };
  }

  /**
   * Execute inconsistency resolution
   *
   * Flow:
   * 1. GET /inconsistency/{requestId} - get params for remaining amount
   * 2. POST /routing/scan - get new route for remaining amount
   * 3. POST /inconsistency - pass routing, returns transaction directly
   * 4. Send transaction
   */
  private async executeInconsistency(
    requestId: string,
    status: TransactionStatus,
    options: RecoveryOptions
  ): Promise<ExecuteResult> {
    // Step 1: Get inconsistency params
    const inconsistencyParams = await this.apiClient.getInconsistencyParams(requestId);

    // Step 2: Get new routing for remaining amount
    const slippage = options.slippage ?? 0.5;
    const address = await options.signer.getAddress();

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

    const selectedRoute = routes[0];

    // Step 3: Create signature and call /inconsistency
    const message = createInconsistencySignatureMessage(requestId);
    const signature = await options.signer.signMessage(message);

    const txResponse = await this.apiClient.createInconsistency({
      requestId,
      signature,
      routing: selectedRoute,
    });

    // Step 4: Encode calldata and send transaction
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

    const sentTx = await options.signer.sendTransaction(txRequest);
    await sentTx.wait();

    return {
      transactionHash: sentTx.hash,
      requestId,
      provider: RouteProvider.CROSS_CURVE,
      status,
    };
  }
}
