/**
 * @fileoverview Main CrossCurve SDK class
 */

import type { SDKConfig, CrossCurveConfig, SDKDependencies } from './config/index.js';
import { applyConfigDefaults, validateConfig } from './config/index.js';
import { ApiClient } from './infrastructure/api/index.js';
import { MemoryCache } from './infrastructure/cache/index.js';
import { RubicTracker, BungeeTracker } from './infrastructure/bridges/index.js';
import type { ICache, IApiClient, IBridgeTracker } from './domain/interfaces/index.js';
import {
  QuoteService,
  ExecuteService,
  TrackingService,
  RecoveryService,
  TokenService,
  ApprovalService,
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
  private readonly apiClient: IApiClient;
  private readonly cache: ICache;
  private readonly bridgeTrackers: IBridgeTracker[];

  private readonly quoteService: QuoteService;
  private readonly executeService: ExecuteService;
  private readonly trackingService: TrackingService;
  private readonly recoveryService: RecoveryService;
  private readonly tokenService: TokenService;
  private readonly approvalService: ApprovalService;

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
   * @param deps - Optional dependency injection for testing
   */
  constructor(config?: Partial<CrossCurveConfig>, deps?: SDKDependencies) {
    this.config = applyConfigDefaults(config);
    validateConfig(this.config);

    // Use injected dependencies or create defaults
    this.cache = deps?.cache ?? new MemoryCache();
    this.apiClient = deps?.apiClient ?? new ApiClient({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      timeout: this.config.http.timeout,
      retry: {
        maxTotalTime: this.config.http.retryMaxTime,
        initialDelay: this.config.http.retryInitialDelay,
        backoffMultiplier: this.config.http.retryBackoffMultiplier,
      },
      security: {
        allowedHosts: this.config.security.allowedHosts,
        enforceHttps: this.config.security.enforceHttps,
      },
    });
    this.bridgeTrackers = deps?.bridgeTrackers ?? [
      new RubicTracker(),
      new BungeeTracker(),
    ];

    this.quoteService = new QuoteService(this.apiClient, this.config.feeShareBps);
    this.trackingService = new TrackingService(this.apiClient, this.bridgeTrackers);
    this.approvalService = new ApprovalService(this.config.permitDeadlineSeconds);
    this.recoveryService = new RecoveryService(
      this.apiClient,
      this.trackingService,
      this.approvalService,
      this.config.approvalMode
    );
    this.executeService = new ExecuteService(
      this.apiClient,
      this.trackingService,
      this.recoveryService,
      this.approvalService,
      this.config.approvalMode,
      this.config.permit.enabled,
      (chainId) => this._chains.find((c) => c.id === chainId)?.router,
      this.config.bridgePolling
    );
    this.tokenService = new TokenService(this.apiClient, this.cache, this.config.cache.ttlMs);

    this.routing = new RoutingScope(this.apiClient);
    this.tx = new TxScope(this.apiClient);
    this.tracking = new TrackingScope(this.apiClient, this.trackingService);
    this.inconsistency = new InconsistencyScope(this.apiClient);
  }

  /**
   * Initialize SDK - load chains and tokens
   */
  async init(): Promise<void> {
    await Promise.all([this.loadChains(), this.loadTokens()]);
  }

  /**
   * Load supported chains
   */
  async loadChains(): Promise<Chain[]> {
    this._chains = await this.tokenService.loadChains();
    return this._chains;
  }

  /**
   * Load tokens for specific chain or all chains
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
   */
  async getQuote(params: GetQuoteParams): Promise<Quote> {
    return this.quoteService.getQuote(params, this.config.maxSlippage);
  }

  /**
   * Execute a quote
   */
  async executeQuote(quote: Quote, options: ExecuteOptions): Promise<ExecuteResult> {
    return this.executeService.executeQuote(quote, options);
  }

  /**
   * Track transaction status
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
   * Search transactions by address or transaction hash
   *
   * @param query - Wallet address or transaction hash to search
   * @returns Array of matching transaction statuses
   *
   * @remarks
   * This method only searches CrossCurve protocol transactions.
   * Transactions routed through external bridges (Rubic, Bungee) are not searchable
   * through this method - use the bridge's native explorer for those.
   */
  async searchTransactions(query: string): Promise<TransactionStatus[]> {
    return this.trackingService.searchTransactions(query);
  }

  /**
   * Recover failed transaction by requestId
   *
   * @param requestId - CrossCurve request ID from ExecuteResult
   * @param options - Recovery options including signer
   */
  async recover(requestId: string, options: RecoveryOptions): Promise<ExecuteResult> {
    return this.recoveryService.recover(requestId, options);
  }

  /**
   * Recover failed transaction by transaction hash
   *
   * Convenience method that searches for the transaction first,
   * then initiates recovery using the found requestId.
   *
   * @param txHash - Source transaction hash
   * @param options - Recovery options including signer
   * @returns Execute result with recovery status
   * @throws Error if transaction not found or has no requestId
   */
  async recoverFromTxHash(txHash: string, options: RecoveryOptions): Promise<ExecuteResult> {
    const results = await this.searchTransactions(txHash);
    if (results.length === 0) {
      throw new Error(`No transaction found for hash: ${txHash}`);
    }

    const tx = results[0];
    const requestId = tx.oracle?.requestId;
    if (!requestId) {
      throw new Error('Transaction has no requestId - cannot recover');
    }

    return this.recover(requestId, options);
  }

  /**
   * Get tokens for specific chain
   */
  getTokens(chainId: number): Token[] {
    return this.tokenService.getTokensByChain(this.allTokens, chainId);
  }

  /**
   * Get specific token
   */
  getToken(chainId: number, address: string): Token | undefined {
    return this.tokenService.getToken(this.allTokens, chainId, address);
  }

  /**
   * Get chain by CAIP-2 identifier
   */
  getChainByCaip2(caip2: string): Chain | undefined {
    return this.tokenService.getChainByCaip2(this._chains, caip2);
  }
}
