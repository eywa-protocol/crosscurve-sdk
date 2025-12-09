/**
 * @fileoverview TrackingService unit tests
 * @implements PRD Section 3.2 US-2 - Manual Tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingService } from '../../../../src/application/services/TrackingService.js';
import type { IApiClient, IBridgeTracker, BridgeStatus } from '../../../../src/domain/interfaces/index.js';
import { RouteProvider } from '../../../../src/constants/providers.js';
import { createMockApiClient, mockResponses } from '../../../mocks/MockApiClient.js';
import { completedStatus, pendingStatus, inconsistencyStatus } from '../../../fixtures/transactions.js';

describe('TrackingService', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let service: TrackingService;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    service = new TrackingService(mockApiClient as IApiClient);
  });

  describe('getTransactionStatus', () => {
    describe('CrossCurve native routes', () => {
      it('should track via API when no provider specified', async () => {
        mockApiClient.getTransaction.mockResolvedValue(completedStatus);

        const result = await service.getTransactionStatus('0x' + 'a'.repeat(64));

        expect(mockApiClient.getTransaction).toHaveBeenCalledWith('0x' + 'a'.repeat(64));
        expect(result.status).toBe('completed');
      });

      it('should track via API when provider is CROSS_CURVE', async () => {
        mockApiClient.getTransaction.mockResolvedValue(completedStatus);

        const result = await service.getTransactionStatus('0x' + 'a'.repeat(64), {
          provider: RouteProvider.CROSS_CURVE,
        });

        expect(mockApiClient.getTransaction).toHaveBeenCalled();
        expect(result.status).toBe('completed');
      });

      it('should compute recovery info from API response', async () => {
        mockApiClient.getTransaction.mockResolvedValue(inconsistencyStatus);

        const result = await service.getTransactionStatus('0x' + 'a'.repeat(64));

        expect(result.recovery).toBeDefined();
        expect(result.recovery?.type).toBe('inconsistency');
        expect(result.recovery?.available).toBe(true);
      });

      it('should detect emergency recovery type', async () => {
        mockApiClient.getTransaction.mockResolvedValue({
          ...completedStatus,
          destination: { ...completedStatus.destination, emergency: true },
        });

        const result = await service.getTransactionStatus('0x' + 'a'.repeat(64));

        expect(result.recovery?.type).toBe('emergency');
      });

      it('should detect retry recovery type', async () => {
        mockApiClient.getTransaction.mockResolvedValue({
          ...completedStatus,
          destination: { ...completedStatus.destination, status: 'retry' },
        });

        const result = await service.getTransactionStatus('0x' + 'a'.repeat(64));

        expect(result.recovery?.type).toBe('retry');
      });
    });

    describe('external bridges', () => {
      it('should use bridge tracker for Rubic routes', async () => {
        const mockRubicTracker: IBridgeTracker = {
          provider: RouteProvider.RUBIC,
          track: vi.fn().mockResolvedValue({
            status: 'completed',
            sourceTx: { hash: '0xsource', status: 'completed' },
            destinationTx: { hash: '0xdest', status: 'completed' },
            raw: {},
          } as BridgeStatus),
        };

        service = new TrackingService(mockApiClient as IApiClient, [mockRubicTracker]);

        const result = await service.getTransactionStatus('0x' + 'd'.repeat(64), {
          provider: RouteProvider.RUBIC,
          bridgeId: 'rubic-123',
        });

        expect(mockRubicTracker.track).toHaveBeenCalledWith({
          transactionHash: '0x' + 'd'.repeat(64),
          bridgeId: 'rubic-123',
        });
        expect(result.status).toBe('completed');
        expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
      });

      it('should use bridge tracker for Bungee routes', async () => {
        const mockBungeeTracker: IBridgeTracker = {
          provider: RouteProvider.BUNGEE,
          track: vi.fn().mockResolvedValue({
            status: 'in_progress',
            sourceTx: { hash: '0xsource', status: 'completed' },
            destinationTx: null,
            raw: {},
          } as BridgeStatus),
        };

        service = new TrackingService(mockApiClient as IApiClient, [mockBungeeTracker]);

        const result = await service.getTransactionStatus('0x' + 'e'.repeat(64), {
          provider: RouteProvider.BUNGEE,
        });

        expect(mockBungeeTracker.track).toHaveBeenCalled();
        expect(result.status).toBe('in progress');
      });

      it('should throw when tracker not available for provider', async () => {
        // No trackers registered
        service = new TrackingService(mockApiClient as IApiClient, []);

        await expect(
          service.getTransactionStatus('0x' + 'f'.repeat(64), {
            provider: RouteProvider.RUBIC,
          })
        ).rejects.toThrow('No tracker available for provider: rubic');
      });

      it('should map bridge status correctly', async () => {
        const mockTracker: IBridgeTracker = {
          provider: RouteProvider.RUBIC,
          track: vi.fn().mockResolvedValue({
            status: 'pending',
            sourceTx: null,
            destinationTx: null,
            raw: { customData: true },
          } as BridgeStatus),
        };

        service = new TrackingService(mockApiClient as IApiClient, [mockTracker]);

        const result = await service.getTransactionStatus('0x' + 'g'.repeat(64), {
          provider: RouteProvider.RUBIC,
        });

        expect(result.status).toBe('in progress');
        expect(result.inconsistency).toBe(false);
        expect(result.data).toEqual({ customData: true });
        expect(result.recovery).toBeUndefined();
      });

      it('should map refunded status to reverted', async () => {
        const mockTracker: IBridgeTracker = {
          provider: RouteProvider.BUNGEE,
          track: vi.fn().mockResolvedValue({
            status: 'refunded',
            sourceTx: { hash: '0x1', status: 'completed' },
            destinationTx: null,
            raw: {},
          } as BridgeStatus),
        };

        service = new TrackingService(mockApiClient as IApiClient, [mockTracker]);

        const result = await service.getTransactionStatus('0x' + 'h'.repeat(64), {
          provider: RouteProvider.BUNGEE,
        });

        expect(result.status).toBe('reverted');
      });
    });
  });

  describe('searchTransactions', () => {
    it('should search via API and return results', async () => {
      const searchResponse = {
        transactions: [completedStatus, pendingStatus],
      };
      mockApiClient.searchTransactions.mockResolvedValue(searchResponse);

      const results = await service.searchTransactions('0x1234');

      expect(mockApiClient.searchTransactions).toHaveBeenCalledWith('0x1234');
      expect(results).toHaveLength(2);
    });

    it('should add recovery info to search results', async () => {
      const searchResponse = {
        transactions: [inconsistencyStatus],
      };
      mockApiClient.searchTransactions.mockResolvedValue(searchResponse);

      const results = await service.searchTransactions('0x5678');

      expect(results[0].recovery).toBeDefined();
      expect(results[0].recovery?.type).toBe('inconsistency');
    });

    it('should return empty array on 404', async () => {
      const error = new Error('Not found');
      (error as any).statusCode = 404;
      mockApiClient.searchTransactions.mockRejectedValue(error);

      const results = await service.searchTransactions('nonexistent');

      expect(results).toEqual([]);
    });

    it('should propagate other errors', async () => {
      mockApiClient.searchTransactions.mockRejectedValue(new Error('Server error'));

      await expect(service.searchTransactions('query')).rejects.toThrow('Server error');
    });
  });

  describe('constructor validation', () => {
    it('should reject invalid provider in bridge tracker', () => {
      const invalidTracker = {
        provider: 'invalid_provider' as any,
        track: vi.fn(),
      };

      expect(() => {
        new TrackingService(mockApiClient as IApiClient, [invalidTracker]);
      }).toThrow('Invalid bridge provider: invalid_provider');
    });

    it('should accept valid providers', () => {
      const validTrackers: IBridgeTracker[] = [
        { provider: RouteProvider.RUBIC, track: vi.fn() },
        { provider: RouteProvider.BUNGEE, track: vi.fn() },
      ];

      expect(() => {
        new TrackingService(mockApiClient as IApiClient, validTrackers);
      }).not.toThrow();
    });
  });
});
