/**
 * @fileoverview Quote type and entity unit tests
 */

import { describe, it, expect } from 'vitest';
import type { Quote } from '../../../src/types/quote.js';
import { QuoteEntity } from '../../../src/domain/entities/Quote.js';
import {
  crossChainQuote,
  sameChainQuote,
  rubicQuote,
  bungeeQuote,
  emptyRouteQuote,
  createMockQuote,
} from '../../fixtures/quotes.js';
import { QuoteSchema } from '../../../src/infrastructure/api/schemas/routeResponse.schema.js';

describe('Quote type', () => {
  describe('fixtures satisfy Quote interface', () => {
    const fixtures: [string, Quote][] = [
      ['crossChainQuote', crossChainQuote],
      ['sameChainQuote', sameChainQuote],
      ['rubicQuote', rubicQuote],
      ['bungeeQuote', bungeeQuote],
      ['emptyRouteQuote', emptyRouteQuote],
    ];

    it.each(fixtures)('%s has all required fields', (_name, quote) => {
      expect(quote.route).toBeDefined();
      expect(quote.amountIn).toBeDefined();
      expect(quote.amountOut).toBeDefined();
      expect(quote.deliveryFee).toBeDefined();
      expect(quote.deliveryFee.token).toBeDefined();
      expect(quote.deliveryFee.amount).toBeDefined();
      expect(typeof quote.deliveryFee.usd).toBe('number');
      expect(quote.txs).toBeDefined();
      expect(quote.signature).toBeDefined();
      expect(quote.amountOutWithoutSlippage).toBeDefined();
      expect(typeof quote.priceImpact).toBe('number');
      expect(typeof quote.tokenInPrice).toBe('number');
      expect(typeof quote.tokenOutPrice).toBe('number');
      expect(quote.sourceFee).toBeDefined();
      expect(quote.sourceFee.token).toBeDefined();
      expect(quote.totalFee).toBeDefined();
      expect(typeof quote.expectedFinalitySeconds).toBe('number');
      expect(typeof quote.deadline).toBe('number');
      expect(typeof quote.slippage).toBe('number');
    });

    it.each(fixtures)('%s passes Zod validation', (_name, quote) => {
      expect(() => QuoteSchema.parse(quote)).not.toThrow();
    });
  });

  describe('createMockQuote factory', () => {
    it('creates valid quote with defaults', () => {
      const quote = createMockQuote();
      expect(() => QuoteSchema.parse(quote)).not.toThrow();
    });

    it('allows overriding individual fields', () => {
      const quote = createMockQuote({ amountIn: '5000000', slippage: 2.0 });
      expect(quote.amountIn).toBe('5000000');
      expect(quote.slippage).toBe(2.0);
      // defaults remain
      expect(quote.amountOut).toBe('990000');
    });

    it('allows setting optional fields', () => {
      const quote = createMockQuote({
        feeShare: '100',
        feeShareRecipient: '0xabc',
        feeShareToken: '0xdef',
        runner: { address: '0x123', token: '0x456', deadline: 9999999 },
      });
      expect(quote.feeShare).toBe('100');
      expect(quote.feeShareRecipient).toBe('0xabc');
      expect(quote.feeShareToken).toBe('0xdef');
      expect(quote.runner?.address).toBe('0x123');
    });
  });

  describe('QuoteEntity', () => {
    it('copies all required fields from Quote data', () => {
      const entity = new QuoteEntity(crossChainQuote);
      expect(entity.route).toEqual(crossChainQuote.route);
      expect(entity.amountIn).toBe(crossChainQuote.amountIn);
      expect(entity.amountOut).toBe(crossChainQuote.amountOut);
      expect(entity.deliveryFee).toEqual(crossChainQuote.deliveryFee);
      expect(entity.txs).toEqual(crossChainQuote.txs);
      expect(entity.signature).toBe(crossChainQuote.signature);
      expect(entity.amountOutWithoutSlippage).toBe(crossChainQuote.amountOutWithoutSlippage);
      expect(entity.priceImpact).toBe(crossChainQuote.priceImpact);
      expect(entity.tokenInPrice).toBe(crossChainQuote.tokenInPrice);
      expect(entity.tokenOutPrice).toBe(crossChainQuote.tokenOutPrice);
      expect(entity.sourceFee).toEqual(crossChainQuote.sourceFee);
      expect(entity.totalFee).toEqual(crossChainQuote.totalFee);
      expect(entity.expectedFinalitySeconds).toBe(crossChainQuote.expectedFinalitySeconds);
      expect(entity.deadline).toBe(crossChainQuote.deadline);
      expect(entity.slippage).toBe(crossChainQuote.slippage);
    });

    it('copies optional fields when present', () => {
      const data = createMockQuote({
        feeShare: '50',
        feeShareRecipient: '0xrecipient',
        feeShareToken: '0xtoken',
        runner: { address: '0xrunner', token: '0xpay', deadline: 123456 },
      });
      const entity = new QuoteEntity(data);
      expect(entity.feeShare).toBe('50');
      expect(entity.feeShareRecipient).toBe('0xrecipient');
      expect(entity.feeShareToken).toBe('0xtoken');
      expect(entity.runner).toEqual({ address: '0xrunner', token: '0xpay', deadline: 123456 });
    });

    it('leaves optional fields undefined when absent', () => {
      const entity = new QuoteEntity(crossChainQuote);
      expect(entity.feeShare).toBeUndefined();
      expect(entity.feeShareRecipient).toBeUndefined();
      expect(entity.feeShareToken).toBeUndefined();
      expect(entity.runner).toBeUndefined();
    });

    it('does not share references with source data (immutability)', () => {
      const data = createMockQuote({
        runner: { address: '0x1', token: '0x2', deadline: 100 },
      });
      const entity = new QuoteEntity(data);

      // Mutating the source should not affect the entity
      data.deliveryFee.amount = 'MUTATED';
      data.sourceFee.amount = 'MUTATED';
      data.runner!.address = 'MUTATED';

      expect(entity.deliveryFee.amount).not.toBe('MUTATED');
      expect(entity.sourceFee.amount).not.toBe('MUTATED');
      expect(entity.runner!.address).not.toBe('MUTATED');
    });

    it('preserves existing entity behavior (isCrossChain, isSameChain)', () => {
      const crossEntity = new QuoteEntity(crossChainQuote);
      expect(crossEntity.isCrossChain()).toBe(true);
      expect(crossEntity.isSameChain()).toBe(false);

      const sameEntity = new QuoteEntity(sameChainQuote);
      expect(sameEntity.isCrossChain()).toBe(false);
      expect(sameEntity.isSameChain()).toBe(true);
    });
  });

  describe('Zod schema validation', () => {
    it('rejects quote missing new required fields', () => {
      const incomplete = {
        route: [],
        amountIn: '100',
        amountOut: '90',
        deliveryFee: { amount: '10', usd: 0.01 },
        txs: [],
        signature: '0x',
      };
      expect(() => QuoteSchema.parse(incomplete)).toThrow();
    });

    it('accepts quote with optional runner', () => {
      const quote = createMockQuote({
        runner: { address: '0x1', token: '0x2', deadline: 999 },
      });
      expect(() => QuoteSchema.parse(quote)).not.toThrow();
    });

    it('accepts quote with optional fee share fields', () => {
      const quote = createMockQuote({
        feeShare: '100',
        feeShareRecipient: '0xabc',
        feeShareToken: '0xdef',
      });
      expect(() => QuoteSchema.parse(quote)).not.toThrow();
    });

    it('validates deliveryFee requires token field', () => {
      const quote = createMockQuote();
      const raw = { ...quote, deliveryFee: { amount: '100', usd: 0.01 } };
      expect(() => QuoteSchema.parse(raw)).toThrow();
    });

    it('validates sourceFee requires token field', () => {
      const quote = createMockQuote();
      const raw = { ...quote, sourceFee: { amount: '100', usd: 0.01 } };
      expect(() => QuoteSchema.parse(raw)).toThrow();
    });
  });
});
