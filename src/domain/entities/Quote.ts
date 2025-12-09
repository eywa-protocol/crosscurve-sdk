/**
 * @fileoverview Quote domain entity
 * @layer domain - ZERO external dependencies
 */

import type { Quote as IQuote, RouteStep, TransactionInfo } from '../../types/quote.js';

/**
 * Quote entity representing a swap quote with routing information
 * Immutable value object
 */
export class QuoteEntity implements IQuote {
  readonly route: RouteStep[];
  readonly amountIn: string;
  readonly amountOut: string;
  readonly deliveryFee: {
    amount: string;
    usd: number;
  };
  readonly txs: TransactionInfo[];
  readonly signature: string;

  constructor(data: IQuote) {
    this.route = [...data.route];
    this.amountIn = data.amountIn;
    this.amountOut = data.amountOut;
    this.deliveryFee = { ...data.deliveryFee };
    this.txs = [...data.txs];
    this.signature = data.signature;
  }

  /**
   * Check if quote involves multiple chains
   */
  isCrossChain(): boolean {
    if (this.route.length === 0) return false;
    const firstStep = this.route[0];
    return firstStep.fromChainId !== firstStep.toChainId;
  }

  /**
   * Check if this is a same-chain swap
   */
  isSameChain(): boolean {
    return !this.isCrossChain();
  }

  /**
   * Get source chain ID
   */
  getSourceChainId(): number {
    return this.route[0]?.fromChainId ?? 0;
  }

  /**
   * Get destination chain ID
   */
  getDestinationChainId(): number {
    const lastStep = this.route[this.route.length - 1];
    return lastStep?.toChainId ?? 0;
  }

  /**
   * Get total gas consumption estimate
   */
  getTotalGasConsumption(): number {
    return this.txs.reduce((total, tx) => {
      const txGas = tx.consumptions.reduce((sum, c) => sum + c.gasConsumption, 0);
      return total + txGas;
    }, 0);
  }
}
