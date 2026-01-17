import 'dotenv/config';
import { CrossCurveSDK, ChainId } from '@crosscurve/sdk';
import { getToken } from '../config/index.js';

async function main() {
  console.log('=== Get Quote Test ===\n');

  const sdk = new CrossCurveSDK();
  await sdk.init();

  // Get USDC addresses
  const fromToken = getToken(ChainId.ARBITRUM, 'USDC');
  const toToken = getToken(ChainId.OPTIMISM, 'USDC');

  const params = {
    fromChain: ChainId.ARBITRUM,
    toChain: ChainId.OPTIMISM,
    fromToken: fromToken.address,
    toToken: toToken.address,
    amount: '1000000', // 1 USDC (6 decimals)
    slippage: 0.5,
    sender: '0x0000000000000000000000000000000000000001', // Placeholder for quote
  };

  console.log('Quote parameters:');
  console.log(`  From: ${fromToken.symbol} on Arbitrum`);
  console.log(`  To: ${toToken.symbol} on Optimism`);
  console.log(`  Amount: 1 USDC\n`);

  console.log('Fetching quote...');
  const quote = await sdk.getQuote(params);

  console.log('\nQuote received:');
  console.log(`  Provider: ${quote.provider}`);
  console.log(`  Estimated output: ${quote.estimatedOutput}`);
  console.log(`  Min output: ${quote.minOutput}`);
  console.log(`  Price impact: ${quote.priceImpact}%`);

  if (quote.fees) {
    console.log('\nFees:');
    console.log(`  Protocol fee: ${quote.fees.protocolFee || 'N/A'}`);
    console.log(`  Bridge fee: ${quote.fees.bridgeFee || 'N/A'}`);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
