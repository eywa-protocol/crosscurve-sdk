/**
 * Unit tests for ViemAdapter
 *
 * Tests viem library integration for ChainSigner interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViemAdapter } from '../../../../src/infrastructure/adapters/ViemAdapter.js';
import type { TransactionRequest } from '../../../../src/types/signer.js';

describe('ViemAdapter', () => {
  const testAddress = '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5';
  const testSignature = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
  const testTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

  // Mock account object (similar to what privateKeyToAccount returns)
  const mockAccount = { address: testAddress };

  // Create mock clients for each test
  const createMockWalletClient = () => ({
    signMessage: vi.fn(),
    signTypedData: vi.fn(),
    sendTransaction: vi.fn(),
  });

  const createMockPublicClient = () => ({
    waitForTransactionReceipt: vi.fn(),
  });

  describe('getAddress', () => {
    it('should return the configured address from account object', async () => {
      const mockWalletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const address = await adapter.getAddress();

      expect(address).toBe(testAddress);
    });

    it('should return address when account is a string', async () => {
      const mockWalletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      // Account can also be a string address (for legacy compatibility)
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, testAddress);

      const address = await adapter.getAddress();

      expect(address).toBe(testAddress);
    });

    it('should return address in original format', async () => {
      const mockWalletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const upperCaseAddress = '0x750035FEEAD93D8E56656D0E1F398FBA3B3866D5';
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, { address: upperCaseAddress });

      const address = await adapter.getAddress();

      expect(address).toBe(upperCaseAddress);
    });
  });

  describe('signMessage', () => {
    it('should call walletClient.signMessage with correct parameters', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.signMessage.mockResolvedValue(testSignature);
      const mockPublicClient = createMockPublicClient();
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = await adapter.signMessage(message);

      expect(mockWalletClient.signMessage).toHaveBeenCalledWith({
        account: mockAccount,
        message: { raw: message },
      });
      expect(signature).toBe(testSignature);
    });

    it('should handle empty message', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.signMessage.mockResolvedValue(testSignature);
      const mockPublicClient = createMockPublicClient();
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const message = new Uint8Array([]);
      await adapter.signMessage(message);

      expect(mockWalletClient.signMessage).toHaveBeenCalledWith({
        account: mockAccount,
        message: { raw: message },
      });
    });

    it('should handle large messages', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.signMessage.mockResolvedValue(testSignature);
      const mockPublicClient = createMockPublicClient();
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const message = new Uint8Array(1024).fill(255);
      const signature = await adapter.signMessage(message);

      expect(mockWalletClient.signMessage).toHaveBeenCalledWith({
        account: mockAccount,
        message: { raw: message },
      });
      expect(signature).toBe(testSignature);
    });

    it('should propagate errors from walletClient', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.signMessage.mockRejectedValue(new Error('User rejected signature'));
      const mockPublicClient = createMockPublicClient();
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const message = new Uint8Array([1, 2, 3]);

      await expect(adapter.signMessage(message)).rejects.toThrow('User rejected signature');
    });
  });

  describe('signTypedData', () => {
    it('should call walletClient.signTypedData with correct parameters', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.signTypedData.mockResolvedValue(testSignature);
      const mockPublicClient = createMockPublicClient();
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

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

      const signature = await adapter.signTypedData(domain, types, value);

      expect(mockWalletClient.signTypedData).toHaveBeenCalledWith({
        account: mockAccount,
        domain: expect.objectContaining({
          name: 'Test Token',
          version: '1',
          chainId: 42161,
          verifyingContract: '0x3335733c454805df6a77f825f266e136FB4a3333',
        }),
        types,
        primaryType: 'Permit',
        message: value,
      });
      expect(signature).toBe(testSignature);
    });

    it('should propagate errors from walletClient.signTypedData', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.signTypedData.mockRejectedValue(new Error('User rejected typed data signing'));
      const mockPublicClient = createMockPublicClient();
      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

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

      await expect(adapter.signTypedData(domain, types, value)).rejects.toThrow('User rejected typed data signing');
    });
  });

  describe('sendTransaction', () => {
    it('should send transaction with basic parameters', async () => {
      const mockReceipt = {
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'success' as const,
      };

      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt);

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        value: '1000000000000000',
      };

      const response = await adapter.sendTransaction(tx);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount,
        to: tx.to,
        data: tx.data,
        value: BigInt(tx.value!),
        gas: undefined,
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
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'success' as const,
      });

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      await adapter.sendTransaction(tx);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount,
        to: tx.to,
        data: tx.data,
        value: undefined,
        gas: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });

    it('should send transaction with gas parameters', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'success' as const,
      });

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: '200000',
        gasPrice: '50000000000',
      };

      await adapter.sendTransaction(tx);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount,
        to: tx.to,
        data: tx.data,
        value: undefined,
        gas: BigInt('200000'),
        gasPrice: BigInt('50000000000'),
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });

    it('should send transaction with EIP-1559 parameters', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'success' as const,
      });

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: '200000',
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '2000000000',
      };

      await adapter.sendTransaction(tx);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount,
        to: tx.to,
        data: tx.data,
        value: undefined,
        gas: BigInt('200000'),
        gasPrice: undefined,
        maxFeePerGas: BigInt('100000000000'),
        maxPriorityFeePerGas: BigInt('2000000000'),
        nonce: undefined,
      });
    });

    it('should send transaction with custom nonce', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'success' as const,
      });

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        nonce: 42,
      };

      await adapter.sendTransaction(tx);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount,
        to: tx.to,
        data: tx.data,
        value: undefined,
        gas: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: 42,
      });
    });

    it('should handle BigInt gas parameters', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'success' as const,
      });

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: 200000n,
        gasPrice: 50000000000n,
      };

      await adapter.sendTransaction(tx);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount,
        to: tx.to,
        data: tx.data,
        value: undefined,
        gas: BigInt(200000),
        gasPrice: BigInt(50000000000),
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });

    it('should handle failed transaction status', async () => {
      const mockReceipt = {
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'reverted' as const,
      };

      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt);

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      const response = await adapter.sendTransaction(tx);
      const receipt = await response.wait();

      expect(receipt.status).toBe(0);
    });

    it('should propagate sendTransaction errors', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockRejectedValue(new Error('Insufficient funds'));
      const mockPublicClient = createMockPublicClient();

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      await expect(adapter.sendTransaction(tx)).rejects.toThrow('Insufficient funds');
    });

    it('should propagate waitForTransactionReceipt errors', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockRejectedValue(new Error('Transaction timeout'));

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      const response = await adapter.sendTransaction(tx);

      await expect(response.wait()).rejects.toThrow('Transaction timeout');
    });

    it('should handle zero value transactions', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'success' as const,
      });

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        value: '0',
      };

      await adapter.sendTransaction(tx);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        account: mockAccount,
        to: tx.to,
        data: tx.data,
        value: BigInt(0),
        gas: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });
  });

  describe('integration', () => {
    it('should work with multiple sequential operations', async () => {
      const mockWalletClient = createMockWalletClient();
      mockWalletClient.signMessage.mockResolvedValue(testSignature);
      mockWalletClient.sendTransaction.mockResolvedValue(testTxHash);
      const mockPublicClient = createMockPublicClient();
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: 'success' as const,
      });

      const adapter = new ViemAdapter(mockWalletClient, mockPublicClient, mockAccount);

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

      expect(mockWalletClient.signMessage).toHaveBeenCalledTimes(1);
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledTimes(1);
    });
  });
});
