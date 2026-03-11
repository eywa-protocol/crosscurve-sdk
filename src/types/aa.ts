/**
 * @fileoverview Account abstraction types for ERC-4337 and EIP-7702 wallets
 */

import type { Quote } from './quote.js';

/** Supported AA wallet standards */
export type WalletType = '4337' | '7702';

/** Gas payment mode for AA transactions */
export type AAGasMode = 'erc20' | 'sponsored' | 'native';

/**
 * Parameters for creating an AA transaction
 */
export interface AACreateTxParams {
  /** Quote to execute */
  quote: Quote;
  /** Sender address */
  from: string;
  /** Recipient address (defaults to sender) */
  recipient?: string;
  /** AA wallet standard to use */
  walletType: WalletType;
  /** How gas should be paid */
  gasMode?: AAGasMode;
  /** ERC-20 token address for gas payment (when gasMode is 'erc20') */
  gasToken?: string;
  /** Custom paymaster contract address */
  paymasterAddress?: string;
  /** Entry point contract address override */
  entryPoint?: string;
}

/**
 * AA transaction ready for submission via bundler
 */
export interface AATransaction {
  /** AA wallet standard used */
  walletType: WalletType;
  /** Batch of calls to execute atomically */
  calls: AACall[];
  /** Chain ID for the transaction */
  chainId: number;
  /** Pimlico chain name for bundler RPC routing */
  pimlicoChainName?: string;
  /** Paymaster context for gas sponsorship */
  paymasterContext: { token: string };
  /** Custom paymaster contract address */
  paymasterAddress?: string;
  /** Entry point contract address */
  entryPoint?: string;
}

/**
 * Single call within an AA transaction batch
 */
export interface AACall {
  /** Target contract address */
  to: string;
  /** ETH value to send (in wei) */
  value: string;
  /** Encoded calldata */
  data: string;
}

/**
 * JSON-RPC 2.0 request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params: unknown[];
}

/**
 * JSON-RPC 2.0 response
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
