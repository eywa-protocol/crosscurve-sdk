# CrossCurve SDK

TypeScript SDK for cross-chain token swaps via CrossCurve protocol with support for Rubic and Bungee bridges.

## Installation

```bash
npm install crosscurve-sdk

# Plus one signer library:
npm install viem        # recommended
# or: npm install ethers
# or: npm install web3
```

## Quick Start

```typescript
import { CrossCurveSDK, ViemAdapter } from 'crosscurve-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';
import { mnemonicToAccount } from 'viem/accounts';

const account = mnemonicToAccount('your mnemonic');
const walletClient = createWalletClient({ account, chain: arbitrum, transport: http() });
const publicClient = createPublicClient({ chain: arbitrum, transport: http() });
const signer = new ViemAdapter(walletClient, publicClient, account);

const sdk = new CrossCurveSDK();
await sdk.init();

// Get quote
const quote = await sdk.getQuote({
  fromChain: 42161,                                      // Arbitrum
  toChain: 10,                                           // Optimism
  fromToken: '0x0000000000000000000000000000000000000000', // Native ETH
  toToken: '0x0000000000000000000000000000000000000000',   // Native ETH
  amount: '1000000000000000',                             // 0.001 ETH (in wei)
  slippage: 0.5,
  sender: account.address,
  providers: ['cross-curve', 'rubic', 'bungee'],  // optional: filter by provider
});

// Execute with auto-recovery
const result = await sdk.executeQuote(quote, {
  signer,
  autoRecover: true,
  onStatusChange: (status) => console.log('Status:', status.status),
});

console.log('TX:', result.transactionHash);
console.log('Request ID:', result.requestId);
```

## Supported Networks

| Chain | Chain ID | Native Token |
|-------|----------|--------------|
| Arbitrum | 42161 | ETH |
| Optimism | 10 | ETH |
| Avalanche | 43114 | AVAX |
| BSC | 56 | BNB |

Use `0x0000000000000000000000000000000000000000` for native tokens.

## Supported Bridges

- **CrossCurve** (`cross-curve`) - Native protocol routes with recovery support
- **Rubic** (`rubic`) - Multi-chain aggregator
- **Bungee** (`bungee`) - Socket protocol aggregator

Filter providers via `providers` param in `getQuote()`.

## API

### Core Methods

```typescript
sdk.init()                              // Load chains and tokens
sdk.getQuote(params)                    // Get best swap quote
sdk.executeQuote(quote, options)        // Execute swap
sdk.trackTransaction(id, options)       // Track status
sdk.recover(requestId, options)         // Manual recovery
```

### Token/Chain Data

```typescript
sdk.chains                              // All supported chains
sdk.getTokens(chainId)                  // Tokens for chain
sdk.getToken(chainId, address)          // Single token
sdk.getChainByCaip2('eip155:42161')     // Chain by CAIP-2
```

### Execute Options

```typescript
const result = await sdk.executeQuote(quote, {
  signer,                    // Required: ChainSigner adapter
  recipient: '0x...',        // Optional: override recipient (default: signer address)
  autoRecover: true,         // Auto-handle recovery on failure
  onStatusChange: (s) => {}, // Status callback during polling

  // Gas overrides (optional)
  gasLimit: 500000n,
  gasPrice: 1000000000n,           // Legacy transactions
  maxFeePerGas: 2000000000n,       // EIP-1559
  maxPriorityFeePerGas: 100000000n,
  nonce: 42,
});
```

### Tracking Options

```typescript
// Track CrossCurve transaction by requestId
const status = await sdk.trackTransaction(result.requestId);

// Track external bridge by tx hash
const status = await sdk.trackTransaction(txHash, {
  provider: 'rubic',           // 'rubic' | 'bungee'
  bridgeId: result.bridgeId,   // For Rubic routes
  chainId: 42161,              // Source chain
});
```

### Tier 2 API (Advanced)

```typescript
// Routing
sdk.routing.scan(request)               // Get all available routes

// Transaction building
sdk.tx.create(request)                  // Build swap transaction
sdk.tx.createEmergency(requestId, sig)  // Emergency withdrawal tx
sdk.tx.createRetry(requestId, sig)      // Retry delivery tx

// Tracking
sdk.tracking.get(requestId)             // Get transaction status
sdk.tracking.search(query)              // Search by address/hash

// Inconsistency resolution
sdk.inconsistency.getParams(requestId)  // Get resolution params
sdk.inconsistency.create(request)       // Create resolution tx
```

