/**
 * @fileoverview Pimlico endpoint unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pimlicoHealth, pimlicoRpc } from '../../../../../src/infrastructure/api/endpoints/pimlico.js';
import { ValidationError } from '../../../../../src/errors/index.js';
import type { HttpClient } from '../../../../../src/infrastructure/api/client/index.js';

describe('pimlico endpoints', () => {
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;
  });

  describe('pimlicoHealth', () => {
    it('should call GET /pimlico/health', async () => {
      (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'ok' });

      const result = await pimlicoHealth(mockClient);

      expect(mockClient.get).toHaveBeenCalledWith('/pimlico/health');
      expect(result.status).toBe('ok');
    });
  });

  describe('pimlicoRpc', () => {
    it('should call POST /pimlico/{chainName} for allowed methods', async () => {
      const request = { jsonrpc: '2.0' as const, id: 1, method: 'eth_sendUserOperation', params: [] };
      const response = { jsonrpc: '2.0' as const, id: 1, result: '0xhash' };
      (mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValue(response);

      const result = await pimlicoRpc(mockClient, 'arbitrum', request);

      expect(mockClient.post).toHaveBeenCalledWith('/pimlico/arbitrum', request);
      expect(result.result).toBe('0xhash');
    });

    it('should throw ValidationError for disallowed methods', async () => {
      const request = { jsonrpc: '2.0' as const, id: 1, method: 'eth_call', params: [] };

      await expect(pimlicoRpc(mockClient, 'arbitrum', request)).rejects.toThrow(ValidationError);
      await expect(pimlicoRpc(mockClient, 'arbitrum', request)).rejects.toThrow(
        'Method eth_call is not allowed through Pimlico proxy',
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it.each([
      'eth_sendUserOperation',
      'eth_estimateUserOperationGas',
      'eth_getUserOperationReceipt',
      'eth_getUserOperationByHash',
      'eth_supportedEntryPoints',
      'pm_getPaymasterData',
      'pm_getPaymasterStubData',
      'pm_supportedTokens',
      'pimlico_getUserOperationGasPrice',
      'pimlico_getTokenQuotes',
    ])('should allow method %s', async (method) => {
      const request = { jsonrpc: '2.0' as const, id: 1, method, params: [] };
      (mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ jsonrpc: '2.0', id: 1, result: null });

      await pimlicoRpc(mockClient, 'ethereum', request);

      expect(mockClient.post).toHaveBeenCalledWith('/pimlico/ethereum', request);
    });
  });
});
