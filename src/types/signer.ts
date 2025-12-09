/**
 * @fileoverview ChainSigner interface and transaction types
 * @implements PRD Section 6.1 - ChainSigner Interface
 * @implements SDK_OVERVIEW.md Section 4 - ChainSigner Interface
 */

/**
 * Transaction request parameters for sending transactions
 */
export interface TransactionRequest {
  /** Target contract address */
  to: string;
  /** Encoded transaction data */
  data: string;
  /** Value to send in wei (optional) */
  value?: string;
  /** Gas limit override */
  gasLimit?: bigint | string;
  /** Gas price for legacy transactions */
  gasPrice?: bigint | string;
  /** Max fee per gas for EIP-1559 transactions */
  maxFeePerGas?: bigint | string;
  /** Max priority fee per gas for EIP-1559 transactions */
  maxPriorityFeePerGas?: bigint | string;
  /** Transaction nonce override */
  nonce?: number;
}

/**
 * Transaction receipt data
 */
export interface TransactionReceipt {
  /** Transaction hash */
  hash: string;
  /** Block number */
  blockNumber: number;
  /** Transaction status (1 = success, 0 = failure) */
  status: number;
}

/**
 * Transaction response with wait method
 */
export interface TransactionResponse {
  /** Transaction hash */
  hash: string;
  /** Wait for transaction confirmation */
  wait(): Promise<TransactionReceipt>;
}

/**
 * Signer abstraction for multi-library support
 * Implemented by ViemAdapter, EthersV6Adapter, EthersV5Adapter, Web3Adapter
 */
export interface ChainSigner {
  /** Get the signer's address */
  getAddress(): Promise<string>;
  /** Sign a message with the signer's private key */
  signMessage(message: Uint8Array): Promise<string>;
  /** Send a transaction */
  sendTransaction(tx: TransactionRequest): Promise<TransactionResponse>;
}