## Recovery

CrossCurve routes support three recovery types when transactions fail:

| Type | Trigger | Action |
|------|---------|--------|
| **Emergency** | Destination chain emergency state | Withdraw funds on source chain |
| **Retry** | Delivery failed, retry available | Re-attempt destination delivery |
| **Inconsistency** | Price deviation detected | Re-route with new quote |

With `autoRecover: true`, recovery is handled automatically. For manual recovery:

```typescript
const status = await sdk.trackTransaction(requestId);

if (status.recovery?.available) {
  const result = await sdk.recover(requestId, {
    signer,
    slippage: 1,  // Required for inconsistency recovery
  });
}
```

## Adapters

```typescript
import { ViemAdapter, EthersV6Adapter, EthersV5Adapter, Web3Adapter } from 'crosscurve-sdk';

// Viem (recommended)
new ViemAdapter(walletClient, publicClient, account)

// Ethers v6
new EthersV6Adapter(signer)

// Ethers v5
new EthersV5Adapter(signer)

// Web3.js v4
new Web3Adapter(web3, address)
```

All adapters implement `ChainSigner` interface with optional `getChainId()` method.

## Configuration

```typescript
const sdk = new CrossCurveSDK({
  // API
  apiKey: 'your-key',           // For fee sharing / integrator revenue
  baseUrl: 'https://...',       // Custom API URL

  // Validation
  maxSlippage: 5,               // Max slippage threshold (%)
  approvalMode: 'exact',        // 'exact' (recommended) or 'unlimited'

  // Polling timing
  polling: {
    initialInterval: 10000,     // 10s initial poll interval
    backoffMultiplier: 1.5,     // Exponential backoff
    maxInterval: 60000,         // 60s max interval
    timeout: 900000,            // 15min timeout
  },

  // External bridge polling (Rubic, Bungee)
  bridgePolling: {
    initialInterval: 15000,
    timeout: 1800000,           // 30min timeout
  },

  // HTTP client
  http: {
    timeout: 90000,             // Request timeout
    retryMaxTime: 90000,        // Total retry window
    retryInitialDelay: 1000,    // Initial retry delay
    retryBackoffMultiplier: 2,
  },

  // Cache
  cache: {
    ttlMs: 600000,              // 10min cache TTL
  },

  // Security
  security: {
    allowedHosts: ['custom-api.example.com'],  // Additional allowed hosts
    enforceHttps: true,         // Require HTTPS for non-localhost
  },

  // Permit
  permitDeadlineSeconds: 3600,  // 1 hour permit signature validity
});
```

## Error Handling

```typescript
import {
  // API errors
  ApiError,
  NetworkError,
  ValidationError,

  // Transaction errors
  TransactionError,
  InvalidQuoteError,
  InsufficientBalanceError,
  SlippageExceededError,

  // Recovery errors
  RecoveryUnavailableError,
  TimeoutError,

  // Rate limiting
  CircuitBreakerError,
  RateLimitError,
  ConfigurationError,
} from 'crosscurve-sdk';

try {
  await sdk.executeQuote(quote, { signer });
} catch (error) {
  if (error instanceof CircuitBreakerError) {
    console.log(`${error.service} API circuit open, retry after ${error.resetMs}ms`);
  }
}
```

## Development

```bash
npm run build          # Build
npm test               # Run tests
npm run test:e2e       # E2E tests (requires ENABLE_E2E_SWAP=true)
```

### E2E Testing

```bash
# Check balances
npx tsx tests/e2e/check-balances.ts

# Scan routes
npx tsx tests/e2e/scan-routes.ts \
  --chainIdIn 42161 --chainIdOut 10 \
  --tokenIn 0x... --tokenOut 0x... \
  --amountIn 1000000

# Execute swap
npx tsx tests/e2e/execute-swap.ts \
  --chainIdIn 42161 --chainIdOut 10 \
  --tokenIn 0x... --tokenOut 0x... \
  --amountIn 1000000 \
  --mnemonic "your mnemonic"
```

## License

MIT

## Support

[GitHub Issues](https://github.com/aspect-build/crosscurve-sdk/issues)
