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
// Mnemonic must be provided via environment variable for E2E swap tests
export const TEST_CONFIG = {
  apiBaseUrl: process.env.TEST_API_BASE_URL || 'https://api.crosscurve.fi',
  testWalletAddress: process.env.TEST_WALLET_ADDRESS || '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5',
  testMnemonic: process.env.TEST_MNEMONIC,
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
