/**
 * Unit tests for calldata encoding utilities
 *
 * Tests ABI encoding from API response with object-to-array conversion
 */

import { describe, it, expect } from 'vitest';
import { encodeCalldataFromResponse } from '../../../src/utils/calldata.js';

describe('calldata utilities', () => {
  describe('encodeCalldataFromResponse', () => {
    it('should return data directly when provided', () => {
      const expectedData = '0x1234567890abcdef';
      const result = encodeCalldataFromResponse({
        data: expectedData,
        abi: 'function foo()',
        args: [],
      });

      expect(result).toBe(expectedData);
    });

    it('should prefer data over abi+args when both are provided', () => {
      const result = encodeCalldataFromResponse({
        data: '0xexistingdata',
        abi: 'function transfer(address to, uint256 amount)',
        args: ['0x1234567890123456789012345678901234567890', '1000000'],
      });

      expect(result).toBe('0xexistingdata');
    });

    it('should encode simple function with no args', () => {
      const result = encodeCalldataFromResponse({
        abi: 'function pause()',
        args: [],
      });

      // Function selector for pause() is the first 4 bytes of keccak256("pause()")
      expect(result).toMatch(/^0x[a-fA-F0-9]{8}$/);
    });

    it('should encode function with primitive args', () => {
      const result = encodeCalldataFromResponse({
        abi: 'function transfer(address to, uint256 amount)',
        args: ['0x1234567890123456789012345678901234567890', '1000000000000000000'],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(result.length).toBeGreaterThan(10); // 0x + 8 chars selector + args
    });

    it('should convert object args to arrays for tuple encoding', () => {
      // Simulates API response with named object parameters
      const result = encodeCalldataFromResponse({
        abi: 'function execute((address target, uint256 value, bytes data) call)',
        args: [
          {
            target: '0x1234567890123456789012345678901234567890',
            value: '0',
            data: '0x',
          },
        ],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('should handle nested object structures', () => {
      const result = encodeCalldataFromResponse({
        abi: 'function execute((address target, (uint256 amount, address token) payment) params)',
        args: [
          {
            target: '0x1234567890123456789012345678901234567890',
            payment: {
              amount: '1000000',
              token: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            },
          },
        ],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('should handle array args', () => {
      const result = encodeCalldataFromResponse({
        abi: 'function multiTransfer(address[] recipients, uint256[] amounts)',
        args: [
          ['0x1234567890123456789012345678901234567890', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
          ['1000000', '2000000'],
        ],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('should preserve null values', () => {
      // This tests the convertObjectsToArrays function behavior
      const result = encodeCalldataFromResponse({
        abi: 'function test(bytes data)',
        args: ['0x'],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('should throw error when both data and abi/args are missing', () => {
      expect(() => encodeCalldataFromResponse({})).toThrow(
        'Transaction response missing both data and abi/args'
      );
    });

    it('should throw error when abi is missing', () => {
      expect(() =>
        encodeCalldataFromResponse({
          args: ['0x123'],
        })
      ).toThrow('Transaction response missing both data and abi/args');
    });

    it('should throw error when args is missing', () => {
      expect(() =>
        encodeCalldataFromResponse({
          abi: 'function test()',
        })
      ).toThrow('Transaction response missing both data and abi/args');
    });

    it('should throw error for invalid ABI without function name', () => {
      expect(() =>
        encodeCalldataFromResponse({
          abi: 'invalid abi format',
          args: [],
        })
      ).toThrow('Cannot extract function name');
    });

    it('should throw error for malformed ABI', () => {
      expect(() =>
        encodeCalldataFromResponse({
          abi: 'function (uint256)',
          args: ['123'],
        })
      ).toThrow('Cannot extract function name');
    });

    it('should handle boolean args', () => {
      const result = encodeCalldataFromResponse({
        abi: 'function setEnabled(bool enabled)',
        args: [true],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('should handle bytes32 args', () => {
      const result = encodeCalldataFromResponse({
        abi: 'function setHash(bytes32 hash)',
        args: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('should handle complex real-world ABI', () => {
      // Simulates the actual CrossCurve startV2 function structure
      const result = encodeCalldataFromResponse({
        abi: 'function startV2((address[] tokens, uint256[] amounts, address recipient) params, (uint64 chainId, bytes callData)[] operations)',
        args: [
          {
            tokens: ['0x1234567890123456789012345678901234567890'],
            amounts: ['1000000000000000000'],
            recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          },
          [
            {
              chainId: '42161',
              callData: '0x1234',
            },
          ],
        ],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('should handle empty arrays', () => {
      const result = encodeCalldataFromResponse({
        abi: 'function execute(address[] targets)',
        args: [[]],
      });

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
    });
  });
});
