/**
 * @fileoverview Route domain entity
 * @layer domain - ZERO external dependencies
 */

import type { RouteStep } from '../../types/quote.js';

/**
 * Route entity representing a single step in routing path
 * Immutable value object
 */
export class RouteEntity implements RouteStep {
  readonly type: string;
  readonly chainId: number;
  readonly params: Record<string, unknown>;
  readonly quote?: RouteStep['quote'];

  constructor(data: RouteStep) {
    this.type = data.type;
    this.chainId = data.chainId;
    this.params = data.params;
    this.quote = data.quote;
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
