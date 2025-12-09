# CrossCurve SDK Test Suite

Comprehensive test coverage for the CrossCurve SDK, including unit tests, integration tests, and end-to-end tests.

## Test Structure

```
tests/
├── unit/                          # Unit tests for individual components
│   ├── utils/                     # Utility function tests
│   │   ├── validation.test.ts    # Validation utilities (25 tests)
│   │   └── polling.test.ts       # Polling and backoff logic (13 tests)
│   └── infrastructure/
│       └── adapters/
│           └── ViemAdapter.test.ts  # Viem signer adapter (17 tests)
│
├── integration/                   # Integration tests with mocked dependencies
│   └── sdk.test.ts               # Full SDK flow tests (30+ tests)
│
├── e2e/                          # End-to-end tests with real API
│   ├── api.test.ts               # Real API endpoint tests (read-only)
│   └── swap.test.ts              # Real swap execution (requires funds, skipped by default)
│
├── fixtures/                      # Test data and fixtures
│   └── api.ts                    # Mock API responses
│
├── mocks/                         # Mock implementations
│   ├── MockSigner.ts             # Mock ChainSigner implementation
│   ├── MockApiClient.ts          # Mock API client
│   └── index.ts                  # Re-exports
│
└── setup.ts                       # Global test configuration
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Files
```bash
# Unit tests
npm test -- tests/unit/utils/validation.test.ts
npm test -- tests/unit/utils/polling.test.ts
npm test -- tests/unit/infrastructure/adapters/ViemAdapter.test.ts

# Integration tests
npm test -- tests/integration/sdk.test.ts

# E2E tests (read-only, safe to run)
npm test -- tests/e2e/api.test.ts
```

### Run E2E Swap Tests (Requires Funds)
```bash
# IMPORTANT: These tests execute real transactions
# Ensure test wallet has ~0.005 ETH on Arbitrum
ENABLE_E2E_SWAP=true npm test -- tests/e2e/swap.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

## Test Categories

### Unit Tests

#### Validation Tests (`tests/unit/utils/validation.test.ts`)
- ✅ Slippage validation (negative, over 100%, max slippage enforcement)
- ✅ Amount validation (empty, zero, invalid formats, BigInt edge cases)
- ✅ Address validation (valid/invalid Ethereum addresses, checksums)
- ✅ Balance checking (sufficient, insufficient, invalid formats)

#### Polling Tests (`tests/unit/utils/polling.test.ts`)
- ✅ Basic polling with completion condition
- ✅ Exponential backoff (10s initial, +50% multiplier)
- ✅ Maximum interval cap (60s)
- ✅ Timeout handling (15min default)
- ✅ Null/undefined result handling
- ✅ Callback invocations
- ✅ Error propagation

#### ViemAdapter Tests (`tests/unit/infrastructure/adapters/ViemAdapter.test.ts`)
- ✅ Address retrieval
- ✅ Message signing (raw Uint8Array)
- ✅ Transaction sending (basic, with gas params, EIP-1559, custom nonce)
- ✅ Transaction receipt waiting
- ✅ Error handling (user rejection, insufficient funds)
- ✅ BigInt parameter handling

### Integration Tests

#### SDK Tests (`tests/integration/sdk.test.ts`)
- ✅ SDK initialization with custom config
- ✅ Chain and token loading
- ✅ Quote fetching with validation
- ✅ Quote execution with options (recipient, gas params, callbacks)
- ✅ Transaction tracking and polling
- ✅ Recovery detection (emergency, retry)
- ✅ Token management (filtering, search, CAIP-2 lookup)
- ✅ Scope APIs (routing, tx, tracking, inconsistency)

### E2E Tests

#### API Tests (`tests/e2e/api.test.ts`)
**These tests use real API endpoints - safe to run, read-only**
- ✅ Network endpoints (chains, tokens)
- ✅ Routing endpoints (route scanning, slippage handling)
- ✅ Token filtering and search
- ✅ Multi-chain support (Arbitrum, Optimism, Avalanche, BSC)
- ✅ Error handling (invalid tokens, zero amount, invalid slippage)
- ✅ Transaction search

#### Swap Tests (`tests/e2e/swap.test.ts`)
**⚠️ These tests execute real transactions - requires funds and explicit opt-in**
- Cross-chain swap execution (Arbitrum → Optimism)
- Transaction status tracking
- Custom gas parameters
- Custom recipient
- Transaction search
- Skipped by default unless `ENABLE_E2E_SWAP=true`

## Test Configuration

### Environment Variables
```bash
# Enable real swap tests (default: false)
ENABLE_E2E_SWAP=true

# Test configuration (from setup.ts)
API_BASE_URL=https://api.crosscurve.fi
TEST_WALLET=0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5
```

