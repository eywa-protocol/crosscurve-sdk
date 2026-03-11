import { describe, it, expect, beforeAll } from 'vitest';
import { CrossCurveSDK } from '../../../src/index.js';
import { getAccount } from '../helpers/wallet.js';

describe('tracking integration', () => {
  let sdk: CrossCurveSDK;
  const account = getAccount();

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: process.env.E2E_API_BASE_URL,
      apiKey: process.env.E2E_API_KEY,
    });
    await sdk.init();
  });

  describe('searchTransactions', () => {
    it('should return array for a wallet address', async () => {
      const results = await sdk.searchTransactions(account.address);
      expect(results).toBeInstanceOf(Array);
      // May be empty if wallet has no transactions, but should not throw
    });
  });

  describe('history', () => {
    it('should return array for a wallet address', async () => {
      const results = await sdk.tracking.history(account.address);
      expect(results).toBeInstanceOf(Array);
    });
  });
});
