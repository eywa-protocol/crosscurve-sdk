/**
 * @fileoverview Chain domain entity
 * @layer domain - ZERO external dependencies
 */

import type { Chain as IChain } from '../../types/chain.js';

/**
 * Chain entity representing a blockchain network
 * Immutable value object
 */
export class ChainEntity implements IChain {
  readonly id: number;
  readonly caip2: string;
  readonly name: string;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
  readonly nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };

  constructor(data: IChain) {
    this.id = data.id;
    this.caip2 = data.caip2;
    this.name = data.name;
    this.rpcUrl = data.rpcUrl;
    this.explorerUrl = data.explorerUrl;
    this.nativeCurrency = { ...data.nativeCurrency };
  }

  /**
   * Check if this is an EVM chain
   */
  isEvm(): boolean {
    return this.caip2.startsWith('eip155:');
  }

  /**
   * Get transaction URL on block explorer
   */
  getTxUrl(txHash: string): string {
    return `${this.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Get address URL on block explorer
   */
  getAddressUrl(address: string): string {
    return `${this.explorerUrl}/address/${address}`;
  }
}
