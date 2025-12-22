/**
 * @fileoverview Web3.js library adapter
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

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>
  ): Promise<string> {
    // Build EIP-712 typed data structure
    const typedData = {
      types: {
        EIP712Domain: [
          ...(domain.name ? [{ name: 'name', type: 'string' }] : []),
          ...(domain.version ? [{ name: 'version', type: 'string' }] : []),
          ...(domain.chainId !== undefined ? [{ name: 'chainId', type: 'uint256' }] : []),
          ...(domain.verifyingContract ? [{ name: 'verifyingContract', type: 'address' }] : []),
          ...(domain.salt ? [{ name: 'salt', type: 'bytes32' }] : []),
        ],
        ...types,
      },
      primaryType: Object.keys(types)[0],
      domain,
      message: value,
    };

    // Web3.js v4.x uses eth.signTypedData
    const signature = await this.web3.eth.signTypedData(this.address, typedData);
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

  async call(request: CallRequest): Promise<string> {
    const result = await this.web3.eth.call({
      to: request.to,
      data: request.data,
    });
    return result ?? '0x';
  }
}
