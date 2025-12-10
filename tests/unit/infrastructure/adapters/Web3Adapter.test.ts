/**
 * Unit tests for Web3Adapter
 *
 * Tests web3.js v4 library integration for ChainSigner interface
 * Note: Web3 uses Buffer for message encoding and different API patterns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Web3Adapter } from '../../../../src/infrastructure/adapters/Web3Adapter.js';
import type { TransactionRequest } from '../../../../src/types/signer.js';

describe('Web3Adapter', () => {
  const testAddress = '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5';
  const testSignature =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
  const testTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

  // Create mock web3 instance
  const createMockWeb3 = () => ({
    eth: {
      sign: vi.fn(),
      signTypedData: vi.fn(),
      sendTransaction: vi.fn(),
    },
  });

  describe('getAddress', () => {
    it('should return the configured address', async () => {
      const mockWeb3 = createMockWeb3();
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const address = await adapter.getAddress();

      expect(address).toBe(testAddress);
    });

    it('should return address in original format', async () => {
      const mockWeb3 = createMockWeb3();
      const upperCaseAddress = '0x750035FEEAD93D8E56656D0E1F398FBA3B3866D5';
      const adapter = new Web3Adapter(mockWeb3, upperCaseAddress);

      const address = await adapter.getAddress();

      expect(address).toBe(upperCaseAddress);
    });
  });

  describe('signMessage', () => {
    it('should call eth.sign with hex-encoded message', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.sign.mockResolvedValue(testSignature);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = await adapter.signMessage(message);

      // Web3 uses hex encoding with 0x prefix
      expect(mockWeb3.eth.sign).toHaveBeenCalledWith('0x0102030405', testAddress);
      expect(signature).toBe(testSignature);
    });

    it('should handle empty message', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.sign.mockResolvedValue(testSignature);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const message = new Uint8Array([]);
      await adapter.signMessage(message);

      expect(mockWeb3.eth.sign).toHaveBeenCalledWith('0x', testAddress);
    });

    it('should handle large messages', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.sign.mockResolvedValue(testSignature);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const message = new Uint8Array(1024).fill(255);
      const signature = await adapter.signMessage(message);

      // Verify hex encoding
      const expectedHex = '0x' + 'ff'.repeat(1024);
      expect(mockWeb3.eth.sign).toHaveBeenCalledWith(expectedHex, testAddress);
      expect(signature).toBe(testSignature);
    });

    it('should propagate errors from eth.sign', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.sign.mockRejectedValue(new Error('User rejected signature'));
      const adapter = new Web3Adapter(mockWeb3, testAddress);

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

    it('should call eth.signTypedData with EIP-712 structure', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.signTypedData.mockResolvedValue(testSignature);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const signature = await adapter.signTypedData(domain, types, value);

      expect(mockWeb3.eth.signTypedData).toHaveBeenCalledWith(
        testAddress,
        expect.objectContaining({
          types: expect.objectContaining({
            EIP712Domain: expect.any(Array),
            Permit: types.Permit,
          }),
          primaryType: 'Permit',
          domain,
          message: value,
        })
      );
      expect(signature).toBe(testSignature);
    });

    it('should build correct EIP712Domain for full domain', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.signTypedData.mockResolvedValue(testSignature);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      await adapter.signTypedData(domain, types, value);

      const call = mockWeb3.eth.signTypedData.mock.calls[0];
      const typedData = call[1];

      expect(typedData.types.EIP712Domain).toEqual([
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ]);
    });

    it('should handle minimal domain', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.signTypedData.mockResolvedValue(testSignature);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const minimalDomain = { name: 'Test' };

      await adapter.signTypedData(minimalDomain, types, value);

      const call = mockWeb3.eth.signTypedData.mock.calls[0];
      const typedData = call[1];

      // Only name in domain = only name in EIP712Domain
      expect(typedData.types.EIP712Domain).toEqual([{ name: 'name', type: 'string' }]);
    });

    it('should handle domain with salt', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.signTypedData.mockResolvedValue(testSignature);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const domainWithSalt = {
        name: 'Test',
        salt: '0x' + 'ab'.repeat(32),
      };

      await adapter.signTypedData(domainWithSalt, types, value);

      const call = mockWeb3.eth.signTypedData.mock.calls[0];
      const typedData = call[1];

      expect(typedData.types.EIP712Domain).toContainEqual({ name: 'salt', type: 'bytes32' });
    });

    it('should propagate errors from eth.signTypedData', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.signTypedData.mockRejectedValue(new Error('User rejected typed data signing'));
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      await expect(adapter.signTypedData(domain, types, value)).rejects.toThrow(
        'User rejected typed data signing'
      );
    });
  });

  describe('sendTransaction', () => {
    const createMockReceipt = () => ({
      transactionHash: testTxHash,
      blockNumber: 12345678n,
      status: true,
    });

    it('should send transaction with basic parameters', async () => {
      const mockWeb3 = createMockWeb3();
      const mockReceipt = createMockReceipt();
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        value: '1000000000000000',
      };

      const response = await adapter.sendTransaction(tx);

      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledWith({
        from: testAddress,
        to: tx.to,
        data: tx.data,
        value: tx.value,
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
      const mockWeb3 = createMockWeb3();
      const mockReceipt = createMockReceipt();
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      await adapter.sendTransaction(tx);

      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledWith({
        from: testAddress,
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

    it('should use gasLimit as gas parameter', async () => {
      const mockWeb3 = createMockWeb3();
      const mockReceipt = createMockReceipt();
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: '200000',
        gasPrice: '50000000000',
      };

      await adapter.sendTransaction(tx);

      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledWith({
        from: testAddress,
        to: tx.to,
        data: tx.data,
        value: undefined,
        gas: '200000', // gasLimit maps to gas
        gasPrice: '50000000000',
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });

    it('should send transaction with EIP-1559 parameters', async () => {
      const mockWeb3 = createMockWeb3();
      const mockReceipt = createMockReceipt();
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: '200000',
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '2000000000',
      };

      await adapter.sendTransaction(tx);

      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledWith({
        from: testAddress,
        to: tx.to,
        data: tx.data,
        value: undefined,
        gas: '200000',
        gasPrice: undefined,
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '2000000000',
        nonce: undefined,
      });
    });

    it('should send transaction with custom nonce', async () => {
      const mockWeb3 = createMockWeb3();
      const mockReceipt = createMockReceipt();
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        nonce: 42,
      };

      await adapter.sendTransaction(tx);

      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledWith({
        from: testAddress,
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
      const mockWeb3 = createMockWeb3();
      const mockReceipt = createMockReceipt();
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        gasLimit: 200000n,
        gasPrice: 50000000000n,
      };

      await adapter.sendTransaction(tx);

      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledWith({
        from: testAddress,
        to: tx.to,
        data: tx.data,
        value: undefined,
        gas: 200000n,
        gasPrice: 50000000000n,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });

    it('should handle failed transaction (status false)', async () => {
      const mockWeb3 = createMockWeb3();
      const mockReceipt = {
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: false,
      };
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      const response = await adapter.sendTransaction(tx);
      const receipt = await response.wait();

      expect(receipt.status).toBe(0);
    });

    it('should convert BigInt blockNumber to Number', async () => {
      const mockWeb3 = createMockWeb3();
      const mockReceipt = {
        transactionHash: testTxHash,
        blockNumber: 99999999n,
        status: true,
      };
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      const response = await adapter.sendTransaction(tx);
      const receipt = await response.wait();

      expect(typeof receipt.blockNumber).toBe('number');
      expect(receipt.blockNumber).toBe(99999999);
    });

    it('should propagate sendTransaction errors', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.sendTransaction.mockRejectedValue(new Error('Insufficient funds'));
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      await expect(adapter.sendTransaction(tx)).rejects.toThrow('Insufficient funds');
    });

    it('should include from address in transaction', async () => {
      const mockWeb3 = createMockWeb3();
      const mockReceipt = createMockReceipt();
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
      };

      await adapter.sendTransaction(tx);

      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          from: testAddress,
        })
      );
    });

    it('should handle zero value transactions', async () => {
      const mockWeb3 = createMockWeb3();
      const mockReceipt = createMockReceipt();
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const tx: TransactionRequest = {
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0xe1fcde8e',
        value: '0',
      };

      await adapter.sendTransaction(tx);

      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledWith({
        from: testAddress,
        to: tx.to,
        data: tx.data,
        value: '0',
        gas: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });
    });
  });

  describe('call', () => {
    it('should make contract call via eth.call', async () => {
      const mockWeb3 = {
        ...createMockWeb3(),
        eth: {
          ...createMockWeb3().eth,
          call: vi.fn().mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000001'),
        },
      };
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const result = await adapter.call({
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0x70a08231000000000000000000000000750035feead93d8e56656d0e1f398fba3b3866d5',
      });

      expect(mockWeb3.eth.call).toHaveBeenCalledWith({
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0x70a08231000000000000000000000000750035feead93d8e56656d0e1f398fba3b3866d5',
      });
      expect(result).toBe('0x0000000000000000000000000000000000000000000000000000000000000001');
    });

    it('should return null for null response', async () => {
      const mockWeb3 = {
        ...createMockWeb3(),
        eth: {
          ...createMockWeb3().eth,
          call: vi.fn().mockResolvedValue(null),
        },
      };
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      const result = await adapter.call({
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0x70a08231',
      });

      expect(result).toBeNull();
    });

    it('should propagate eth.call errors', async () => {
      const mockWeb3 = {
        ...createMockWeb3(),
        eth: {
          ...createMockWeb3().eth,
          call: vi.fn().mockRejectedValue(new Error('Contract execution reverted')),
        },
      };
      const adapter = new Web3Adapter(mockWeb3, testAddress);

      await expect(adapter.call({
        to: '0x3335733c454805df6a77f825f266e136FB4a3333',
        data: '0x70a08231',
      })).rejects.toThrow('Contract execution reverted');
    });
  });

  describe('integration', () => {
    it('should work with multiple sequential operations', async () => {
      const mockWeb3 = createMockWeb3();
      mockWeb3.eth.sign.mockResolvedValue(testSignature);
      const mockReceipt = {
        transactionHash: testTxHash,
        blockNumber: 12345678n,
        status: true,
      };
      mockWeb3.eth.sendTransaction.mockResolvedValue(mockReceipt);

      const adapter = new Web3Adapter(mockWeb3, testAddress);

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

      expect(mockWeb3.eth.sign).toHaveBeenCalledTimes(1);
      expect(mockWeb3.eth.sendTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
