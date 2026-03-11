import { describe, it, expect } from 'vitest';
import { detectAddressType, isValidAddress, normalizeAddress } from '../../../src/utils/address.js';

describe('detectAddressType', () => {
  it('detects EVM addresses', () => {
    expect(detectAddressType('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD50')).toBe('evm');
  });

  it('detects Tron addresses', () => {
    expect(detectAddressType('TJYJx5eKXMa9LPMz5VgRzYHjZ3jGxGqRXh')).toBe('tron');
  });

  it('detects Solana addresses', () => {
    expect(detectAddressType('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')).toBe('solana');
  });

  it('returns null for invalid addresses', () => {
    expect(detectAddressType('')).toBeNull();
    expect(detectAddressType('hello')).toBeNull();
  });
});

describe('isValidAddress', () => {
  it('validates EVM addresses', () => {
    expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD50')).toBe(true);
    expect(isValidAddress('0xinvalid')).toBe(false);
  });

  it('validates Tron addresses', () => {
    expect(isValidAddress('TJYJx5eKXMa9LPMz5VgRzYHjZ3jGxGqRXh')).toBe(true);
    expect(isValidAddress('T')).toBe(false);
  });

  it('validates Solana addresses', () => {
    expect(isValidAddress('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')).toBe(true);
  });
});

describe('normalizeAddress', () => {
  it('lowercases EVM addresses', () => {
    expect(normalizeAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD50'))
      .toBe('0x742d35cc6634c0532925a3b844bc9e7595f2bd50');
  });

  it('preserves case for Tron addresses', () => {
    expect(normalizeAddress('TJYJx5eKXMa9LPMz5VgRzYHjZ3jGxGqRXh'))
      .toBe('TJYJx5eKXMa9LPMz5VgRzYHjZ3jGxGqRXh');
  });

  it('preserves case for Solana addresses', () => {
    expect(normalizeAddress('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV'))
      .toBe('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV');
  });
});
