/**
 * @fileoverview Prices scope for Tier 2 API
 * @layer application - Depends ONLY on domain
 */

import type { IPricesApi } from '../../domain/interfaces/IPricesApi.js';

/**
 * Prices scope: sdk.prices.*
 */
export class PricesScope {
  constructor(private readonly apiClient: IPricesApi) {}

  /**
   * Get token price
   * GET /prices/{token}/{chainId}
   */
  async get(token: string, chainId: number): Promise<string> {
    return this.apiClient.getPrice(token, chainId);
  }
}
