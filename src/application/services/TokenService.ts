/**
 * @fileoverview Token management service
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient, ICache } from '../../domain/interfaces/index.js';
import type { Token, Chain } from '../../types/index.js';

/**
 * Default cache TTL for tokens and chains (10 minutes)
 */
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Service for loading and managing tokens and chains
 */
export class TokenService {
  private readonly cacheTtlMs: number;

  constructor(
    private readonly apiClient: IApiClient,
    private readonly cache: ICache,
    cacheTtlMs?: number
  ) {
    this.cacheTtlMs = cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  /**
   * Load all supported chains
   */
  async loadChains(): Promise<Chain[]> {
    const cacheKey = 'chains';
    const cached = this.cache.get<Chain[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.apiClient.getChainList();
    const chains = response.chains;

    this.cache.set(cacheKey, chains, this.cacheTtlMs);
    return chains;
  }

  /**
   * Load tokens for a specific chain or all chains
   */
  async loadTokens(chainId?: number): Promise<Token[]> {
    const cacheKey = chainId ? `tokens:${chainId}` : 'tokens:all';
    const cached = this.cache.get<Token[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.apiClient.getTokenList();
    let tokens = response.tokens;

    if (chainId !== undefined) {
      tokens = tokens.filter((t) => t.chainId === chainId);
    }

    this.cache.set(cacheKey, tokens, this.cacheTtlMs);
    return tokens;
  }

  /**
   * Get tokens by chain ID from loaded data
   */
  getTokensByChain(allTokens: Token[], chainId: number): Token[] {
    return allTokens.filter((token) => token.chainId === chainId);
  }

  /**
   * Get specific token by chain ID and address
   */
  getToken(allTokens: Token[], chainId: number, address: string): Token | undefined {
    return allTokens.find(
      (token) =>
        token.chainId === chainId &&
        token.address.toLowerCase() === address.toLowerCase()
    );
  }

  /**
   * Get chain by CAIP-2 identifier
   */
  getChainByCaip2(chains: Chain[], caip2: string): Chain | undefined {
    return chains.find((chain) => chain.caip2 === caip2);
  }
}
