/**
 * @fileoverview Error classes unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  BaseError,
  ValidationError,
  InvalidQuoteError,
  InsufficientBalanceError,
  SlippageExceededError,
  TransactionError,
  RecoveryUnavailableError,
  TimeoutError,
} from '../../../src/errors/index.js';

describe('Error Classes', () => {
  describe('BaseError', () => {
    it('should create error with message', () => {
      const error = new BaseError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('BaseError');
    });

    it('should extend Error', () => {
      const error = new BaseError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should have stack trace', () => {
      const error = new BaseError('Test');
      expect(error.stack).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should create error with message and code', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should include field name when provided', () => {
      const error = new ValidationError('Invalid value', 'slippage');
      expect(error.field).toBe('slippage');
    });

    it('should extend BaseError', () => {
      const error = new ValidationError('Test');
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should work without field', () => {
      const error = new ValidationError('General validation error');
      expect(error.field).toBeUndefined();
    });
  });

  describe('InvalidQuoteError', () => {
    it('should create error with message and code', () => {
      const error = new InvalidQuoteError('Quote expired');
      expect(error.message).toBe('Quote expired');
      expect(error.code).toBe('INVALID_QUOTE');
      expect(error.name).toBe('InvalidQuoteError');
    });

    it('should include details when provided', () => {
      const details = { quoteId: '123', reason: 'expired' };
      const error = new InvalidQuoteError('Quote invalid', details);
      expect(error.details).toEqual(details);
    });

    it('should extend BaseError', () => {
      const error = new InvalidQuoteError('Test');
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(InvalidQuoteError);
    });

    it('should work without details', () => {
      const error = new InvalidQuoteError('No route found');
      expect(error.details).toBeUndefined();
    });
  });

  describe('InsufficientBalanceError', () => {
    it('should create error with required and available amounts', () => {
      const error = new InsufficientBalanceError(
        'Insufficient USDC balance',
        '1000000',
        '500000'
      );
      expect(error.message).toBe('Insufficient USDC balance');
      expect(error.code).toBe('INSUFFICIENT_BALANCE');
      expect(error.name).toBe('InsufficientBalanceError');
      expect(error.required).toBe('1000000');
      expect(error.available).toBe('500000');
    });

    it('should extend BaseError', () => {
      const error = new InsufficientBalanceError('Test', '100', '0');
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(InsufficientBalanceError);
    });

    it('should handle large amounts', () => {
      const error = new InsufficientBalanceError(
        'Insufficient ETH',
        '1000000000000000000000',
        '100000000000000000'
      );
      expect(error.required).toBe('1000000000000000000000');
      expect(error.available).toBe('100000000000000000');
    });
  });

  describe('SlippageExceededError', () => {
    it('should create error with requested and maximum slippage', () => {
      const error = new SlippageExceededError(
        'Slippage too high',
        5.0,
        3.0
      );
      expect(error.message).toBe('Slippage too high');
      expect(error.code).toBe('SLIPPAGE_EXCEEDED');
      expect(error.name).toBe('SlippageExceededError');
      expect(error.requested).toBe(5.0);
      expect(error.maximum).toBe(3.0);
    });

    it('should extend BaseError', () => {
      const error = new SlippageExceededError('Test', 10, 5);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(SlippageExceededError);
    });

    it('should handle decimal slippage values', () => {
      const error = new SlippageExceededError('Slippage exceeded', 0.75, 0.5);
      expect(error.requested).toBe(0.75);
      expect(error.maximum).toBe(0.5);
    });
  });

  describe('TransactionError', () => {
    it('should create error with message and code', () => {
      const error = new TransactionError('Transaction failed');
      expect(error.message).toBe('Transaction failed');
      expect(error.code).toBe('TRANSACTION_ERROR');
      expect(error.name).toBe('TransactionError');
    });

    it('should include transaction hash when provided', () => {
      const error = new TransactionError(
        'Transaction reverted',
        '0x1234567890abcdef'
      );
      expect(error.transactionHash).toBe('0x1234567890abcdef');
    });

    it('should include reason when provided', () => {
      const error = new TransactionError(
        'Transaction failed',
        '0xabc',
        'Out of gas'
      );
      expect(error.reason).toBe('Out of gas');
    });

    it('should extend BaseError', () => {
      const error = new TransactionError('Test');
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(TransactionError);
    });

    it('should work without optional parameters', () => {
      const error = new TransactionError('Transaction error');
      expect(error.transactionHash).toBeUndefined();
      expect(error.reason).toBeUndefined();
    });
  });

  describe('RecoveryUnavailableError', () => {
    it('should create error with request ID', () => {
      const error = new RecoveryUnavailableError(
        'No recovery available',
        '0xrequest123'
      );
      expect(error.message).toBe('No recovery available');
      expect(error.code).toBe('RECOVERY_UNAVAILABLE');
      expect(error.name).toBe('RecoveryUnavailableError');
      expect(error.requestId).toBe('0xrequest123');
    });

    it('should include reason when provided', () => {
      const error = new RecoveryUnavailableError(
        'Recovery not available',
        '0xrequest',
        'Transaction already completed'
      );
      expect(error.reason).toBe('Transaction already completed');
    });

    it('should extend BaseError', () => {
      const error = new RecoveryUnavailableError('Test', '0x123');
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(RecoveryUnavailableError);
    });

    it('should work without reason', () => {
      const error = new RecoveryUnavailableError('No recovery', '0xabc');
      expect(error.reason).toBeUndefined();
    });
  });

  describe('TimeoutError', () => {
    it('should create error with operation and timeout', () => {
      const error = new TimeoutError(
        'Operation timed out',
        'fetchQuote',
        30000
      );
      expect(error.message).toBe('Operation timed out');
      expect(error.code).toBe('TIMEOUT');
      expect(error.name).toBe('TimeoutError');
      expect(error.operation).toBe('fetchQuote');
      expect(error.timeoutMs).toBe(30000);
    });

    it('should extend BaseError', () => {
      const error = new TimeoutError('Test', 'test', 1000);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should handle various timeout values', () => {
      const error = new TimeoutError('Polling timeout', 'waitForConfirmation', 300000);
      expect(error.timeoutMs).toBe(300000);
    });
  });

  describe('Error hierarchy', () => {
    it('all errors should be catchable as Error', () => {
      const errors = [
        new BaseError('base'),
        new ValidationError('validation'),
        new InvalidQuoteError('quote'),
        new InsufficientBalanceError('balance', '100', '50'),
        new SlippageExceededError('slippage', 5, 3),
        new TransactionError('tx'),
        new RecoveryUnavailableError('recovery', '0x123'),
        new TimeoutError('timeout', 'op', 1000),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('all errors should have distinct names', () => {
      const errors = [
        new BaseError('base'),
        new ValidationError('validation'),
        new InvalidQuoteError('quote'),
        new InsufficientBalanceError('balance', '100', '50'),
        new SlippageExceededError('slippage', 5, 3),
        new TransactionError('tx'),
        new RecoveryUnavailableError('recovery', '0x123'),
        new TimeoutError('timeout', 'op', 1000),
      ];

      const names = errors.map((e) => e.name);
      const uniqueNames = [...new Set(names)];
      expect(uniqueNames).toHaveLength(errors.length);
    });

    it('all SDK errors should extend BaseError', () => {
      const errors = [
        new ValidationError('validation'),
        new InvalidQuoteError('quote'),
        new InsufficientBalanceError('balance', '100', '50'),
        new SlippageExceededError('slippage', 5, 3),
        new TransactionError('tx'),
        new RecoveryUnavailableError('recovery', '0x123'),
        new TimeoutError('timeout', 'op', 1000),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(BaseError);
      });
    });
  });

  describe('Error codes', () => {
    it('should have unique error codes', () => {
      const errorCodes = [
        new ValidationError('v').code,
        new InvalidQuoteError('q').code,
        new InsufficientBalanceError('b', '1', '0').code,
        new SlippageExceededError('s', 1, 0).code,
        new TransactionError('t').code,
        new RecoveryUnavailableError('r', 'id').code,
        new TimeoutError('t', 'op', 0).code,
      ];

      const uniqueCodes = [...new Set(errorCodes)];
      expect(uniqueCodes).toHaveLength(errorCodes.length);
    });

    it('error codes should be uppercase strings', () => {
      const errors = [
        new ValidationError('v'),
        new InvalidQuoteError('q'),
        new InsufficientBalanceError('b', '1', '0'),
        new SlippageExceededError('s', 1, 0),
        new TransactionError('t'),
        new RecoveryUnavailableError('r', 'id'),
        new TimeoutError('t', 'op', 0),
      ];

      errors.forEach((error) => {
        expect(error.code).toBe(error.code.toUpperCase());
        expect(error.code).toMatch(/^[A-Z_]+$/);
      });
    });
  });
});
