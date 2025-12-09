/**
 * @fileoverview Main CrossCurve SDK class
 * @implements PRD Section 1 - Executive Summary
 * @implements PRD Section 4.3 - SDK Class Structure
 * @implements SDK_OVERVIEW.md Section 1 - Technical Structure
 */

import type { SDKConfig, CrossCurveConfig } from './config/index.js';
import { applyConfigDefaults, validateConfig } from './config/index.js';
import { ApiClient } from './infrastructure/api/index.js';
import { MemoryCache } from './infrastructure/cache/index.js';
import { RubicTracker, BungeeTracker } from './infrastructure/bridges/index.js';
import {
  QuoteService,
  ExecuteService,
  TrackingService,
  RecoveryService,
  TokenService,
} from './application/services/index.js';
import {
  RoutingScope,
  TxScope,
  TrackingScope,
  InconsistencyScope,
} from './application/scopes/index.js';
import type {
  Chain,
  Token,
  GetQuoteParams,
  Quote,
  ExecuteOptions,
  ExecuteResult,
  TransactionStatus,
  RecoveryOptions,
  TrackingOptions,
} from './types/index.js';

/**
 * CrossCurve SDK - Cross-chain swap integration
 *
 * @example
 * ```typescript
 * const sdk = new CrossCurveSDK();
 * await sdk.init();
 *
 * const quote = await sdk.getQuote({
 *   fromChain: 1,
 *   toChain: 42161,
 *   fromToken: USDC_ETH,
 *   toToken: USDC_ARB,
 *   amount: '1000000000',
 *   slippage: 0.5,
 *   sender: userAddress,
 * });
 *
 * const result = await sdk.executeQuote(quote, {
 *   signer,
 *   autoRecover: true,
 * });
 * ```
 */
export class CrossCurveSDK {
  private readonly config: SDKConfig;
  private readonly apiClient: ApiClient;
  private readonly cache: MemoryCache;

  private readonly quoteService: QuoteService;
  private readonly executeService: ExecuteService;
  private readonly trackingService: TrackingService;
  private readonly recoveryService: RecoveryService;
  private readonly tokenService: TokenService;

  public readonly routing: RoutingScope;
  public readonly tx: TxScope;
  public readonly tracking: TrackingScope;
  public readonly inconsistency: InconsistencyScope;

  private _chains: Chain[] = [];
  private _tokens: Map<number, Token[]> = new Map();
  private allTokens: Token[] = [];

  /**
   * Loaded chains (readonly)
   */
  get chains(): readonly Chain[] {
    return this._chains;
  }

  /**
   * Loaded tokens by chain ID (readonly)
   */
  get tokens(): ReadonlyMap<number, readonly Token[]> {
    return this._tokens as ReadonlyMap<number, readonly Token[]>;
  }

  /**
   * Create a new CrossCurve SDK instance
   *
   * @param config - SDK configuration
   */
  constructor(config?: Partial<CrossCurveConfig>) {
    this.config = applyConfigDefaults(config);
    validateConfig(this.config);

    this.cache = new MemoryCache();
    this.apiClient = new ApiClient({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
    });

    this.quoteService = new QuoteService(this.apiClient);
    this.trackingService = new TrackingService(this.apiClient, [
      new RubicTracker(),
      new BungeeTracker(),
    ]);
    this.recoveryService = new RecoveryService(this.apiClient, this.trackingService);
    this.executeService = new ExecuteService(
      this.apiClient,
      this.trackingService,
      this.recoveryService
    );
    this.tokenService = new TokenService(this.apiClient, this.cache);

    this.routing = new RoutingScope(this.apiClient);
    this.tx = new TxScope(this.apiClient);
    this.tracking = new TrackingScope(this.apiClient, this.trackingService);
    this.inconsistency = new InconsistencyScope(this.apiClient);
  }

  /**
   * Initialize SDK - load chains and tokens
   * @implements PRD Section 7.4 - init()
   */
  async init(): Promise<void> {
    await Promise.all([this.loadChains(), this.loadTokens()]);
  }

