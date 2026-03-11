/**
 * @fileoverview Multi-format address detection and validation
 *
 * Supports EVM (0x-prefixed), Tron (T-prefixed base58), and Solana (base58) addresses.
 */

export type AddressType = 'evm' | 'solana' | 'tron';

const EVM_REGEX = /^0x[a-fA-F0-9]{40}$/;
const BASE58_CHARS = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

export function detectAddressType(address: string): AddressType | null {
  if (!address || address.length < 2) return null;

  if (address.startsWith('0x')) {
    return EVM_REGEX.test(address) ? 'evm' : null;
  }

  if (address.startsWith('T') && address.length === 34 && BASE58_CHARS.test(address)) {
    return 'tron';
  }

  // Solana: base58, 32-44 chars, explicitly NOT starting with 'T' (Tron guard above handles T)
  if (address.length >= 32 && address.length <= 44 && !address.startsWith('T') && BASE58_CHARS.test(address)) {
    return 'solana';
  }

  return null;
}

export function isValidAddress(address: string): boolean {
  return detectAddressType(address) !== null;
}

export function normalizeAddress(address: string): string {
  const type = detectAddressType(address);
  if (type === 'evm') return address.toLowerCase();
  return address; // preserve case for non-EVM
}
