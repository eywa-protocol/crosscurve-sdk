import { describe, it, expect, beforeAll } from 'vitest';
import { CrossCurveSDK } from '../../../src/index.js';
import { TESTNET_TOKENS, TESTNET_CHAINS } from '../helpers/tokens.js';

describe('prices integration', () => {
  let sdk: CrossCurveSDK;

  beforeAll(async () => {
    sdk = new CrossCurveSDK({
      baseUrl: process.env.E2E_API_BASE_URL,
      apiKey: process.env.E2E_API_KEY,
    });
    await sdk.init();
  });

  it('should return price for Sepolia USDT', async () => {
    const price = await sdk.prices.get(
      TESTNET_TOKENS.SEPOLIA_USDT.address,
      TESTNET_CHAINS.SEPOLIA,
    );

    expect(price).toBeTruthy();
    expect(typeof price).toBe('string');
    // USDT price should be roughly $1, but testnet may differ
    // Just verify we got a parseable number
    expect(Number(price)).not.toBeNaN();
  });
});
