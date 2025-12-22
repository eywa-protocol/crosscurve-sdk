/**
 * @fileoverview ChainSigner interface and transaction types
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
  /** Chain ID for replay protection */
  chainId?: number;
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
 * EIP-712 typed data for signing
 */
export interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
  salt?: string;
}

/**
 * EIP-712 typed data parameter
 */
export interface TypedDataField {
  name: string;
  type: string;
}

/**
 * Call request for read-only contract calls
 */
export interface CallRequest {
  /** Target contract address */
  to: string;
  /** Encoded call data */
  data: string;
}

/**
 * Signer abstraction for multi-library support
 * Implemented by ViemAdapter, EthersV6Adapter, EthersV5Adapter, Web3Adapter
 */
export interface ChainSigner {
  /** Get the signer's address */
  getAddress(): Promise<string>;
  /** Get the chain ID (optional for backwards compatibility) */
  getChainId?(): Promise<number>;
  /** Sign a message with the signer's private key */
  signMessage(message: Uint8Array): Promise<string>;
  /**
   * Sign EIP-712 typed data (required for EIP-2612 permit)
   * @param domain EIP-712 domain separator
   * @param types Type definitions (excluding EIP712Domain)
   * @param value The typed data to sign
   * @returns Signature as hex string
   */
  signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>
  ): Promise<string>;
  /** Send a transaction */
  sendTransaction(tx: TransactionRequest): Promise<TransactionResponse>;
  /** Execute a read-only contract call */
  call(request: CallRequest): Promise<string>;
}
