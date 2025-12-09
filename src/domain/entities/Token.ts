/**
 * @fileoverview Token domain entity
 * @layer domain - ZERO external dependencies
 */

import type { Token as IToken, TokenReference } from '../../types/token.js';

/**
 * Token entity representing a blockchain token
 * Immutable value object
 */
export class TokenEntity implements IToken {
  readonly chainId: number;
  readonly address: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly permit: boolean;
  readonly tags: string[];
  readonly wrapped?: TokenReference;
  readonly realToken?: TokenReference;
  readonly coins?: string[];

  constructor(data: IToken) {
    this.chainId = data.chainId;
    this.address = data.address;
    this.name = data.name;
    this.symbol = data.symbol;
    this.decimals = data.decimals;
    this.permit = data.permit;
    this.tags = [...data.tags];
    this.wrapped = data.wrapped ? { ...data.wrapped } : undefined;
    this.realToken = data.realToken ? { ...data.realToken } : undefined;
    this.coins = data.coins ? [...data.coins] : undefined;
  }

  /**
   * Check if token is native (ETH, BNB, MATIC, etc.)
   */
  isNative(): boolean {
    return this.tags.includes('native');
  }

  /**
   * Check if token is stablecoin
   */
  isStable(): boolean {
    return this.tags.includes('stable');
  }

  /**
   * Check if token is synthetic
   */
  isSynthetic(): boolean {
    return this.tags.includes('synth');
  }

  /**
   * Check if token is LP token
   */
  isLpToken(): boolean {
    return this.tags.includes('curve_lp') || this.coins !== undefined;
  }

  /**
   * Check if token supports EIP-2612 permit
   */
  supportsPermit(): boolean {
    return this.permit;
  }

  /**
   * Format amount with decimals
   */
  formatAmount(weiAmount: string): string {
    const amount = BigInt(weiAmount);
    const divisor = BigInt(10 ** this.decimals);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;
    const fractionalStr = fractionalPart.toString().padStart(this.decimals, '0');
    return `${integerPart}.${fractionalStr}`;
  }
}
