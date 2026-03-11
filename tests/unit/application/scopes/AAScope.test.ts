/**
 * Unit tests for AAScope (Tier 2 API)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AAScope } from '../../../../src/application/scopes/AAScope.js';
import type { IAAApi } from '../../../../src/domain/interfaces/IAAApi.js';
import type { IPimlicoApi } from '../../../../src/domain/interfaces/IPimlicoApi.js';
import type { AACreateTxParams, AATransaction, JsonRpcResponse } from '../../../../src/types/aa.js';

function createMockAAApi(): IAAApi & {
  createAATransaction: ReturnType<typeof vi.fn>;
} {
  return {
    createAATransaction: vi.fn(),
  };
}

function createMockPimlicoApi(): IPimlicoApi & {
  pimlicoHealth: ReturnType<typeof vi.fn>;
  pimlicoRpc: ReturnType<typeof vi.fn>;
} {
  return {
    pimlicoHealth: vi.fn(),
    pimlicoRpc: vi.fn(),
  };
}

describe('AAScope', () => {
  let mockAAApi: ReturnType<typeof createMockAAApi>;
  let mockPimlicoApi: ReturnType<typeof createMockPimlicoApi>;

  beforeEach(() => {
    mockAAApi = createMockAAApi();
    mockPimlicoApi = createMockPimlicoApi();
  });

  describe('isAvailable', () => {
    it('should return true when pimlico health is ok', async () => {
      mockPimlicoApi.pimlicoHealth.mockResolvedValue({ status: 'ok' });
      const scope = new AAScope(mockAAApi, mockPimlicoApi);

      expect(await scope.isAvailable()).toBe(true);
    });

    it('should return false when pimlico health is unavailable', async () => {
      mockPimlicoApi.pimlicoHealth.mockResolvedValue({ status: 'unavailable' });
      const scope = new AAScope(mockAAApi, mockPimlicoApi);

      expect(await scope.isAvailable()).toBe(false);
    });

    it('should return false when health check throws', async () => {
      mockPimlicoApi.pimlicoHealth.mockRejectedValue(new Error('network error'));
      const scope = new AAScope(mockAAApi, mockPimlicoApi);

      expect(await scope.isAvailable()).toBe(false);
    });
  });

  describe('createTransaction', () => {
    it('should delegate to aaApi.createAATransaction', async () => {
      const expected: AATransaction = {
        walletType: '4337',
        calls: [{ to: '0x1', value: '0', data: '0x' }],
        chainId: 42161,
        paymasterContext: { token: '0xUSDC' },
      };
      mockAAApi.createAATransaction.mockResolvedValue(expected);
      const scope = new AAScope(mockAAApi, mockPimlicoApi);

      const params: AACreateTxParams = {
        quote: {} as AACreateTxParams['quote'],
        from: '0xUser',
        walletType: '4337',
      };
      const result = await scope.createTransaction(params);

      expect(mockAAApi.createAATransaction).toHaveBeenCalledWith(params);
      expect(result.calls).toHaveLength(1);
      expect(result.walletType).toBe('4337');
      expect(result.chainId).toBe(42161);
    });

    it('should propagate API errors', async () => {
      mockAAApi.createAATransaction.mockRejectedValue(new Error('Invalid wallet type'));
      const scope = new AAScope(mockAAApi, mockPimlicoApi);

      await expect(
        scope.createTransaction({ quote: {} as AACreateTxParams['quote'], from: '0x1', walletType: '4337' }),
      ).rejects.toThrow('Invalid wallet type');
    });
  });

  describe('pimlicoRpc', () => {
    it('should delegate to pimlicoApi.pimlicoRpc', async () => {
      const rpcResponse: JsonRpcResponse = { jsonrpc: '2.0', id: 1, result: ['0xEntryPoint'] };
      mockPimlicoApi.pimlicoRpc.mockResolvedValue(rpcResponse);
      const scope = new AAScope(mockAAApi, mockPimlicoApi);

      const result = await scope.pimlicoRpc('arbitrum', {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_supportedEntryPoints',
        params: [],
      });

      expect(result.result).toEqual(['0xEntryPoint']);
      expect(mockPimlicoApi.pimlicoRpc).toHaveBeenCalledWith('arbitrum', {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_supportedEntryPoints',
        params: [],
      });
    });

    it('should not call pimlicoHealth', async () => {
      mockPimlicoApi.pimlicoRpc.mockResolvedValue({ jsonrpc: '2.0', id: 1, result: null });
      const scope = new AAScope(mockAAApi, mockPimlicoApi);

      await scope.pimlicoRpc('arbitrum', { jsonrpc: '2.0', id: 1, method: 'eth_supportedEntryPoints', params: [] });

      expect(mockPimlicoApi.pimlicoHealth).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockPimlicoApi.pimlicoRpc.mockRejectedValue(new Error('Chain not supported'));
      const scope = new AAScope(mockAAApi, mockPimlicoApi);

      await expect(
        scope.pimlicoRpc('unknown', { jsonrpc: '2.0', id: 1, method: 'eth_supportedEntryPoints', params: [] }),
      ).rejects.toThrow('Chain not supported');
    });
  });
});
