/**
 * Unit tests for logParser utilities
 *
 * Tests extraction of requestId from ComplexOpProcessed events
 */

import { describe, it, expect } from 'vitest';
import {
  extractRequestIdFromLogs,
  getComplexOpProcessedTopic,
} from '../../../src/utils/logParser.js';

const COMPLEX_OP_PROCESSED_TOPIC = '0x830adbcf80ee865e0f0883ad52e813fdbf061b0216b724694a2b4e06708d243c';

describe('logParser utilities', () => {
  describe('getComplexOpProcessedTopic', () => {
    it('should return the correct event topic hash', () => {
      expect(getComplexOpProcessedTopic()).toBe(COMPLEX_OP_PROCESSED_TOPIC);
    });
  });

  describe('extractRequestIdFromLogs', () => {
    it('should extract nextRequestId from valid ComplexOpProcessed event', () => {
      const nextRequestId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const receipt = {
        logs: [
          {
            topics: [
              COMPLEX_OP_PROCESSED_TOPIC,
              '0x0000000000000000000000000000000000000000000000000000000000000001', // chainIdFrom
              '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // currentRequestId
            ],
            // Data: nextRequestId (32 bytes) + result (1 byte padded) + lastOp (1 byte padded)
            data: nextRequestId + '00'.repeat(32), // nextRequestId + padding for result and lastOp
          },
        ],
      };

      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBe(nextRequestId);
    });

    it('should fallback to currentRequestId when nextRequestId is zero', () => {
      const currentRequestId = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const receipt = {
        logs: [
          {
            topics: [
              COMPLEX_OP_PROCESSED_TOPIC,
              '0x0000000000000000000000000000000000000000000000000000000000000001',
              currentRequestId,
            ],
            // Zero nextRequestId
            data: '0x' + '0'.repeat(128), // 64 zeros for bytes32 + padding
          },
        ],
      };

      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBe(currentRequestId);
    });

    it('should return undefined for empty logs array', () => {
      const receipt = { logs: [] };
      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBeUndefined();
    });

    it('should return undefined for null receipt', () => {
      const result = extractRequestIdFromLogs(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined receipt', () => {
      const result = extractRequestIdFromLogs(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined for receipt without logs property', () => {
      const result = extractRequestIdFromLogs({});
      expect(result).toBeUndefined();
    });

    it('should skip logs with less than 3 topics', () => {
      const receipt = {
        logs: [
          {
            topics: [COMPLEX_OP_PROCESSED_TOPIC],
            data: '0x1234',
          },
          {
            topics: [COMPLEX_OP_PROCESSED_TOPIC, '0x01'],
            data: '0x1234',
          },
        ],
      };

      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBeUndefined();
    });

    it('should skip logs with wrong topic hash', () => {
      const receipt = {
        logs: [
          {
            topics: [
              '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
              '0x0000000000000000000000000000000000000000000000000000000000000001',
              '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            ],
            data: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          },
        ],
      };

      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBeUndefined();
    });

    it('should find ComplexOpProcessed in multiple logs', () => {
      const nextRequestId = '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
      const receipt = {
        logs: [
          // First log: wrong event
          {
            topics: [
              '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
              '0x01',
              '0x02',
            ],
            data: '0x1234',
          },
          // Second log: not enough topics
          {
            topics: [COMPLEX_OP_PROCESSED_TOPIC],
            data: '0x1234',
          },
          // Third log: valid ComplexOpProcessed
          {
            topics: [
              COMPLEX_OP_PROCESSED_TOPIC,
              '0x0000000000000000000000000000000000000000000000000000000000000001',
              '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            ],
            data: nextRequestId + '00'.repeat(32),
          },
        ],
      };

      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBe(nextRequestId);
    });

    it('should skip logs with undefined topics', () => {
      const receipt = {
        logs: [
          {
            data: '0x1234',
          },
        ],
      };

      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBeUndefined();
    });

    it('should handle log with empty data', () => {
      const currentRequestId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const receipt = {
        logs: [
          {
            topics: [
              COMPLEX_OP_PROCESSED_TOPIC,
              '0x0000000000000000000000000000000000000000000000000000000000000001',
              currentRequestId,
            ],
            data: '',
          },
        ],
      };

      // With empty data, should fallback to currentRequestId
      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBe(currentRequestId);
    });

    it('should handle log with short data', () => {
      const currentRequestId = '0xabababababababababababababababababababababababababababababababab';
      const receipt = {
        logs: [
          {
            topics: [
              COMPLEX_OP_PROCESSED_TOPIC,
              '0x0000000000000000000000000000000000000000000000000000000000000001',
              currentRequestId,
            ],
            data: '0x1234', // Too short for nextRequestId
          },
        ],
      };

      // With short data, should fallback to currentRequestId
      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBe(currentRequestId);
    });

    it('should return undefined when both nextRequestId and currentRequestId are zero', () => {
      const receipt = {
        logs: [
          {
            topics: [
              COMPLEX_OP_PROCESSED_TOPIC,
              '0x0000000000000000000000000000000000000000000000000000000000000001',
              '0x' + '0'.repeat(64), // Zero currentRequestId
            ],
            data: '0x' + '0'.repeat(128), // Zero nextRequestId + padding
          },
        ],
      };

      const result = extractRequestIdFromLogs(receipt);
      expect(result).toBeUndefined();
    });

    it('should handle logs as non-array', () => {
      const receipt = {
        logs: 'not an array',
      };

      const result = extractRequestIdFromLogs(receipt as unknown as { logs?: unknown[] });
      expect(result).toBeUndefined();
    });
  });
});