  /**
   * Load supported chains
   * @implements PRD Section 7.4 - loadChains()
   */
  async loadChains(): Promise<Chain[]> {
    this._chains = await this.tokenService.loadChains();
    return this._chains;
  }

  /**
   * Load tokens for specific chain or all chains
   * @implements PRD Section 7.4 - loadTokens()
   */
  async loadTokens(chainId?: number): Promise<Token[]> {
    const tokens = await this.tokenService.loadTokens(chainId);

    if (chainId === undefined) {
      this.allTokens = tokens;

      this._tokens.clear();
      tokens.forEach((token) => {
        const chainTokens = this._tokens.get(token.chainId) ?? [];
        chainTokens.push(token);
        this._tokens.set(token.chainId, chainTokens);
      });
    } else {
      this._tokens.set(chainId, tokens);

      const existing = this.allTokens.filter((t) => t.chainId !== chainId);
      this.allTokens = [...existing, ...tokens];
    }

    return tokens;
  }

  /**
   * Get best quote for a swap
   * @implements PRD Section 3.2 US-1 - getQuote()
   * @implements PRD Section 5.1 - Tier 1 API
   */
  async getQuote(params: GetQuoteParams): Promise<Quote> {
    return this.quoteService.getQuote(params, this.config.maxSlippage);
  }

  /**
   * Execute a quote
   * @implements PRD Section 3.2 US-1 - executeQuote()
   * @implements PRD Section 5.1 - Tier 1 API
   */
  async executeQuote(quote: Quote, options: ExecuteOptions): Promise<ExecuteResult> {
    return this.executeService.executeQuote(quote, options);
  }

  /**
   * Track transaction status
   * @implements PRD Section 3.2 US-2 - trackTransaction()
   * @implements PRD Section 5.1 - Tier 1 API
   *
   * @param identifier - Request ID (CrossCurve) or transaction hash (external bridges)
   * @param options - Tracking options including provider info
   */
  async trackTransaction(
    identifier: string,
    options?: TrackingOptions
  ): Promise<TransactionStatus> {
    return this.trackingService.getTransactionStatus(identifier, options);
  }

  /**
   * Track status of an executed transaction
   * Convenience method that extracts tracking params from ExecuteResult
   *
   * @param result - Result from executeQuote()
   */
  async trackExecuteResult(result: ExecuteResult): Promise<TransactionStatus> {
    const identifier = result.requestId ?? result.transactionHash;
    return this.trackingService.getTransactionStatus(identifier, {
      provider: result.provider,
      bridgeId: result.bridgeId,
    });
  }

  /**
   * Search transactions
   * @implements PRD Section 5.1 - Tier 1 API
   */
  async searchTransactions(query: string): Promise<TransactionStatus[]> {
    return this.trackingService.searchTransactions(query);
  }

  /**
   * Recover failed transaction
   * @implements PRD Section 3.2 US-2 - recover()
   * @implements PRD Section 5.1 - Tier 1 API
   */
  async recover(requestId: string, options: RecoveryOptions): Promise<ExecuteResult> {
    return this.recoveryService.recover(requestId, options);
  }

  /**
   * Get tokens for specific chain
   * @implements PRD Section 7.4 - Accessors
   */
  getTokens(chainId: number): Token[] {
    return this.tokenService.getTokensByChain(this.allTokens, chainId);
  }

  /**
   * Get specific token
   * @implements PRD Section 7.4 - Accessors
   */
  getToken(chainId: number, address: string): Token | undefined {
    return this.tokenService.getToken(this.allTokens, chainId, address);
  }

  /**
   * Get chain by CAIP-2 identifier
   * @implements PRD Section 3.2 US-7 - CAIP-2 lookup
   * @implements PRD Section 7.4 - Accessors
   */
  getChainByCaip2(caip2: string): Chain | undefined {
    return this.tokenService.getChainByCaip2(this._chains, caip2);
  }
}
