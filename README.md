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
  fromToken: '0x0000000000000000000000000000000000000000', // ETH
  toToken: '0x0000000000000000000000000000000000000000',   // ETH
  amount: '1000000000000000',                             // 0.001 ETH
  slippage: 0.5,
  sender: account.address,
  providers: ['rubic'],  // optional: filter by provider
});

// Execute
const result = await sdk.executeQuote(quote, {
  signer,
  autoRecover: true,
  onStatusChange: (status) => console.log('Status:', status.status),
});

console.log('TX:', result.transactionHash);
```

## Supported Bridges

- **CrossCurve** - Native protocol routes
- **Rubic** - Multi-chain aggregator
- **Bungee** - Socket protocol aggregator

Filter providers via `providers` param in `getQuote()`.

## API

### Core Methods

```typescript
sdk.init()                              // Load chains and tokens
sdk.getQuote(params)                    // Get best swap quote
sdk.executeQuote(quote, options)        // Execute swap
sdk.trackTransaction(requestId)         // Track status
sdk.recover(requestId, options)         // Manual recovery
```

### Token/Chain Data

```typescript
sdk.chains                              // All supported chains
sdk.getTokens(chainId)                  // Tokens for chain
sdk.getChainByCaip2('eip155:42161')     // Chain by CAIP-2
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
sdk.inconsistency.getSignatureMessage(requestId)  // Get message to sign
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

// Web3.js
new Web3Adapter(web3, address)
```

## Configuration

```typescript
const sdk = new CrossCurveSDK({
  apiKey: 'your-key',           // For fee sharing
  baseUrl: 'https://...',       // Custom API URL
  maxSlippage: 5,               // Max slippage validation (%)
  approvalMode: 'exact',        // 'exact' or 'unlimited'
});
```

## Error Handling

```typescript
import { ApiError, NetworkError, ValidationError, TransactionError } from 'crosscurve-sdk';
```

## Development

```bash
npm run build          # Build
npm test               # Run tests
npm run test:e2e       # E2E tests (requires ENABLE_E2E_SWAP=true)
```

## License

MIT

## Support

[GitHub Issues](https://github.com/eywa-protocol/crosscurve-sdk/issues)
