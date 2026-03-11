/**
 * @fileoverview Quote fetching and best route selection service
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
  constructor(
    private readonly apiClient: IApiClient,
    private readonly defaultFeeShareBps?: number
  ) {}

  /**
   * Get best quote for a swap
   */
  async getQuote(params: GetQuoteParams, maxSlippage?: number): Promise<Quote> {
    validateSlippage(params.slippage, maxSlippage);
    validateAmount(params.amount);

    if (params.sender) {
      validateAddress(params.sender, 'sender');
    }

    if (params.recipient) {
      validateAddress(params.recipient, 'recipient');
    }

    validateAddress(params.fromToken, 'fromToken');
    validateAddress(params.toToken, 'toToken');

    // Validate feeShareBps if provided
    if (params.feeShareBps !== undefined) {
      if (params.feeShareBps < 0 || params.feeShareBps > 10000) {
        throw new Error('feeShareBps must be between 0 and 10000');
      }
    }

    // Resolve chain identifiers (supports both numeric IDs and CAIP-2 format)
    const chainIdIn = resolveChainId(params.fromChain);
    const chainIdOut = resolveChainId(params.toChain);

    // Per-request feeShareBps overrides config default
    const feeShareBps = params.feeShareBps ?? this.defaultFeeShareBps;

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
      recipient: params.recipient,
      providers: params.providers,
      feeFromAmount: params.feeFromAmount,
      feeToken: params.feeToken,
      feeShareBps,
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
