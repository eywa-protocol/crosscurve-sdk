/**
 * @fileoverview Token management service
 * @implements PRD Section 7.4 - Chain & Token Data
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient, ICache } from '../../domain/interfaces/index.js';
import type { Token, Chain } from '../../types/index.js';

/**
 * Cache TTL for tokens and chains (10 minutes)
 */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Service for loading and managing tokens and chains
 */
export class TokenService {
  constructor(
    private readonly apiClient: IApiClient,
    private readonly cache: ICache
  ) {}

  /**
   * Load all supported chains
   * @implements PRD Section 7.4 - loadChains() with 10 min cache
   */
  async loadChains(): Promise<Chain[]> {
    const cacheKey = 'chains';
    const cached = this.cache.get<Chain[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.apiClient.getChainList();
    const chains = response.chains;

    this.cache.set(cacheKey, chains, CACHE_TTL_MS);
    return chains;
  }

  /**
   * Load tokens for a specific chain or all chains
   * @implements PRD Section 7.4 - loadTokens() with 10 min cache
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

    this.cache.set(cacheKey, tokens, CACHE_TTL_MS);
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
