/**
 * @fileoverview CrossCurve SDK - Public API
 */

export { CrossCurveSDK } from './sdk.js';
export { PricesScope, RunnerScope, AAScope } from './application/scopes/index.js';

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
  SDKConfig,
  ApprovalMode,
  SDKDependencies,
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
  RouteStepToken,
  StreamedRoute,
  TransactionInfo,
  TxData,
  TrackingOptions,
  ExecuteOptions,
  ExecuteResult,
  TransactionStatus,
  TransactionWarning,
  RecoveryInfo,
  TransactionEvent,
  TransactionMetadata,
  CalldataOnlyResponse,
  SubmitExternalParams,
  SubmitExternalResponse,
  RecoveryOptions,
  RecoveryType,
  RunnerStatus,
  WalletType,
  AAGasMode,
  AACreateTxParams,
  AATransaction,
  AACall,
  JsonRpcRequest,
  JsonRpcResponse,
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
  PimlicoUnavailableError,
} from './errors/index.js';

export { detectAddressType, isValidAddress, normalizeAddress } from './utils/address.js';
export type { AddressType } from './utils/address.js';
