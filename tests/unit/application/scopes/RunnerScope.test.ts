/**
 * Unit tests for RunnerScope (Tier 2 API)
 */

import { describe, it, expect, vi } from 'vitest';
import { RunnerScope } from '../../../../src/application/scopes/RunnerScope.js';
import type { IRunnerApi } from '../../../../src/domain/interfaces/IRunnerApi.js';
import type { TxCreateResponse } from '../../../../src/types/api/responses.js';
import type { RunnerStatus } from '../../../../src/types/runner.js';

function createMockRunnerApi(): IRunnerApi & {
  createEmergencyRunner: ReturnType<typeof vi.fn>;
  getRunnerStatus: ReturnType<typeof vi.fn>;
} {
  return {
    createEmergencyRunner: vi.fn<[string], Promise<TxCreateResponse>>(),
    getRunnerStatus: vi.fn<[string], Promise<RunnerStatus>>(),
  };
}

describe('RunnerScope', () => {
  describe('createEmergency', () => {
    it('should call apiClient.createEmergencyRunner with requestId', async () => {
      const mockApi = createMockRunnerApi();
      const txResponse: TxCreateResponse = { to: '0xabc', value: '0', data: '0x1234' };
      mockApi.createEmergencyRunner.mockResolvedValue(txResponse);
      const scope = new RunnerScope(mockApi);

      const result = await scope.createEmergency('req-123');

      expect(mockApi.createEmergencyRunner).toHaveBeenCalledWith('req-123');
      expect(result).toBe(txResponse);
    });

    it('should return response with abi/args format', async () => {
      const mockApi = createMockRunnerApi();
      const txResponse: TxCreateResponse = {
        to: '0xabc',
        value: '0',
        abi: 'emergencyRunner(bytes32)',
        args: ['0x1234'],
      };
      mockApi.createEmergencyRunner.mockResolvedValue(txResponse);
      const scope = new RunnerScope(mockApi);

      const result = await scope.createEmergency('req-456');

      expect(result.abi).toBe('emergencyRunner(bytes32)');
      expect(result.args).toEqual(['0x1234']);
    });

    it('should propagate API errors', async () => {
      const mockApi = createMockRunnerApi();
      mockApi.createEmergencyRunner.mockRejectedValue(new Error('Runner not found'));
      const scope = new RunnerScope(mockApi);

      await expect(scope.createEmergency('invalid-id')).rejects.toThrow('Runner not found');
    });
  });

  describe('getStatus', () => {
    it('should call apiClient.getRunnerStatus with requestId', async () => {
      const mockApi = createMockRunnerApi();
      const status: RunnerStatus = {
        requestId: 'req-123',
        chainId: 1,
        sourceChainId: 42161,
        initiator: '0xuser',
        runnerAddress: '0xrunner',
        token: '0xtoken',
        amountExpected: '1000000',
        deadline: 1700000000,
        salt: '0xsalt',
        status: 'pending',
        createdAt: '2026-03-11T00:00:00Z',
        updatedAt: '2026-03-11T00:00:00Z',
      };
      mockApi.getRunnerStatus.mockResolvedValue(status);
      const scope = new RunnerScope(mockApi);

      const result = await scope.getStatus('req-123');

      expect(mockApi.getRunnerStatus).toHaveBeenCalledWith('req-123');
      expect(result.status).toBe('pending');
      expect(result.chainId).toBe(1);
      expect(result.sourceChainId).toBe(42161);
    });

    it('should return full runner status fields', async () => {
      const mockApi = createMockRunnerApi();
      const status: RunnerStatus = {
        requestId: 'req-789',
        chainId: 10,
        sourceChainId: 1,
        initiator: '0xinitiator',
        runnerAddress: '0xrunner',
        token: '0xtoken',
        amountExpected: '5000000',
        deadline: 1700000000,
        salt: '0xsalt',
        txHash: '0xtx',
        fundsTxHash: '0xfunds',
        status: 'completed',
        createdAt: '2026-03-11T00:00:00Z',
        updatedAt: '2026-03-11T01:00:00Z',
      };
      mockApi.getRunnerStatus.mockResolvedValue(status);
      const scope = new RunnerScope(mockApi);

      const result = await scope.getStatus('req-789');

      expect(result.txHash).toBe('0xtx');
      expect(result.fundsTxHash).toBe('0xfunds');
      expect(result.amountExpected).toBe('5000000');
    });

    it('should propagate API errors', async () => {
      const mockApi = createMockRunnerApi();
      mockApi.getRunnerStatus.mockRejectedValue(new Error('Request not found'));
      const scope = new RunnerScope(mockApi);

      await expect(scope.getStatus('invalid-id')).rejects.toThrow('Request not found');
    });
  });
});
