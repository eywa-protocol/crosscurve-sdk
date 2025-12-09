/**
 * @fileoverview Networks endpoint implementation
 * Fetches chain and token data from GET /networks
 */

import type { HttpClient } from '../client/index.js';
import type {
  NetworksApiResponse,
  ChainListResponse,
  TokenListResponse,
} from '../../../types/api/index.js';
import type { Chain, Token } from '../../../types/index.js';

/**
 * Fetch raw networks data from API
 * GET /networks
 */
export async function getNetworks(client: HttpClient): Promise<NetworksApiResponse> {
  return client.get<NetworksApiResponse>('/networks');
}

/**
 * Transform networks response to Chain array
 */
function transformToChains(networks: NetworksApiResponse): Chain[] {
  return Object.entries(networks).map(([, data]) => ({
    id: data.chainId,
    name: data.name,
    caip2: `eip155:${data.chainId}`,
    rpcUrl: data.rpcPublic || data.rpcHttp[0] || '',
    explorerUrl: '',
    nativeCurrency: {
      name: 'Native',
      symbol: 'ETH',
      decimals: 18,
    },
  }));
}

/**
 * Transform networks response to Token array
 */
function transformToTokens(networks: NetworksApiResponse): Token[] {
  const tokens: Token[] = [];

  Object.values(networks).forEach((networkData) => {
    networkData.tokens.forEach((apiToken) => {
      tokens.push({
        chainId: apiToken.chainId,
        address: apiToken.address,
        name: apiToken.name,
        symbol: apiToken.symbol,
        decimals: apiToken.decimals,
        permit: apiToken.permit ?? false,
        tags: apiToken.tags,
        wrapped: apiToken.wrapped,
        realToken: apiToken.realToken,
        coins: apiToken.coins,
      });
    });
  });

  return tokens;
}

/**
 * Get chain list from networks
 * GET /networks → transformed to Chain[]
 */
export async function getChainList(client: HttpClient): Promise<ChainListResponse> {
  const networks = await getNetworks(client);
  return { chains: transformToChains(networks) };
}

/**
 * Get token list from networks
 * GET /networks → extracted tokens
 */
export async function getTokenList(client: HttpClient): Promise<TokenListResponse> {
  const networks = await getNetworks(client);
  return { tokens: transformToTokens(networks) };
}
