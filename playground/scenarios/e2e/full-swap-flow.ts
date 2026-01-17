import 'dotenv/config';
import { CrossCurveSDK, ChainId } from '@crosscurve/sdk';
import { getToken } from '../../config/index.js';
import { getAdapter, type AdapterType } from '../../adapters/index.js';
import { parseArgs } from 'node:util';

async function main() {
  const { values } = parseArgs({
    options: {
      adapter: { type: 'string', default: 'viem' },
      'dry-run': { type: 'boolean', default: true },
    },
  });

  const adapterType = values.adapter as AdapterType;
  const dryRun = values['dry-run'];

  console.log('=== Full Swap Flow E2E Test ===\n');
  console.log(`Adapter: ${adapterType}`);
  console.log(`Dry run: ${dryRun}\n`);

  const startTime = Date.now();

  // Step 1: Initialize SDK
  console.log('[1/4] Initializing SDK...');
  const sdk = new CrossCurveSDK();
  await sdk.init();
  console.log(`  Done. ${sdk.chains.length} chains loaded.\n`);

  // Step 2: Get signer and quote
  console.log('[2/4] Getting quote...');
  const fromChain = ChainId.ARBITRUM;
  const toChain = ChainId.OPTIMISM;
  const fromToken = getToken(fromChain, 'USDC');
  const toToken = getToken(toChain, 'USDC');
  const amount = '1000000'; // 1 USDC

  const signer = getAdapter(adapterType, fromChain);
  const sender = await signer.getAddress();

  const quote = await sdk.getQuote({
    fromChain,
    toChain,
    fromToken: fromToken.address,
    toToken: toToken.address,
    amount,
    slippage: 0.5,
    sender,
  });

  console.log(`  From: ${amount} ${fromToken.symbol} on Arbitrum`);
  console.log(`  To: ~${quote.estimatedOutput} ${toToken.symbol} on Optimism`);
  console.log(`  Provider: ${quote.provider}\n`);

  if (dryRun) {
    console.log('[3/4] SKIPPED (dry run) - Execute swap');
    console.log('[4/4] SKIPPED (dry run) - Track transaction\n');
    console.log('Run with --no-dry-run to execute the full flow.');
  } else {
    // Step 3: Execute swap
    console.log('[3/4] Executing swap...');
    const result = await sdk.executeQuote(quote, {
      signer,
      autoRecover: false, // We'll track manually
    });

    console.log(`  Transaction hash: ${result.transactionHash}`);
    console.log(`  Request ID: ${result.requestId}\n`);

    // Step 4: Track until completion
    console.log('[4/4] Tracking transaction...');
    let status = await sdk.trackTransaction(result.requestId!);
    let lastStatus = status.status;
    console.log(`  Status: ${status.status}`);

    while (status.status !== 'completed' && status.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
      status = await sdk.trackTransaction(result.requestId!);
      if (status.status !== lastStatus) {
        console.log(`  Status: ${status.status}`);
        lastStatus = status.status;
      }
    }

    console.log(`\n  Final status: ${status.status}`);
    if (status.destinationTransaction?.hash) {
      console.log(`  Destination TX: ${status.destinationTransaction.hash}`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Test Complete (${duration}s) ===`);
}

main().catch(console.error);