### Test Wallet Setup
1. Copy `.env.test.example` to `.env.test`
2. Set `TEST_MNEMONIC` to your test wallet mnemonic
3. Ensure test wallet has ~0.005 ETH on Arbitrum (chainId 42161)

**Supported Chains**: Arbitrum (42161), Optimism (10), Avalanche (43114), BSC (56), Sepolia (11155111)

**Security Note**: Never commit wallet mnemonics to version control. The `.env.test` file is in `.gitignore`.

### Timeouts
- Default test timeout: 30 seconds
- E2E swap tests: 120 seconds (2 minutes)
- Transaction tracking: 180 seconds (3 minutes)

## Mocks and Fixtures

### MockSigner
Mock implementation of `ChainSigner` interface for testing without real wallet.

Features:
- Configurable address
- Configurable success/failure
- Call tracking for assertions
- Delay simulation

Usage:
```typescript
import { MockSigner } from '../mocks';

const signer = new MockSigner({
  address: '0x...',
  shouldFailSendTransaction: false,
  sendTransactionDelay: 100,
});
```

### MockApiClient
Mock implementation of `IApiClient` interface for testing without real API.

Features:
- Configurable responses
- Call tracking
- Delay simulation
- Error injection

Usage:
```typescript
import { MockApiClient } from '../mocks';

const client = new MockApiClient({
  scanRoutesResult: customResponse,
  shouldFailGetTransaction: false,
});
```

### API Fixtures
Pre-defined mock responses for common scenarios:
- `MOCK_QUOTE`: Sample quote response
- `MOCK_ROUTING_RESPONSE`: Routing scan response
- `MOCK_TRANSACTION_GET_RESPONSE`: Transaction status (in progress)
- `MOCK_TRANSACTION_COMPLETED`: Completed transaction
- `MOCK_TRANSACTION_EMERGENCY`: Emergency recovery available
- `MOCK_TRANSACTION_RETRY`: Retry available
- `MOCK_TOKEN_LIST_RESPONSE`: Token list
- `MOCK_CHAIN_LIST_RESPONSE`: Chain list

## Writing New Tests

### Unit Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../../../src/path/to/function.js';

describe('Feature Name', () => {
  it('should behave correctly', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected');
  });

  it('should handle errors', () => {
    expect(() => functionToTest('invalid')).toThrow();
  });
});
```

### Integration Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CrossCurveSDK } from '../../src/sdk.js';
import { MockApiClient, MockSigner } from '../mocks';

describe('SDK Feature', () => {
  let sdk: CrossCurveSDK;
  let mockClient: MockApiClient;
  let mockSigner: MockSigner;

  beforeEach(() => {
    mockClient = new MockApiClient();
    mockSigner = new MockSigner();
    sdk = new CrossCurveSDK();
    (sdk as any).apiClient = mockClient;
  });

  it('should work correctly', async () => {
    const result = await sdk.someMethod();
    expect(result).toBeDefined();
  });
});
```

### E2E Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { CrossCurveSDK } from '../../src/sdk.js';
import { TEST_CONFIG } from '../setup.js';

describe('E2E Test', () => {
  const sdk = new CrossCurveSDK({
    baseUrl: TEST_CONFIG.apiBaseUrl,
  });

  it('should work with real API', async () => {
    const result = await sdk.someMethod();
    expect(result).toBeDefined();
  });
});
```

## Test Coverage Goals

- **Overall**: > 80%
- **Core Services**: > 90%
- **Utilities**: > 95%
- **Adapters**: > 85%

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm test

- name: Generate Coverage
  run: npm test -- --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Troubleshooting

### Tests Timing Out
- Check if fake timers are properly configured
- Use `vi.useRealTimers()` for timeout tests
- Increase test timeout if needed: `it('test', async () => {}, 60000)`

### E2E Tests Failing
- Verify API is accessible: `curl https://api.crosscurve.fi/networks`
- Check test wallet has sufficient funds
- Verify chain IDs and token addresses are correct

### Mock Not Working
- Ensure mock is injected before calling methods
- Check mock reset/clear in `beforeEach`
- Verify mock call tracking: `expect(mock.method).toHaveBeenCalled()`

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Use mocks for external dependencies
3. **Assertions**: Use specific assertions over generic ones
4. **Cleanup**: Reset mocks and state in `beforeEach`/`afterEach`
5. **Naming**: Use descriptive test names starting with "should"
6. **Coverage**: Aim for edge cases and error paths
7. **Performance**: Keep unit tests fast (< 100ms)
8. **Documentation**: Add comments for complex test scenarios

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Viem Documentation](https://viem.sh/)
- [CrossCurve API Documentation](docs/prd/SDK_OVERVIEW.md)
- [PRD](docs/prd/PRD.md)
