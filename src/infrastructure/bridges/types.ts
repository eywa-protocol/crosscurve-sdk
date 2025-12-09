/**
 * @fileoverview External bridge API response types
 * Types for Rubic and Bungee tracking APIs
 */

/**
 * Rubic API response from /api/info/statusExtended
 * @see https://api-v2.rubic.exchange/api/info/statusExtended?srcTxHash={hash}&rubicId={id}
 */
export interface RubicStatusResponse {
  /** Transaction status */
  status: RubicStatus;
  /** Rubic ID */
  rubicId?: string;
  /** Source transaction hash */
  srcTxHash?: string;
  /** Source transaction hash (alternative field name) */
  sourceTxHash?: string;
  /** Destination transaction hash (null if not yet executed) */
  dstTxHash?: string | null;
  /** Destination transaction hash (alternative field name) */
  destinationTxHash?: string | null;
  /** Source chain ID */
  fromBlockchain: string;
  /** Destination chain ID */
  toBlockchain: string;
  /** Rubic internal transaction ID */
  id?: string;
  /** Created timestamp */
  createdAt?: string;
  /** User address */
  user?: string;
  /** Source token */
  fromToken?: {
    address: string;
    symbol: string;
    decimals: number;
  };
  /** Destination token */
  toToken?: {
    address: string;
    symbol: string;
    decimals: number;
  };
  /** Source amount */
  fromAmount?: string;
  /** Destination amount */
  toAmount?: string;
}

/**
 * Rubic transaction status values
 */
export type RubicStatus =
  | 'pending'
  | 'source_pending'
  | 'source_confirmed'
  | 'destination_pending'
  | 'success'
  | 'SUCCESS'
  | 'fail'
  | 'FAIL'
  | 'cancelled'
  | 'revert'
  | 'unknown';

/**
 * Bungee API response from /api/v1/bungee/status
 * @see https://public-backend.bungee.exchange/api/v1/bungee/status?txHash={hash}
 */
export interface BungeeStatusResponse {
  /** Whether request was successful */
  success: boolean;
  /** Status code */
  statusCode?: number;
  /** Array of transaction results */
  result?: BungeeTransactionResult[];
  /** Error message if failed */
  message?: string | null;
}

/**
 * Bungee transaction result item
 */
export interface BungeeTransactionResult {
  /** Transaction hash */
  hash: string;
  /** Origin (source) transaction data */
  originData: {
    /** Origin chain ID */
    originChainId: number;
    /** Source transaction hash */
    txHash: string;
    /** Status: PENDING, COMPLETED, FAILED */
    status: BungeeSourceStatus;
    /** User address */
    userAddress: string;
    /** Timestamp */
    timestamp: number;
    /** Input tokens */
    input?: Array<{
      token: { chainId: number; address: string; symbol: string; decimals: number };
      amount: string;
    }>;
  };
  /** Destination transaction data */
  destinationData: {
    /** Destination chain ID */
    destinationChainId: number;
    /** Destination transaction hash */
    txHash: string | null;
    /** Receiver address */
    receiverAddress: string;
    /** Status: PENDING, COMPLETED, FAILED */
    status: BungeeDestinationStatus;
    /** Timestamp */
    timestamp?: number;
    /** Output tokens */
    output?: Array<{
      token: { chainId: number; address: string; symbol: string; decimals: number };
      amount: string;
    }>;
  };
  /** Route details */
  routeDetails?: {
    name: string;
    logoURI?: string;
  };
  /** Bungee internal status code */
  bungeeStatusCode?: number;
  /** Refund info if applicable */
  refund?: unknown;
}

/**
 * Bungee source transaction status values
 */
export type BungeeSourceStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Bungee destination transaction status values
 */
export type BungeeDestinationStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'READY_FOR_CLAIM';
