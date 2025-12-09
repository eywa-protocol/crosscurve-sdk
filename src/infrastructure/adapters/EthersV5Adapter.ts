/**
 * @fileoverview Ethers v5 library adapter
 * @implements PRD Section 7.3 - Signer Abstraction
 * @layer infrastructure - Implements domain ChainSigner interface
 */

import type { ChainSigner, TransactionRequest, TransactionResponse } from '../../types/signer.js';

/**
 * Ethers v5 adapter for ChainSigner interface
 * Compatible with ethers v5.x Signer
 */
export class EthersV5Adapter implements ChainSigner {
  constructor(private readonly signer: any) {}

  async getAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  async signMessage(message: Uint8Array): Promise<string> {
    return await this.signer.signMessage(message);
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
          hash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          status: receipt.status ?? 0,
        };
      },
    };
  }
}
