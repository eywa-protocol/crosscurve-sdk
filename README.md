# CrossCurve SDK

TypeScript SDK for cross-chain token swaps with automatic recovery and multi-library support.

## Features

- **Cross-chain swaps**: Same-chain, 2-chain, and multi-hop (3+ chains)
- **Auto-recovery**: Automatic handling of failed transactions
- **Multi-library support**: viem, ethers v6, ethers v5, web3.js
- **EIP-2612 permit**: Gasless approvals with fallback to standard approve
- **CAIP-2 support**: Standard chain identification
- **Real-time tracking**: Status updates via callbacks
- **Two-tier API**: Simple high-level API + granular low-level API

## Installation

```bash
npm install crosscurve-sdk
```

You also need at least one signer library:

```bash
# viem (recommended)
npm install viem

# OR ethers v6
npm install ethers

# OR ethers v5 (legacy)
npm install ethers@5

# OR web3.js
npm install web3
```

## Quick Start

### With viem

```typescript
import { CrossCurveSDK, ViemAdapter } from 'crosscurve-sdk';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

// Create wallet client
const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum)
});
const [address] = await walletClient.getAddresses();
const signer = new ViemAdapter(walletClient, address);

// Initialize SDK
const sdk = new CrossCurveSDK();
await sdk.init();

// Get quote
const quote = await sdk.getQuote({
  fromChain: 1,
  toChain: 42161,
  fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
  toToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
  amount: '1000000000', // 1000 USDC (6 decimals)
  slippage: 0.5, // 0.5%
  sender: address,
});

// Execute with auto-recovery
const result = await sdk.executeQuote(quote, {
  signer,
  autoRecover: true,
  onStatusChange: (status) => {
    console.log('Status:', status.status);
  },
});

console.log('Transaction:', result.transactionHash);
```

### With ethers v6

```typescript
import { CrossCurveSDK, EthersV6Adapter } from 'crosscurve-sdk';
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
const ethersSigner = await provider.getSigner();
const signer = new EthersV6Adapter(ethersSigner);

const sdk = new CrossCurveSDK();
await sdk.init();

const quote = await sdk.getQuote({
  fromChain: 1,
  toChain: 42161,
  fromToken: USDC_ETH,
  toToken: USDC_ARB,
  amount: '1000000000',
  slippage: 0.5,
  sender: await signer.getAddress(),
});

const result = await sdk.executeQuote(quote, { signer });
```

## API Reference

### Tier 1 API (Standard)

Simple, high-level methods for most use cases:

#### Initialize

```typescript
const sdk = new CrossCurveSDK({
  apiKey: 'your-api-key', // optional, for fee sharing
  baseUrl: 'https://api.crosscurve.io', // optional, defaults to production
  maxSlippage: 5, // optional, max slippage validation (%)
  warnings: {
    inconsistencyResolution: true, // optional, enable warnings
  },
});

await sdk.init(); // Load chains and tokens
```

#### Get Quote

```typescript
const quote = await sdk.getQuote({
  fromChain: 1,
  toChain: 42161,
  fromToken: '0x...', // token address
  toToken: '0x...',
  amount: '1000000000', // wei string
  slippage: 0.5, // percentage
  sender: '0x...', // optional for quote, required for execute
  feeFromAmount: false, // optional
  feeToken: '0x...', // optional
  providers: ['AXELAR'], // optional filter
});
```

#### Execute Quote

```typescript
const result = await sdk.executeQuote(quote, {
  signer, // ChainSigner adapter
  recipient: '0x...', // optional, defaults to signer address
  autoRecover: true, // optional, auto-handle recovery
  onStatusChange: (status) => {
    console.log('Status update:', status);
  },
  // Gas overrides (optional)
  gasLimit: 500000n,
  maxFeePerGas: 50000000000n,
  maxPriorityFeePerGas: 2000000000n,
});
```

#### Track Transaction

```typescript
const status = await sdk.trackTransaction(requestId);

if (status.recovery?.available) {
  console.log('Recovery available:', status.recovery.type);
}
```

#### Manual Recovery

```typescript
const result = await sdk.recover(requestId, {
  signer,
  slippage: 0.5, // for inconsistency resolution
});
```

### Tier 2 API (Advanced)

Granular control for custom implementations:

#### Routing

```typescript
// Get all available routes
const routes = await sdk.routing.scan({
  params: {
    tokenIn: '0x...',
    amountIn: '1000000000',
    chainIdIn: 1,
    tokenOut: '0x...',
    chainIdOut: 42161,
  },
  slippage: 0.5,
  from: '0x...',
});

// Select route manually
const selectedRoute = routes[0];
```

#### Transaction Building

```typescript
// Build transaction calldata
const tx = await sdk.tx.create({
  from: '0x...',
  recipient: '0x...',
  routing: selectedRoute.route,
  buildCalldata: true,
});

// Send via signer
await signer.sendTransaction(tx);
```

#### Recovery Transactions

```typescript
// Emergency withdrawal
const emergencyTx = await sdk.tx.createEmergency(requestId, signature);

// Retry
const retryTx = await sdk.tx.createRetry(requestId, signature);

// Inconsistency resolution
const params = await sdk.inconsistency.getParams(requestId);
const signature = await signer.signMessage(
  sdk.inconsistency.getSignatureMessage(requestId)
);
const resolution = await sdk.inconsistency.create({
  params: params.params,
  slippage: 0.5,
  from: address,
  requestId,
  signature,
});
```

## Chain IDs

```typescript
import { ChainId } from 'crosscurve-sdk';

ChainId.ETHEREUM // 1
ChainId.OPTIMISM // 10
ChainId.BSC // 56
ChainId.POLYGON // 137
ChainId.ARBITRUM // 42161
ChainId.AVALANCHE // 43114
ChainId.BASE // 8453
```

## CAIP-2 Support

```typescript
const chain = sdk.getChainByCaip2('eip155:1'); // Ethereum
console.log(chain.name); // "Ethereum"
```

## Error Handling

```typescript
import { ApiError, NetworkError, ValidationError } from 'crosscurve-sdk';

try {
  const quote = await sdk.getQuote(params);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else if (error instanceof ApiError) {
    console.error('API error:', error.statusCode, error.message);
  }
}
```

## Architecture

The SDK follows **Clean Architecture** principles:

```
src/
├── domain/           # Core business logic (ZERO dependencies)
│   ├── entities/     # Quote, Route, Transaction, Chain, Token
│   └── interfaces/   # IApiClient, ICache
├── application/      # Use cases
│   ├── services/     # Tier 1 business logic
│   └── scopes/       # Tier 2 namespaced APIs
├── infrastructure/   # External concerns
│   ├── api/          # HTTP client
│   ├── adapters/     # Signer adapters
│   └── cache/        # Caching
├── types/            # TypeScript types
├── constants/        # Static values
├── utils/            # Pure utilities
├── config/           # Configuration
└── sdk.ts            # Main orchestrator
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Clean
npm run clean
```

## License

MIT

## Support

For issues and questions, please visit [GitHub Issues](https://github.com/crosscurve/crosscurve-sdk/issues).
