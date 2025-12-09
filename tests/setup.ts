/**
 * Vitest test setup file
 *
 * Configures global test environment
 */

import { vi } from 'vitest';

// Only mock fetch for unit tests, not E2E
// E2E tests need real fetch to hit the API

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Reset all mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});

// Test environment configuration
export const TEST_CONFIG = {
  apiBaseUrl: 'https://api.crosscurve.fi',
  testWalletAddress: '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
  testMnemonic: 'YOUR_TEST_MNEMONIC_HERE',
};

// Supported test chains
export const TEST_CHAINS = {
  arbitrum: 42161,
  optimism: 10,
  avalanche: 43114,
  bsc: 56,
  sepolia: 11155111,
  arbitrumTestnet: 421614,
};
