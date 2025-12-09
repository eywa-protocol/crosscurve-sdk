/**
 * @fileoverview Web3.js library adapter
 * @implements PRD Section 7.3 - Signer Abstraction
 * @layer infrastructure - Implements domain ChainSigner interface
 */

import type { ChainSigner, TransactionRequest, TransactionResponse } from '../../types/signer.js';

/**
 * Web3.js adapter for ChainSigner interface
 * Compatible with web3.js v4.x
 */
export class Web3Adapter implements ChainSigner {
  constructor(
    private readonly web3: any,
    private readonly address: string
  ) {}

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signMessage(message: Uint8Array): Promise<string> {
    const hexMessage = '0x' + Buffer.from(message).toString('hex');
    const signature = await this.web3.eth.sign(hexMessage, this.address);
    return signature;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    const txParams: any = {
      from: this.address,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gas: tx.gasLimit,
      gasPrice: tx.gasPrice,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      nonce: tx.nonce,
    };

    const receipt = await this.web3.eth.sendTransaction(txParams);

    return {
      hash: receipt.transactionHash,
      wait: async () => {
        return {
          hash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          status: receipt.status ? 1 : 0,
        };
      },
    };
  }
}
