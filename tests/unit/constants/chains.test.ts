/**
 * Unit tests for chain constants and CAIP-2 generation
 */

import { describe, it, expect } from 'vitest';
import { ChainId } from '../../../src/constants/chains.js';
import { toCaip2 } from '../../../src/infrastructure/api/endpoints/networks.js';

describe('ChainId', () => {
  it('includes Solana and Tron', () => {
    expect(ChainId.SOLANA).toBe(7565164);
    expect(ChainId.TRON).toBe(728126428);
  });
});

describe('toCaip2', () => {
  it('generates correct CAIP-2 for non-EVM chains', () => {
    expect(toCaip2(7565164)).toBe('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    expect(toCaip2(728126428)).toBe('tron:mainnet');
    expect(toCaip2(42161)).toBe('eip155:42161');
  });

  it('generates eip155 prefix for all EVM chains', () => {
    expect(toCaip2(1)).toBe('eip155:1');
    expect(toCaip2(56)).toBe('eip155:56');
    expect(toCaip2(8453)).toBe('eip155:8453');
  });
});
