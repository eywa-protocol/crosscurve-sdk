/**
 * @fileoverview Route domain entity
 * @layer domain - ZERO external dependencies
 */

import type { RouteStep, RouteStepToken } from '../../types/quote.js';

/**
 * Route entity representing a single step in routing path
 * Immutable value object
 */
export class RouteEntity implements RouteStep {
  readonly type: string;
  readonly fromChainId: number;
  readonly toChainId: number;
  readonly fromToken: RouteStepToken;
  readonly toToken: RouteStepToken;
  readonly params?: Record<string, unknown>;
  readonly quote?: RouteStep['quote'];

  constructor(data: RouteStep) {
    this.type = data.type;
    this.fromChainId = data.fromChainId;
    this.toChainId = data.toChainId;
    this.fromToken = { ...data.fromToken };
    this.toToken = { ...data.toToken };
    this.params = data.params;
    this.quote = data.quote;
  }

  /**
   * Check if this step is cross-chain
   */
  isCrossChain(): boolean {
    return this.fromChainId !== this.toChainId;
  }

  /**
   * Check if this step uses a bridge
   */
  isBridge(): boolean {
    return !this.isDex();
  }

  /**
   * Check if this step uses a DEX
   */
  isDex(): boolean {
    const dexTypes = ['uniswap', 'sushiswap', 'curve', 'pancakeswap'];
    return dexTypes.includes(this.type.toLowerCase());
  }

  /**
   * Get the provider type
   */
  getProviderType(): string {
    return this.type;
  }
}
