/**
 * @fileoverview Main API client implementation
 * @layer infrastructure - Implements domain/interfaces/IApiClient
 */

import type { IApiClient } from '../../domain/interfaces/index.js';
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
} from '../../types/api/index.js';
import type { StreamedRoute, CalldataOnlyResponse, SubmitExternalParams, SubmitExternalResponse } from '../../types/index.js';
import { HttpClient } from './client/index.js';
import * as endpoints from './endpoints/index.js';

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxTotalTime?: number;
    initialDelay?: number;
    backoffMultiplier?: number;
  };
  /** Security configuration */
  security?: {
    allowedHosts?: string[];
    enforceHttps?: boolean;
  };
}

/**
 * API client implementation
 * Orchestrates HTTP client and endpoint implementations
 */
export class ApiClient implements IApiClient {
  private readonly httpClient: HttpClient;

  constructor(config: ApiClientConfig) {
    this.httpClient = new HttpClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
      retry: config.retry,
      security: config.security,
    });
  }

  async scanRoutes(request: RoutingScanRequest): Promise<RoutingScanResponse> {
    return endpoints.scanRoutes(this.httpClient, request);
  }

  async *scanRoutesStream(request: RoutingScanRequest, signal?: AbortSignal): AsyncIterable<StreamedRoute> {
    yield* endpoints.scanRoutesStream(this.httpClient, request, signal);
  }

  async createTransaction(request: TxCreateRequest): Promise<TxCreateResponse> {
    return endpoints.createTransaction(this.httpClient, request);
  }

  async createCalldataOnly(request: TxCreateRequest): Promise<CalldataOnlyResponse> {
    return endpoints.createCalldataOnly(this.httpClient, request);
  }

  async createEmergencyTransaction(request: TxCreateEmergencyRequest): Promise<TxCreateResponse> {
    return endpoints.createEmergencyTransaction(this.httpClient, request);
  }

  async createRetryTransaction(request: TxCreateRetryRequest): Promise<TxCreateResponse> {
    return endpoints.createRetryTransaction(this.httpClient, request);
  }

  async getTransaction(requestId: string): Promise<TransactionGetResponse> {
    return endpoints.getTransaction(this.httpClient, requestId);
  }

  async submitExternal(params: SubmitExternalParams): Promise<SubmitExternalResponse> {
    return endpoints.submitExternal(this.httpClient, params);
  }

  async searchTransactions(query: string): Promise<SearchResponse> {
    return endpoints.searchTransactions(this.httpClient, query);
  }

  async getInconsistencyParams(requestId: string): Promise<InconsistencyGetResponse> {
    return endpoints.getInconsistencyParams(this.httpClient, requestId);
  }

  async createInconsistency(request: InconsistencyCreateRequest): Promise<InconsistencyCreateResponse> {
    return endpoints.createInconsistency(this.httpClient, request);
  }

  async getTokenList(): Promise<TokenListResponse> {
    return endpoints.getTokenList(this.httpClient);
  }

  async getChainList(): Promise<ChainListResponse> {
    return endpoints.getChainList(this.httpClient);
  }

  async discover(request: DiscoverRequest): Promise<TokenReference[]> {
    return endpoints.discover(this.httpClient, request);
  }
}
