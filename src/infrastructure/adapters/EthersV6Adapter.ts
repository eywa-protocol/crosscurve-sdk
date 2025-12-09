/**
 * @fileoverview Ethers v6 library adapter
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
 * Ethers v6 adapter for ChainSigner interface
 * Compatible with ethers v6.x Signer
 */
export class EthersV6Adapter implements ChainSigner {
  constructor(private readonly signer: any) {}

  async getAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  async signMessage(message: Uint8Array): Promise<string> {
    return await this.signer.signMessage(message);
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>
  ): Promise<string> {
    // Ethers v6 uses signTypedData method
    return await this.signer.signTypedData(domain, types, value);
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    const ethersResponse = await this.signer.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      nonce: tx.nonce,
    });

    return {
      hash: ethersResponse.hash,
      wait: async () => {
        const receipt = await ethersResponse.wait();
        return {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          status: receipt.status ?? 0,
        };
      },
    };
  }

  async call(request: CallRequest): Promise<string> {
    const result = await this.signer.provider?.call({
      to: request.to,
      data: request.data,
    });
    return result ?? '0x';
  }
}
