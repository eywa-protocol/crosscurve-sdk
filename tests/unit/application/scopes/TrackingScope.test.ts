/**
 * Unit tests for TrackingScope (Tier 2 API)
 *
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingScope } from '../../../../src/application/scopes/TrackingScope.js';
import type { IApiClient, ITrackingService } from '../../../../src/domain/interfaces/index.js';
import type { TransactionStatus } from '../../../../src/types/index.js';
import { createMockApiClient } from '../../../mocks/MockApiClient.js';

// Create mock tracking service
const createMockTrackingService = (): {
  getTransactionStatus: ReturnType<typeof vi.fn>;
  searchTransactions: ReturnType<typeof vi.fn>;
  getHistory: ReturnType<typeof vi.fn>;
} => ({
  getTransactionStatus: vi.fn(),
  searchTransactions: vi.fn(),
  getHistory: vi.fn(),
});

describe('TrackingScope', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let mockTrackingService: ReturnType<typeof createMockTrackingService>;
  let scope: TrackingScope;

  const testRequestId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const testTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

  const createMockStatus = (overrides: Partial<TransactionStatus> = {}): TransactionStatus => ({
    status: 'in progress',
    inconsistency: false,
    source: {
      chainId: 42161,
      transactionHash: testTxHash,
      from: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
      events: [],
      status: 'completed',
    },
    oracle: {
      relayChainId: 42161,
      requestId: testRequestId,
      status: 'in progress',
      height: null,
      epoch: null,
      time: null,
    },
    destination: {
      chainId: 10,
      transactionHash: null,
      events: [],
      emergency: false,
      status: 'pending',
      bridgeState: {},
    },
    data: {},
    ...overrides,
  });

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    mockTrackingService = createMockTrackingService();
    scope = new TrackingScope(
      mockApiClient as IApiClient,
      mockTrackingService as ITrackingService
    );
  });

  describe('get', () => {
    it('should call trackingService.getTransactionStatus with requestId', async () => {
      const mockStatus = createMockStatus();
      mockTrackingService.getTransactionStatus.mockResolvedValue(mockStatus);

      const status = await scope.get(testRequestId);

      expect(mockTrackingService.getTransactionStatus).toHaveBeenCalledWith(testRequestId);
      expect(status).toBe(mockStatus);
    });

    it('should return in-progress status', async () => {
      const mockStatus = createMockStatus({
        status: 'in progress',
        oracle: {
          relayChainId: 42161,
          requestId: testRequestId,
          status: 'in progress',
          height: null,
          epoch: null,
          time: null,
        },
      });
      mockTrackingService.getTransactionStatus.mockResolvedValue(mockStatus);

      const status = await scope.get(testRequestId);

      expect(status.status).toBe('in progress');
      expect(status.oracle.status).toBe('in progress');
    });

    it('should return completed status', async () => {
      const mockStatus = createMockStatus({
        status: 'completed',
        oracle: {
          relayChainId: 42161,
          requestId: testRequestId,
          status: 'completed',
          height: 12345678,
          epoch: 100,
          time: Date.now(),
        },
        destination: {
          chainId: 10,
          transactionHash: testTxHash,
          events: [],
          emergency: false,
          status: 'completed',
          bridgeState: {},
        },
      });
      mockTrackingService.getTransactionStatus.mockResolvedValue(mockStatus);

      const status = await scope.get(testRequestId);

      expect(status.status).toBe('completed');
      expect(status.destination.transactionHash).toBe(testTxHash);
      expect(status.destination.status).toBe('completed');
    });

    it('should return failed status with recovery info', async () => {
      const mockStatus = createMockStatus({
        status: 'failed',
        destination: {
          chainId: 10,
          transactionHash: null,
          events: [],
          emergency: true,
          status: 'failed',
          bridgeState: {},
        },
        recovery: {
          type: 'emergency',
          available: true,
        },
      });
      mockTrackingService.getTransactionStatus.mockResolvedValue(mockStatus);

      const status = await scope.get(testRequestId);

      expect(status.status).toBe('failed');
      expect(status.destination.emergency).toBe(true);
      expect(status.recovery?.type).toBe('emergency');
      expect(status.recovery?.available).toBe(true);
    });

    it('should return status with inconsistency detected', async () => {
      const mockStatus = createMockStatus({
        status: 'in progress',
        inconsistency: true,
        recovery: {
          type: 'inconsistency',
          available: true,
        },
      });
      mockTrackingService.getTransactionStatus.mockResolvedValue(mockStatus);

      const status = await scope.get(testRequestId);

      expect(status.inconsistency).toBe(true);
      expect(status.recovery?.type).toBe('inconsistency');
    });

    it('should propagate API errors', async () => {
      mockTrackingService.getTransactionStatus.mockRejectedValue(new Error('Request ID not found'));

      await expect(scope.get('invalid-request-id')).rejects.toThrow('Request ID not found');
    });

    it('should return retry status', async () => {
      const mockStatus = createMockStatus({
        status: 'retry',
        destination: {
          chainId: 10,
          transactionHash: null,
          events: [],
          emergency: false,
          status: 'retry',
          bridgeState: {},
        },
        recovery: {
          type: 'retry',
          available: true,
        },
      });
      mockTrackingService.getTransactionStatus.mockResolvedValue(mockStatus);

      const status = await scope.get(testRequestId);

      expect(status.status).toBe('retry');
      expect(status.recovery?.type).toBe('retry');
    });
  });

  describe('search', () => {
    it('should call trackingService.searchTransactions with query', async () => {
      const mockStatuses = [createMockStatus(), createMockStatus({ status: 'completed' })];
      mockTrackingService.searchTransactions.mockResolvedValue(mockStatuses);

      const query = '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5';
      const results = await scope.search(query);

      expect(mockTrackingService.searchTransactions).toHaveBeenCalledWith(query);
      expect(results).toEqual(mockStatuses);
    });

    it('should return empty array when no transactions found', async () => {
      mockTrackingService.searchTransactions.mockResolvedValue([]);

      const results = await scope.search('0x0000000000000000000000000000000000000000');

      expect(results).toEqual([]);
    });

    it('should return multiple transaction statuses', async () => {
      const mockStatuses = [
        createMockStatus({ status: 'in progress' }),
        createMockStatus({ status: 'completed' }),
        createMockStatus({ status: 'failed' }),
      ];
      mockTrackingService.searchTransactions.mockResolvedValue(mockStatuses);

      const results = await scope.search('0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5');

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('in progress');
      expect(results[1].status).toBe('completed');
      expect(results[2].status).toBe('failed');
    });

    it('should propagate search errors', async () => {
      mockTrackingService.searchTransactions.mockRejectedValue(new Error('Search failed'));

      await expect(scope.search('invalid-query')).rejects.toThrow('Search failed');
    });

    it('should search by transaction hash', async () => {
      const mockStatus = createMockStatus();
      mockTrackingService.searchTransactions.mockResolvedValue([mockStatus]);

      const results = await scope.search(testTxHash);

      expect(mockTrackingService.searchTransactions).toHaveBeenCalledWith(testTxHash);
      expect(results).toHaveLength(1);
    });
  });

  describe('history', () => {
    it('returns transaction history for address', async () => {
      const mockStatus = createMockStatus();
      mockTrackingService.getHistory.mockResolvedValue([mockStatus]);

      const result = await scope.history('0xAddress');

      expect(result).toHaveLength(1);
      expect(mockTrackingService.getHistory).toHaveBeenCalledWith('0xAddress');
    });

    it('should return empty array when no history found', async () => {
      mockTrackingService.getHistory.mockResolvedValue([]);

      const results = await scope.history('0x0000000000000000000000000000000000000000');

      expect(results).toEqual([]);
    });

    it('should propagate history errors', async () => {
      mockTrackingService.getHistory.mockRejectedValue(new Error('History failed'));

      await expect(scope.history('0xAddress')).rejects.toThrow('History failed');
    });
  });
});
