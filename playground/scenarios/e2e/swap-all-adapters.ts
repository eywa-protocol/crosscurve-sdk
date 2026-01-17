import 'dotenv/config';
import { CrossCurveSDK, ChainId } from '@crosscurve/sdk';
import { getToken } from '../../config/index.js';
import { getAdapter, type AdapterType } from '../../adapters/index.js';
import { parseArgs } from 'node:util';

const ADAPTERS: AdapterType[] = ['viem', 'ethers-v6', 'ethers-v5'];

async function main() {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: true },
    },
  });

  const dryRun = values['dry-run'];

  console.log('=== Swap All Adapters E2E Test ===\n');
  console.log(`Testing adapters: ${ADAPTERS.join(', ')}`);
  console.log(`Dry run: ${dryRun}\n`);

  const sdk = new CrossCurveSDK();
  await sdk.init();

  const fromChain = ChainId.ARBITRUM;
  const toChain = ChainId.OPTIMISM;
  const fromToken = getToken(fromChain, 'USDC');
  const toToken = getToken(toChain, 'USDC');
  const amount = '1000000'; // 1 USDC

  const results: Record<string, { success: boolean; address?: string; quote?: string; error?: string }> = {};

  for (const adapterType of ADAPTERS) {
    console.log(`\n--- Testing ${adapterType} adapter ---`);

    try {
      const signer = getAdapter(adapterType, fromChain);
      const sender = await signer.getAddress();
      console.log(`  Address: ${sender}`);

      const quote = await sdk.getQuote({
        fromChain,
        toChain,
        fromToken: fromToken.address,
        toToken: toToken.address,
        amount,
        slippage: 0.5,
        sender,
      });

      console.log(`  Quote: ${quote.estimatedOutput} ${toToken.symbol}`);

      if (!dryRun) {
        console.log('  Executing swap...');
        const result = await sdk.executeQuote(quote, { signer });
        console.log(`  TX: ${result.transactionHash}`);
      }

      results[adapterType] = {
        success: true,
        address: sender,
        quote: quote.estimatedOutput,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ERROR: ${message}`);
      results[adapterType] = { success: false, error: message };
    }
  }

  console.log('\n\n=== Summary ===\n');
  for (const [adapter, result] of Object.entries(results)) {
    const status = result.success ? 'PASS' : 'FAIL';
    console.log(`${adapter}: ${status}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
