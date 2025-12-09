/**
 * @fileoverview Viem library adapter
 * @implements PRD Section 7.3 - Signer Abstraction
 * @layer infrastructure - Implements domain ChainSigner interface
 */

import type {
  ChainSigner,
  TransactionRequest,
  TransactionResponse,
  TypedDataDomain,
  TypedDataField,
  CallRequest,
} from '../../types/signer.js';

/**
 * Viem adapter for ChainSigner interface
 * Compatible with viem v2.x WalletClient and PublicClient
 *
 * @param walletClient - viem WalletClient for sending transactions
 * @param publicClient - viem PublicClient for reading chain data (waitForTransactionReceipt)
 * @param account - The account object (from privateKeyToAccount, mnemonicToAccount, etc.)
 *                  Required for local signing with public RPC endpoints
 */
export class ViemAdapter implements ChainSigner {
  constructor(
    private readonly walletClient: any,
    private readonly publicClient: any,
    private readonly account: any
  ) {}

  async getAddress(): Promise<string> {
    return typeof this.account === 'string' ? this.account : this.account.address;
  }

  async signMessage(message: Uint8Array): Promise<string> {
    const signature = await this.walletClient.signMessage({
      account: this.account,
      message: { raw: message },
    });
    return signature;
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>
  ): Promise<string> {
    const signature = await this.walletClient.signTypedData({
      account: this.account,
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract as `0x${string}` | undefined,
        salt: domain.salt as `0x${string}` | undefined,
      },
      types,
      primaryType: Object.keys(types)[0],
      message: value,
    });
    return signature;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    // Pass the full account object for local signing
    // This enables signing with public RPC endpoints that don't support eth_sendTransaction
    const hash = await this.walletClient.sendTransaction({
      account: this.account,
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value ? BigInt(tx.value) : undefined,
      gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
      gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
      maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : undefined,
      nonce: tx.nonce,
    });

    return {
      hash,
      wait: async () => {
        // Use publicClient for reading chain data (receipt)
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return {
          hash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          status: receipt.status === 'success' ? 1 : 0,
        };
      },
    };
  }

  async call(request: CallRequest): Promise<string> {
    const result = await this.publicClient.call({
      to: request.to as `0x${string}`,
      data: request.data as `0x${string}`,
    });
    return result.data ?? '0x';
  }
}
