/**
 * Unit tests for PricesScope (Tier 2 API)
 */

import { describe, it, expect, vi } from 'vitest';
import { PricesScope } from '../../../../src/application/scopes/PricesScope.js';

describe('PricesScope', () => {
  it('returns token price as string', async () => {
    const mockApi = { getPrice: vi.fn().mockResolvedValue('1.05') };
    const scope = new PricesScope(mockApi);
    const price = await scope.get('0xUSDC', 42161);
    expect(price).toBe('1.05');
    expect(mockApi.getPrice).toHaveBeenCalledWith('0xUSDC', 42161);
  });
});
