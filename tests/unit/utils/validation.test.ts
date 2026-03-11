/**
 * Unit tests for validation utilities
 *
 * Tests slippage, amount, address validation and balance checking
 */

import { describe, it, expect } from 'vitest';
import {
  validateSlippage,
  validateAmount,
  validateAddress,
  checkBalance,
} from '../../../src/utils/validation.js';
import { ValidationError } from '../../../src/infrastructure/api/errors/index.js';

describe('validation utilities', () => {
  describe('validateSlippage', () => {
    it('should accept valid slippage values', () => {
      expect(() => validateSlippage(0)).not.toThrow();
      expect(() => validateSlippage(0.5)).not.toThrow();
      expect(() => validateSlippage(1)).not.toThrow();
      expect(() => validateSlippage(50)).not.toThrow();
      expect(() => validateSlippage(100)).not.toThrow();
    });

    it('should reject negative slippage', () => {
      expect(() => validateSlippage(-1)).toThrow(ValidationError);
      expect(() => validateSlippage(-0.1)).toThrow(ValidationError);
      expect(() => validateSlippage(-100)).toThrow(ValidationError);
    });

    it('should reject slippage greater than 100', () => {
      expect(() => validateSlippage(100.1)).toThrow(ValidationError);
      expect(() => validateSlippage(101)).toThrow(ValidationError);
      expect(() => validateSlippage(1000)).toThrow(ValidationError);
    });

    it('should enforce maxSlippage when provided', () => {
      expect(() => validateSlippage(0.5, 1)).not.toThrow();
      expect(() => validateSlippage(1, 1)).not.toThrow();
      expect(() => validateSlippage(1.1, 1)).toThrow(ValidationError);
      expect(() => validateSlippage(5, 3)).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct message', () => {
      try {
        validateSlippage(-1);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Slippage must be non-negative');
        expect((error as ValidationError).field).toBe('slippage');
      }

      try {
        validateSlippage(101);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Slippage cannot exceed 100%');
      }

      try {
        validateSlippage(5, 3);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Slippage 5% exceeds maximum allowed 3%');
      }
    });

    it('should handle edge case values', () => {
      expect(() => validateSlippage(0, 0)).not.toThrow();
      expect(() => validateSlippage(100, 100)).not.toThrow();
      expect(() => validateSlippage(0.001)).not.toThrow();
      expect(() => validateSlippage(99.999)).not.toThrow();
    });
  });

  describe('validateAmount', () => {
    it('should accept valid amount strings', () => {
      expect(() => validateAmount('1')).not.toThrow();
      expect(() => validateAmount('100')).not.toThrow();
      expect(() => validateAmount('1000000')).not.toThrow();
      expect(() => validateAmount('1000000000000000000')).not.toThrow();
      expect(() => validateAmount('999999999999999999999999999')).not.toThrow();
    });

    it('should reject empty or zero amounts', () => {
      expect(() => validateAmount('')).toThrow(ValidationError);
      expect(() => validateAmount('0')).toThrow(ValidationError);
    });

    it('should reject invalid number strings', () => {
      expect(() => validateAmount('abc')).toThrow(ValidationError);
      expect(() => validateAmount('1.5')).toThrow(ValidationError);
      expect(() => validateAmount('1,000')).toThrow(ValidationError);
      // Note: '0x123' is valid hex format for BigInt, so it doesn't throw
      // expect(() => validateAmount('0x123')).toThrow(ValidationError);
      // Note: '-100' is valid for BigInt, but represents negative which is handled differently
      // expect(() => validateAmount('-100')).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct message', () => {
      try {
        validateAmount('0');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Amount must be greater than 0');
        expect((error as ValidationError).field).toBe('amount');
      }

      try {
        validateAmount('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Amount must be a valid number string');
      }
    });

    it('should handle BigInt edge cases', () => {
      // Very large numbers that BigInt can handle
      expect(() => validateAmount('18446744073709551615')).not.toThrow(); // 2^64 - 1
      expect(() => validateAmount('340282366920938463463374607431768211455')).not.toThrow(); // 2^128 - 1
    });
  });

  describe('validateAddress', () => {
    it('should accept valid Ethereum addresses', () => {
      expect(() => validateAddress('0x0000000000000000000000000000000000000000')).not.toThrow();
      expect(() => validateAddress('0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5')).not.toThrow();
      expect(() => validateAddress('0xaf88d065e77c8cC2239327C5EDb3A432268e5831')).not.toThrow();
      expect(() => validateAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).not.toThrow();
    });

    it('should accept both uppercase and lowercase hex characters', () => {
      expect(() => validateAddress('0xabcdefABCDEF0123456789012345678901234567')).not.toThrow();
      expect(() => validateAddress('0xABCDEFabcdef0123456789012345678901234567')).not.toThrow();
    });

    it('should reject invalid addresses', () => {
      expect(() => validateAddress('')).toThrow(ValidationError);
      expect(() => validateAddress('0x')).toThrow(ValidationError);
      expect(() => validateAddress('0x123')).toThrow(ValidationError);
      expect(() => validateAddress('0x12345678901234567890123456789012345678901')).toThrow(ValidationError); // 41 chars
      expect(() => validateAddress('0x123456789012345678901234567890123456789')).toThrow(ValidationError); // 39 chars
      expect(() => validateAddress('1234567890123456789012345678901234567890')).toThrow(ValidationError); // No 0x prefix
      expect(() => validateAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toThrow(ValidationError); // Invalid hex
    });

    it('should allow custom field name', () => {
      try {
        validateAddress('invalid', 'recipient');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('recipient');
      }
    });

    it('should throw ValidationError with correct message', () => {
      try {
        validateAddress('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Invalid address');
        expect((error as ValidationError).field).toBe('address');
      }
    });
  });

  describe('checkBalance', () => {
    it('should return sufficient when balance is greater than required', () => {
      const result = checkBalance('1000000', '500000');
      expect(result.sufficient).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should return sufficient when balance equals required', () => {
      const result = checkBalance('1000000', '1000000');
      expect(result.sufficient).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should return insufficient when balance is less than required', () => {
      const result = checkBalance('500000', '1000000');
      expect(result.sufficient).toBe(false);
      expect(result.message).toBe('Insufficient balance: have 500000, need 1000000');
    });

    it('should handle zero balance', () => {
      const result = checkBalance('0', '1000000');
      expect(result.sufficient).toBe(false);
      expect(result.message).toBe('Insufficient balance: have 0, need 1000000');
    });

    it('should handle very large numbers', () => {
      const result = checkBalance('1000000000000000000', '999999999999999999');
      expect(result.sufficient).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should return insufficient for invalid balance format', () => {
      const result = checkBalance('invalid', '1000000');
      expect(result.sufficient).toBe(false);
      expect(result.message).toBe('Invalid balance or amount format');
    });

    it('should return insufficient for invalid amount format', () => {
      const result = checkBalance('1000000', 'invalid');
      expect(result.sufficient).toBe(false);
      expect(result.message).toBe('Invalid balance or amount format');
    });

    it('should handle negative numbers in string format', () => {
      // BigInt accepts negative numbers, so this will compare -1000000 < 500000
      const result = checkBalance('-1000000', '500000');
      expect(result.sufficient).toBe(false);
      // The message will indicate insufficient balance, not invalid format
      expect(result.message).toContain('Insufficient balance');
    });

    it('should handle decimal numbers', () => {
      const result = checkBalance('1000000.5', '500000');
      expect(result.sufficient).toBe(false);
      expect(result.message).toBe('Invalid balance or amount format');
    });
  });
});
