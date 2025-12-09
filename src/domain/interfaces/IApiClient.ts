/**
 * @fileoverview API Client port (interface)
 * @layer domain - Interface segregation principle
 */

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
} from '../../types/api/index.js';

/**
 * API client interface for HTTP operations
 * Implemented by infrastructure/api/ApiClient
 */
export interface IApiClient {
  /**
   * Scan for available routes
   * POST /routing/scan
   */
  scanRoutes(request: RoutingScanRequest): Promise<RoutingScanResponse>;

  /**
   * Create transaction calldata
   * POST /tx/create
   */
  createTransaction(request: TxCreateRequest): Promise<TxCreateResponse>;

  /**
   * Create emergency withdrawal transaction
   * POST /tx/create/emergency
   */
  createEmergencyTransaction(request: TxCreateEmergencyRequest): Promise<TxCreateResponse>;

  /**
   * Create retry transaction
   * POST /tx/create/retry
   */
  createRetryTransaction(request: TxCreateRetryRequest): Promise<TxCreateResponse>;

  /**
   * Get transaction status
   * GET /transaction/{requestId}
   */
  getTransaction(requestId: string): Promise<TransactionGetResponse>;

  /**
   * Search transactions
   * GET /search?search={search}
   */
  searchTransactions(query: string): Promise<SearchResponse>;

  /**
   * Get inconsistency parameters
   * GET /inconsistency/{requestId}
   */
  getInconsistencyParams(requestId: string): Promise<InconsistencyGetResponse>;

  /**
   * Create inconsistency resolution route
   * POST /inconsistency
   */
  createInconsistency(request: InconsistencyCreateRequest): Promise<InconsistencyCreateResponse>;

  /**
   * Get token list
   * GET /tokenlist
   */
  getTokenList(): Promise<TokenListResponse>;

  /**
   * Get chain list
   * GET /chains (inferred endpoint)
   */
  getChainList(): Promise<ChainListResponse>;
}
