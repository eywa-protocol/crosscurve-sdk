/**
 * Unit tests for permit utilities
 *
 * Tests EIP-2612 permit signature creation and parsing
 */

import { describe, it, expect } from 'vitest';
import {
  createPermitTypedData,
  parsePermitSignature,
  isNativeToken,
  PERMIT_TYPES,
} from '../../../src/utils/permit.js';

describe('permit utilities', () => {
  describe('PERMIT_TYPES', () => {
    it('should have correct EIP-2612 permit type structure', () => {
      expect(PERMIT_TYPES.Permit).toHaveLength(5);
      expect(PERMIT_TYPES.Permit).toEqual([
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ]);
    });
  });

  describe('createPermitTypedData', () => {
    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: 1,
      verifyingContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };

    it('should create correct typed data structure', () => {
      const result = createPermitTypedData(
        domain,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        BigInt('1000000'),
        BigInt(0),
        1700000000
      );

      expect(result.domain).toEqual(domain);
      expect(result.types).toEqual(PERMIT_TYPES);
      expect(result.primaryType).toBe('Permit');
    });

    it('should set message fields correctly', () => {
      const owner = '0x1234567890123456789012345678901234567890';
      const spender = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const value = BigInt('1000000000000000000');
      const nonce = BigInt(5);
      const deadline = 1700000000;

      const result = createPermitTypedData(domain, owner, spender, value, nonce, deadline);

      expect(result.message.owner).toBe(owner);
      expect(result.message.spender).toBe(spender);
      expect(result.message.value).toBe(value);
      expect(result.message.nonce).toBe(nonce);
      expect(result.message.deadline).toBe(BigInt(deadline));
    });

    it('should convert deadline to BigInt', () => {
      const result = createPermitTypedData(
        domain,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        BigInt('1000000'),
        BigInt(0),
        1700000000
      );

      expect(typeof result.message.deadline).toBe('bigint');
    });

    it('should handle zero values', () => {
      const result = createPermitTypedData(
        domain,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        BigInt(0),
        BigInt(0),
        0
      );

      expect(result.message.value).toBe(BigInt(0));
      expect(result.message.nonce).toBe(BigInt(0));
      expect(result.message.deadline).toBe(BigInt(0));
    });

    it('should handle max uint256 values', () => {
      const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      const result = createPermitTypedData(
        domain,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        maxUint256,
        maxUint256,
        Number.MAX_SAFE_INTEGER
      );

      expect(result.message.value).toBe(maxUint256);
      expect(result.message.nonce).toBe(maxUint256);
    });
  });

  describe('parsePermitSignature', () => {
    it('should parse valid 65-byte signature with v=27', () => {
      // r (32 bytes) + s (32 bytes) + v (1 byte = 27 = 0x1b)
      const signature =
        '0x' +
        'a'.repeat(64) + // r
        'b'.repeat(64) + // s
        '1b'; // v = 27

      const result = parsePermitSignature(signature);

      expect(result.r).toBe('0x' + 'a'.repeat(64));
      expect(result.s).toBe('0x' + 'b'.repeat(64));
      expect(result.v).toBe(27);
    });

    it('should parse valid signature with v=28', () => {
      const signature =
        '0x' +
        'c'.repeat(64) +
        'd'.repeat(64) +
        '1c'; // v = 28

      const result = parsePermitSignature(signature);

      expect(result.r).toBe('0x' + 'c'.repeat(64));
      expect(result.s).toBe('0x' + 'd'.repeat(64));
      expect(result.v).toBe(28);
    });

    it('should normalize v=0 to v=27', () => {
      const signature =
        '0x' +
        'e'.repeat(64) +
        'f'.repeat(64) +
        '00'; // v = 0

      const result = parsePermitSignature(signature);

      expect(result.v).toBe(27);
    });

    it('should normalize v=1 to v=28', () => {
      const signature =
        '0x' +
        '1'.repeat(64) +
        '2'.repeat(64) +
        '01'; // v = 1

      const result = parsePermitSignature(signature);

      expect(result.v).toBe(28);
    });

    it('should parse signature without 0x prefix', () => {
      const signature =
        '3'.repeat(64) +
        '4'.repeat(64) +
        '1b';

      const result = parsePermitSignature(signature);

      expect(result.r).toBe('0x' + '3'.repeat(64));
      expect(result.s).toBe('0x' + '4'.repeat(64));
      expect(result.v).toBe(27);
    });

    it('should set deadline to 0 (caller must set)', () => {
      const signature = '0x' + '5'.repeat(64) + '6'.repeat(64) + '1b';
      const result = parsePermitSignature(signature);

      expect(result.deadline).toBe(0);
    });

    it('should throw error for signature too short', () => {
      const signature = '0x' + 'a'.repeat(128); // Missing v byte

      expect(() => parsePermitSignature(signature)).toThrow('Invalid signature length');
    });

    it('should throw error for signature too long', () => {
      const signature = '0x' + 'a'.repeat(132); // Extra bytes

      expect(() => parsePermitSignature(signature)).toThrow('Invalid signature length');
    });

    it('should throw error for empty signature', () => {
      expect(() => parsePermitSignature('')).toThrow('Invalid signature length');
      expect(() => parsePermitSignature('0x')).toThrow('Invalid signature length');
    });

    it('should throw error for non-hex characters', () => {
      const signature = '0x' + 'g'.repeat(64) + 'h'.repeat(64) + '1b';

      expect(() => parsePermitSignature(signature)).toThrow('non-hex characters');
    });

    it('should throw error for invalid v value', () => {
      const signature = '0x' + 'a'.repeat(64) + 'b'.repeat(64) + 'ff'; // v = 255

      expect(() => parsePermitSignature(signature)).toThrow('Invalid signature v value');
    });

    it('should handle real-world signature', () => {
      // Example signature from actual permit signing (65 bytes = 130 hex chars)
      const signature =
        '0x7b2e1c5e6a8f4d3c9b0a1e2d4f6c8a0b3e5d7f9a1c3e5b7d9f1a3c5e7b9d1f3e' +
        '5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3e5a7c9e1b3d5f7a' +
        '1b';

      const result = parsePermitSignature(signature);

      expect(result.r).toHaveLength(66); // 0x + 64 hex chars
      expect(result.s).toHaveLength(66);
      expect(result.v).toBe(27);
    });
  });

  describe('isNativeToken', () => {
    it('should return true for zero address', () => {
      expect(isNativeToken('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should return true for 0xEEEE address (lowercase)', () => {
      expect(isNativeToken('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')).toBe(true);
    });

    it('should return true for 0xEEEE address (uppercase)', () => {
      expect(isNativeToken('0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE')).toBe(true);
    });

    it('should return true for 0xEEEE address (mixed case)', () => {
      expect(isNativeToken('0xEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEe')).toBe(true);
    });

    it('should return false for regular token address', () => {
      // USDC on Ethereum
      expect(isNativeToken('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')).toBe(false);
    });

    it('should return false for WETH address', () => {
      // WETH is not native, it's wrapped
      expect(isNativeToken('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')).toBe(false);
    });

    it('should return false for address with only some zeros', () => {
      expect(isNativeToken('0x0000000000000000000000000000000000000001')).toBe(false);
    });

    it('should return false for address with only some Es', () => {
      expect(isNativeToken('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeef')).toBe(false);
    });

    it('should be case insensitive for 0xEEEE pattern', () => {
      // The function uses toLowerCase() for 0xEEEE comparison
      expect(isNativeToken('0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE')).toBe(true);
      expect(isNativeToken('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isNativeToken('')).toBe(false);
    });
  });
});
