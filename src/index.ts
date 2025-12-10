/**
 * @fileoverview CrossCurve SDK - Public API
 */

export { CrossCurveSDK } from './sdk.js';

export {
  ViemAdapter,
  EthersV6Adapter,
  EthersV5Adapter,
  Web3Adapter,
} from './infrastructure/adapters/index.js';

export { ChainId, RouteProvider } from './constants/index.js';
export type { RouteProviderValue } from './constants/providers.js';

export type {
  CrossCurveConfig,
  ChainSigner,
  TransactionRequest,
  TransactionResponse,
  TransactionReceipt,
  Chain,
  Token,
  TokenReference,
  GetQuoteParams,
  Quote,
  RouteStep,
  TransactionInfo,
  ExecuteOptions,
  ExecuteResult,
  TransactionStatus,
  TransactionWarning,
  RecoveryInfo,
  RecoveryOptions,
  RecoveryType,
} from './types/index.js';

export {
  ApiError,
  NetworkError,
  ValidationError,
} from './infrastructure/api/errors/index.js';

export {
  TransactionError,
  InvalidQuoteError,
  InsufficientBalanceError,
  SlippageExceededError,
  RecoveryUnavailableError,
  TimeoutError,
} from './errors/index.js';
