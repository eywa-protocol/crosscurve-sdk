import 'dotenv/config';
import { CrossCurveSDK, ChainId } from '@crosscurve/sdk';

async function main() {
  console.log('=== SDK Initialization Test ===\n');

  const sdk = new CrossCurveSDK();

  console.log('Initializing SDK...');
  await sdk.init();
  console.log('SDK initialized successfully!\n');

  // Log available chains
  console.log('Available chains:');
  for (const chain of sdk.chains) {
    console.log(`  - ${chain.name} (ID: ${chain.chainId})`);
  }
  console.log(`Total: ${sdk.chains.length} chains\n`);

  // Log token counts per chain
  console.log('Tokens per chain:');
  for (const [chainId, tokens] of sdk.tokens) {
    console.log(`  - Chain ${chainId}: ${tokens.length} tokens`);
  }

  // Test getToken
  console.log('\nTesting getToken():');
  const usdcArbitrum = sdk.getToken(ChainId.ARBITRUM, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
  if (usdcArbitrum) {
    console.log(`  Found: ${usdcArbitrum.symbol} on Arbitrum`);
  } else {
    console.log('  USDC not found on Arbitrum');
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
