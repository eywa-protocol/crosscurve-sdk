/**
 * @fileoverview Quote fetching and best route selection service
 * @implements PRD Section 3.2 US-1 - Simple Swap
 * @implements PRD Section 5.1 - Tier 1 Flow
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient } from '../../domain/interfaces/index.js';
import type { GetQuoteParams, Quote } from '../../types/index.js';
import { validateSlippage, validateAmount, validateAddress } from '../../utils/validation.js';
import { resolveChainId } from '../../utils/chain.js';

/**
 * Service for fetching quotes and selecting best routes
 */
export class QuoteService {
  constructor(private readonly apiClient: IApiClient) {}

  /**
   * Get best quote for a swap
   * @implements PRD Section 5.1 - getQuote()
   */
  async getQuote(params: GetQuoteParams, maxSlippage?: number): Promise<Quote> {
    validateSlippage(params.slippage, maxSlippage);
    validateAmount(params.amount);

    if (params.sender) {
      validateAddress(params.sender, 'sender');
    }

    validateAddress(params.fromToken, 'fromToken');
    validateAddress(params.toToken, 'toToken');

    // Resolve chain identifiers (supports both numeric IDs and CAIP-2 format)
    const chainIdIn = resolveChainId(params.fromChain);
    const chainIdOut = resolveChainId(params.toChain);

    // API returns array directly
    const routes = await this.apiClient.scanRoutes({
      params: {
        tokenIn: params.fromToken,
        amountIn: params.amount,
        chainIdIn,
        tokenOut: params.toToken,
        chainIdOut,
      },
      slippage: params.slippage,
      from: params.sender,
      providers: params.providers,
      feeFromAmount: params.feeFromAmount,
      feeToken: params.feeToken,
    });

    if (!routes || routes.length === 0) {
      throw new Error('No routes found for the given parameters');
    }

    return this.selectBestRoute(routes);
  }

  /**
   * Select best route from available options
   * Currently selects route with highest output amount
   */
  private selectBestRoute(routes: Quote[]): Quote {
    return routes.reduce((best, current) => {
      const bestAmount = BigInt(best.amountOut);
      const currentAmount = BigInt(current.amountOut);
      return currentAmount > bestAmount ? current : best;
    });
  }
}
