/**
 * @fileoverview AA scope for Tier 2 API
 * @layer application - Depends ONLY on domain
 */

import type { IAAApi } from '../../domain/interfaces/IAAApi.js';
import type { IPimlicoApi } from '../../domain/interfaces/IPimlicoApi.js';
import type { AACreateTxParams, AATransaction, JsonRpcRequest, JsonRpcResponse } from '../../types/aa.js';

/**
 * AA scope: sdk.aa.*
 */
export class AAScope {
  constructor(
    private readonly aaApi: IAAApi,
    private readonly pimlicoApi: IPimlicoApi,
  ) {}

  /**
   * Check if Pimlico proxy is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.pimlicoApi.pimlicoHealth();
      return result.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Create an AA transaction from a quote
   * POST /tx/create (with AA params)
   */
  async createTransaction(params: AACreateTxParams): Promise<AATransaction> {
    return this.aaApi.createAATransaction(params);
  }

  /**
   * Proxy a JSON-RPC call to Pimlico bundler
   * POST /pimlico/{chainName}
   */
  async pimlicoRpc(chainName: string, request: JsonRpcRequest): Promise<JsonRpcResponse> {
    return this.pimlicoApi.pimlicoRpc(chainName, request);
  }
}
