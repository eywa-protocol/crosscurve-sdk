/**
 * @fileoverview Mock implementation of IApiClient for testing
 */

import { vi } from 'vitest';
import type { IApiClient } from '../../src/domain/interfaces/index.js';
import type {
  RoutingScanRequest,
  RoutingScanResponse,
  TxCreateRequest,
  TxCreateResponse,
  TxCreateEmergencyRequest,
  TxCreateRetryRequest,
  TransactionGetResponse,
  SearchResponse,
  InconsistencyGetResponse,
  InconsistencyCreateRequest,
  InconsistencyCreateResponse,
  TokenListResponse,
  ChainListResponse,
  DiscoverRequest,
  TokenReference,
} from '../../src/types/api/index.js';
import type { StreamedRoute, CalldataOnlyResponse, SubmitExternalParams, SubmitExternalResponse, RunnerStatus } from '../../src/types/index.js';

/**
 * Creates a mock IApiClient with all methods mocked
 */
export function createMockApiClient(): IApiClient & {
  scanRoutes: ReturnType<typeof vi.fn>;
  scanRoutesStream: ReturnType<typeof vi.fn>;
  createTransaction: ReturnType<typeof vi.fn>;
  createCalldataOnly: ReturnType<typeof vi.fn>;
  createEmergencyTransaction: ReturnType<typeof vi.fn>;
  createRetryTransaction: ReturnType<typeof vi.fn>;
  getTransaction: ReturnType<typeof vi.fn>;
  searchTransactions: ReturnType<typeof vi.fn>;
  getHistory: ReturnType<typeof vi.fn>;
  getInconsistencyParams: ReturnType<typeof vi.fn>;
  createInconsistency: ReturnType<typeof vi.fn>;
  getTokenList: ReturnType<typeof vi.fn>;
  getChainList: ReturnType<typeof vi.fn>;
  submitExternal: ReturnType<typeof vi.fn>;
  discover: ReturnType<typeof vi.fn>;
  getPrice: ReturnType<typeof vi.fn>;
  createEmergencyRunner: ReturnType<typeof vi.fn>;
  getRunnerStatus: ReturnType<typeof vi.fn>;
} {
  return {
    scanRoutes: vi.fn<[RoutingScanRequest], Promise<RoutingScanResponse>>(),
    scanRoutesStream: vi.fn<[RoutingScanRequest, AbortSignal?], AsyncIterable<StreamedRoute>>(),
    createTransaction: vi.fn<[TxCreateRequest], Promise<TxCreateResponse>>(),
    createCalldataOnly: vi.fn<[TxCreateRequest], Promise<CalldataOnlyResponse>>(),
    createEmergencyTransaction: vi.fn<[TxCreateEmergencyRequest], Promise<TxCreateResponse>>(),
    createRetryTransaction: vi.fn<[TxCreateRetryRequest], Promise<TxCreateResponse>>(),
    getTransaction: vi.fn<[string], Promise<TransactionGetResponse>>(),
    searchTransactions: vi.fn<[string], Promise<SearchResponse>>(),
    getHistory: vi.fn<[string], Promise<SearchResponse>>(),
    getInconsistencyParams: vi.fn<[string], Promise<InconsistencyGetResponse>>(),
    createInconsistency: vi.fn<[InconsistencyCreateRequest], Promise<InconsistencyCreateResponse>>(),
    getTokenList: vi.fn<[], Promise<TokenListResponse>>(),
    getChainList: vi.fn<[], Promise<ChainListResponse>>(),
    submitExternal: vi.fn<[SubmitExternalParams], Promise<SubmitExternalResponse>>(),
    discover: vi.fn<[DiscoverRequest], Promise<TokenReference[]>>(),
    getPrice: vi.fn<[string, number], Promise<string>>(),
    createEmergencyRunner: vi.fn<[string], Promise<TxCreateResponse>>(),
    getRunnerStatus: vi.fn<[string], Promise<RunnerStatus>>(),
  };
}

/**
 * Default mock responses for common scenarios
 */
export const mockResponses = {
  scanRoutes: {
    routes: [
      {
        route: [],
        amountOut: '1000000',
        amountOutMin: '990000',
        fee: '1000',
        estimatedTime: 300,
      },
    ],
  } as RoutingScanResponse,

  createTransaction: {
    to: '0x1234567890123456789012345678901234567890',
    value: '0',
    abi: 'function execute(uint256 amount, address recipient)',
    args: ['1000000', '0x1234567890123456789012345678901234567890'],
  } as TxCreateResponse,

  getTransaction: {
    status: 'completed',
    inconsistency: false,
    source: {
      status: 'completed',
      txHash: '0xabc123',
    },
    destination: {
      status: 'completed',
      txHash: '0xdef456',
    },
  } as TransactionGetResponse,

  tokenList: {
    tokens: [
      {
        chainId: 42161,
        address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    ],
  } as TokenListResponse,

  chainList: {
    chains: [
      {
        id: 42161,
        name: 'Arbitrum One',
        caip2: 'eip155:42161',
      },
    ],
  } as ChainListResponse,
};
