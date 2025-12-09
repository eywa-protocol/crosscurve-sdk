/**
 * Unit tests for EthersV5Adapter
 *
 * Tests ethers v5 library integration for ChainSigner interface
 * Note: v5 uses _signTypedData (underscore prefix) for typed data signing
 * @implements PRD Section 7.3 - Signer Abstraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EthersV5Adapter } from '../../../../src/infrastructure/adapters/EthersV5Adapter.js';
import type { TransactionRequest } from '../../../../src/types/signer.js';

describe('EthersV5Adapter', () => {
  const testAddress = '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5';
  const testSignature =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
  const testTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

  // Create mock ethers v5 signer
  // Note: v5 uses _signTypedData (underscore prefix)
  const createMockSigner = () => ({
    getAddress: vi.fn(),
    signMessage: vi.fn(),
    _signTypedData: vi.fn(), // v5 specific - underscore prefix
    sendTransaction: vi.fn(),
  });

  describe('getAddress', () => {
    it('should return address from signer', async () => {
      const mockSigner = createMockSigner();
      mockSigner.getAddress.mockResolvedValue(testAddress);
      const adapter = new EthersV5Adapter(mockSigner);

      const address = await adapter.getAddress();

      expect(mockSigner.getAddress).toHaveBeenCalled();
      expect(address).toBe(testAddress);
    });

    it('should propagate errors from signer.getAddress', async () => {
      const mockSigner = createMockSigner();
      mockSigner.getAddress.mockRejectedValue(new Error('Signer not connected'));
      const adapter = new EthersV5Adapter(mockSigner);

      await expect(adapter.getAddress()).rejects.toThrow('Signer not connected');
    });
  });

  describe('signMessage', () => {
    it('should call signer.signMessage with message', async () => {
      const mockSigner = createMockSigner();
      mockSigner.signMessage.mockResolvedValue(testSignature);
      const adapter = new EthersV5Adapter(mockSigner);

      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = await adapter.signMessage(message);

      expect(mockSigner.signMessage).toHaveBeenCalledWith(message);
      expect(signature).toBe(testSignature);
    });

    it('should handle empty message', async () => {
      const mockSigner = createMockSigner();
      mockSigner.signMessage.mockResolvedValue(testSignature);
      const adapter = new EthersV5Adapter(mockSigner);

      const message = new Uint8Array([]);
      await adapter.signMessage(message);

      expect(mockSigner.signMessage).toHaveBeenCalledWith(message);
    });

    it('should handle large messages', async () => {
      const mockSigner = createMockSigner();
      mockSigner.signMessage.mockResolvedValue(testSignature);
      const adapter = new EthersV5Adapter(mockSigner);

      const message = new Uint8Array(1024).fill(255);
      const signature = await adapter.signMessage(message);

      expect(mockSigner.signMessage).toHaveBeenCalledWith(message);
      expect(signature).toBe(testSignature);
    });

    it('should propagate errors from signer.signMessage', async () => {
      const mockSigner = createMockSigner();
      mockSigner.signMessage.mockRejectedValue(new Error('User rejected signature'));
      const adapter = new EthersV5Adapter(mockSigner);

      const message = new Uint8Array([1, 2, 3]);

      await expect(adapter.signMessage(message)).rejects.toThrow('User rejected signature');
    });
  });

  describe('signTypedData', () => {
    const domain = {
      name: 'Test Token',
      version: '1',
      chainId: 42161,
      verifyingContract: '0x3335733c454805df6a77f825f266e136FB4a3333',
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = {
      owner: testAddress,
      spender: '0x3335733c454805df6a77f825f266e136FB4a3333',
      value: BigInt('1000000'),
      nonce: BigInt(0),
      deadline: BigInt(1700000000),
    };

    it('should call signer._signTypedData (v5 specific method)', async () => {
      const mockSigner = createMockSigner();
      mockSigner._signTypedData.mockResolvedValue(testSignature);
      const adapter = new EthersV5Adapter(mockSigner);

      const signature = await adapter.signTypedData(domain, types, value);

      // Note: v5 uses _signTypedData (underscore prefix)
      expect(mockSigner._signTypedData).toHaveBeenCalledWith(domain, types, value);
      expect(signature).toBe(testSignature);
    });

    it('should propagate errors from signer._signTypedData', async () => {
      const mockSigner = createMockSigner();
      mockSigner._signTypedData.mockRejectedValue(new Error('User rejected typed data signing'));
      const adapter = new EthersV5Adapter(mockSigner);

      await expect(adapter.signTypedData(domain, types, value)).rejects.toThrow(
        'User rejected typed data signing'
      );
    });

    it('should handle minimal domain', async () => {
      const mockSigner = createMockSigner();
      mockSigner._signTypedData.mockResolvedValue(testSignature);
      const adapter = new EthersV5Adapter(mockSigner);

      const minimalDomain = { name: 'Test' };

      await adapter.signTypedData(minimalDomain, types, value);

      expect(mockSigner._signTypedData).toHaveBeenCalledWith(minimalDomain, types, value);
    });
  });

  describe('sendTransaction', () => {
    // Note: v5 uses transactionHash in receipt (not hash like v6)
    const createMockTxResponse = () => ({
      hash: testTxHash,
      wait: vi.fn().mockResolvedValue({
        transactionHash: testTxHash, // v5 uses transactionHash
        blockNumber: 12345678,
        status: 1,
      }),
    });

    it('should send transaction with basic parameters', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = createMockTxResponse();
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        value: '1000000000000000',
      };

      const response = await adapter.sendTransaction(tx);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        gasLimit: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
      expect(response.hash).toBe(testTxHash);

      const receipt = await response.wait();
      expect(receipt.hash).toBe(testTxHash);
      expect(receipt.blockNumber).toBe(12345678);
      expect(receipt.status).toBe(1);
    });

    it('should send transaction without value', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = createMockTxResponse();
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      await adapter.sendTransaction(tx);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: undefined,
        gasLimit: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });

    it('should send transaction with gas parameters', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = createMockTxResponse();
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: '200000',
        gasPrice: '50000000000',
      };

      await adapter.sendTransaction(tx);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: undefined,
        gasLimit: '200000',
        gasPrice: '50000000000',
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });

    it('should send transaction with EIP-1559 parameters', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = createMockTxResponse();
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: '200000',
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '2000000000',
      };

      await adapter.sendTransaction(tx);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: undefined,
        gasLimit: '200000',
        gasPrice: undefined,
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '2000000000',
        nonce: undefined,
      });
    });

    it('should send transaction with custom nonce', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = createMockTxResponse();
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        nonce: 42,
      };

      await adapter.sendTransaction(tx);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: undefined,
        gasLimit: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: 42,
      });
    });

    it('should handle BigInt gas parameters', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = createMockTxResponse();
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: 200000n,
        gasPrice: 50000000000n,
      };

      await adapter.sendTransaction(tx);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: undefined,
        gasLimit: 200000n,
        gasPrice: 50000000000n,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });

    it('should handle failed transaction status (status 0)', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = {
        hash: testTxHash,
        wait: vi.fn().mockResolvedValue({
          transactionHash: testTxHash,
          blockNumber: 12345678,
          status: 0,
        }),
      };
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      const response = await adapter.sendTransaction(tx);
      const receipt = await response.wait();

      expect(receipt.status).toBe(0);
    });

    it('should handle null status (fallback to 0)', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = {
        hash: testTxHash,
        wait: vi.fn().mockResolvedValue({
          transactionHash: testTxHash,
          blockNumber: 12345678,
          status: null,
        }),
      };
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      const response = await adapter.sendTransaction(tx);
      const receipt = await response.wait();

      expect(receipt.status).toBe(0);
    });

    it('should propagate sendTransaction errors', async () => {
      const mockSigner = createMockSigner();
      mockSigner.sendTransaction.mockRejectedValue(new Error('Insufficient funds'));
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      await expect(adapter.sendTransaction(tx)).rejects.toThrow('Insufficient funds');
    });

    it('should propagate wait() errors', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = {
        hash: testTxHash,
        wait: vi.fn().mockRejectedValue(new Error('Transaction reverted')),
      };
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      const response = await adapter.sendTransaction(tx);

      await expect(response.wait()).rejects.toThrow('Transaction reverted');
    });

    it('should handle zero value transactions', async () => {
      const mockSigner = createMockSigner();
      const mockTxResponse = createMockTxResponse();
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);
      const adapter = new EthersV5Adapter(mockSigner);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        value: '0',
      };

      await adapter.sendTransaction(tx);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: tx.to,
        data: tx.data,
        value: '0',
        gasLimit: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });
  });

  describe('integration', () => {
    it('should work with multiple sequential operations', async () => {
      const mockSigner = createMockSigner();
      mockSigner.getAddress.mockResolvedValue(testAddress);
      mockSigner.signMessage.mockResolvedValue(testSignature);
      const mockTxResponse = {
        hash: testTxHash,
        wait: vi.fn().mockResolvedValue({
          transactionHash: testTxHash,
          blockNumber: 12345678,
          status: 1,
        }),
      };
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);

      const adapter = new EthersV5Adapter(mockSigner);

      // Get address
      const address = await adapter.getAddress();
      expect(address).toBe(testAddress);

      // Sign message
      const message = new Uint8Array([1, 2, 3]);
      const signature = await adapter.signMessage(message);
      expect(signature).toBe(testSignature);

      // Send transaction
      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };
      const response = await adapter.sendTransaction(tx);
      expect(response.hash).toBe(testTxHash);

      // Wait for receipt
      const receipt = await response.wait();
      expect(receipt.status).toBe(1);

      expect(mockSigner.getAddress).toHaveBeenCalledTimes(1);
      expect(mockSigner.signMessage).toHaveBeenCalledTimes(1);
      expect(mockSigner.sendTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
