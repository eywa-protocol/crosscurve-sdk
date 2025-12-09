/**
 * @fileoverview Validation utilities
 */

import { ValidationError } from '../errors/index.js';

/**
 * Validate slippage value
 */
export function validateSlippage(slippage: number, maxSlippage?: number): void {
  if (slippage < 0) {
    throw new ValidationError('Slippage must be non-negative', 'slippage');
  }

  if (slippage > 100) {
    throw new ValidationError('Slippage cannot exceed 100%', 'slippage');
  }

  if (maxSlippage !== undefined && slippage > maxSlippage) {
    throw new ValidationError(
      `Slippage ${slippage}% exceeds maximum allowed ${maxSlippage}%`,
      'slippage'
    );
  }
}

/**
 * Validate amount string
 */
export function validateAmount(amount: string): void {
  if (!amount || amount === '0') {
    throw new ValidationError('Amount must be greater than 0', 'amount');
  }

  try {
    BigInt(amount);
  } catch {
    throw new ValidationError('Amount must be a valid number string', 'amount');
  }
}

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string, field = 'address'): void {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new ValidationError('Invalid Ethereum address', field);
  }
}

/**
 * Check if user has sufficient balance (warning only)
 */
export function checkBalance(
  userBalance: string,
  requiredAmount: string
): { sufficient: boolean; message?: string } {
  try {
    const balance = BigInt(userBalance);
    const required = BigInt(requiredAmount);

    if (balance < required) {
      return {
        sufficient: false,
        message: `Insufficient balance: have ${userBalance}, need ${requiredAmount}`,
      };
    }

    return { sufficient: true };
  } catch {
    return {
      sufficient: false,
      message: 'Invalid balance or amount format',
    };
  }
}
