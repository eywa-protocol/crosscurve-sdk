/**
 * @fileoverview Unit tests for bridge trackers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RubicTracker } from '../../../../src/infrastructure/bridges/RubicTracker.js';
import { BungeeTracker } from '../../../../src/infrastructure/bridges/BungeeTracker.js';
import { RouteProvider } from '../../../../src/constants/providers.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RubicTracker', () => {
  let tracker: RubicTracker;

  beforeEach(() => {
    tracker = new RubicTracker();
    mockFetch.mockClear();
  });

  it('should have correct provider identifier', () => {
    expect(tracker.provider).toBe(RouteProvider.RUBIC);
  });

  it('should track completed transaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        srcTxHash: '0xabc123',
        dstTxHash: '0xdef456',
        fromBlockchain: 'ETH',
        toBlockchain: 'POLYGON',
      }),
    });

    const result = await tracker.track({
      transactionHash: '0xabc123',
    });

    expect(result.status).toBe('completed');
    expect(result.sourceTx?.hash).toBe('0xabc123');
    expect(result.destinationTx?.hash).toBe('0xdef456');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('srcTxHash=0xabc123'),
      expect.any(Object)
    );
  });

  it('should track pending transaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'pending',
        srcTxHash: '0xabc123',
        dstTxHash: null,
        fromBlockchain: 'ETH',
        toBlockchain: 'POLYGON',
      }),
    });

    const result = await tracker.track({
      transactionHash: '0xabc123',
    });

    expect(result.status).toBe('pending');
    expect(result.destinationTx?.hash).toBeNull();
  });

  it('should include rubicId in request if provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        srcTxHash: '0xabc123',
        dstTxHash: '0xdef456',
      }),
    });

    await tracker.track({
      transactionHash: '0xabc123',
      bridgeId: 'rubic-12345',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('rubicId=rubic-12345'),
      expect.any(Object)
    );
  });

  it('should handle failed transaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'fail',
        srcTxHash: '0xabc123',
        dstTxHash: null,
      }),
    });

    const result = await tracker.track({
      transactionHash: '0xabc123',
    });

    expect(result.status).toBe('failed');
  });

  it('should throw on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(tracker.track({ transactionHash: '0xabc123' })).rejects.toThrow(
      'Rubic API error: 500 Internal Server Error'
    );
  });
});

describe('BungeeTracker', () => {
  let tracker: BungeeTracker;

  beforeEach(() => {
    tracker = new BungeeTracker();
    mockFetch.mockClear();
  });

  it('should have correct provider identifier', () => {
    expect(tracker.provider).toBe(RouteProvider.BUNGEE);
  });

  it('should track completed transaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: [{
          hash: '0xabc123',
          originData: {
            txHash: '0xabc123',
            status: 'COMPLETED',
            originChainId: 1,
            userAddress: '0xuser',
            timestamp: 123456,
          },
          destinationData: {
            txHash: '0xdef456',
            status: 'COMPLETED',
            destinationChainId: 137,
            receiverAddress: '0xuser',
          },
        }],
      }),
    });

    const result = await tracker.track({
      transactionHash: '0xabc123',
    });

    expect(result.status).toBe('completed');
    expect(result.sourceTx?.hash).toBe('0xabc123');
    expect(result.destinationTx?.hash).toBe('0xdef456');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('txHash=0xabc123'),
      expect.any(Object)
    );
  });

  it('should track pending transaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: [{
          hash: '0xabc123',
          originData: {
            txHash: '0xabc123',
            status: 'PENDING',
            originChainId: 1,
            userAddress: '0xuser',
            timestamp: 123456,
          },
          destinationData: {
            txHash: null,
            status: 'PENDING',
            destinationChainId: 137,
            receiverAddress: '0xuser',
          },
        }],
      }),
    });

    const result = await tracker.track({
      transactionHash: '0xabc123',
    });

    expect(result.status).toBe('pending');
  });

  it('should handle failed destination transaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: [{
          hash: '0xabc123',
          originData: {
            txHash: '0xabc123',
            status: 'COMPLETED',
            originChainId: 1,
            userAddress: '0xuser',
            timestamp: 123456,
          },
          destinationData: {
            txHash: null,
            status: 'FAILED',
            destinationChainId: 137,
            receiverAddress: '0xuser',
          },
        }],
      }),
    });

    const result = await tracker.track({
      transactionHash: '0xabc123',
    });

    expect(result.status).toBe('failed');
  });

  it('should throw when response indicates failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        result: [],
        message: 'Transaction not found',
      }),
    });

    await expect(tracker.track({ transactionHash: '0xabc123' })).rejects.toThrow(
      'Transaction not found'
    );
  });

  it('should throw on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(tracker.track({ transactionHash: '0xabc123' })).rejects.toThrow(
      'Bungee API error: 404 Not Found'
    );
  });
});
