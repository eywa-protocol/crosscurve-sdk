import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 600_000,  // 10 minutes per test
    hookTimeout: 120_000,  // 2 minutes for setup/teardown
    setupFiles: ['./tests/e2e/setup.ts'],
    sequence: {
      concurrent: false,   // serial execution — shared wallet
    },
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
