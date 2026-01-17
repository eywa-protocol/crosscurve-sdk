import 'dotenv/config';
import { CrossCurveSDK, ChainId } from '@crosscurve/sdk';
import { getToken } from '../../config/index.js';
import { getAdapter, type AdapterType } from '../../adapters/index.js';
import { parseArgs } from 'node:util';

async function main() {
  const { values } = parseArgs({
    options: {
      adapter: { type: 'string', default: 'viem' },
      id: { type: 'string' },
      'dry-run': { type: 'boolean', default: true },
    },
  });

  const adapterType = values.adapter as AdapterType;
  const requestId = values.id;
  const dryRun = values['dry-run'];

  console.log('=== Recovery Flow E2E Test ===\n');
  console.log(`Adapter: ${adapterType}`);
  console.log(`Dry run: ${dryRun}\n`);

  const sdk = new CrossCurveSDK();
  await sdk.init();

  if (requestId) {
    // Recovery mode: recover existing failed transaction
    console.log(`Recovering transaction: ${requestId}\n`);

    const status = await sdk.trackTransaction(requestId);
    console.log(`Current status: ${status.status}`);
    console.log(`Source chain: ${status.sourceChain}`);
    console.log(`Destination chain: ${status.destinationChain}`);

    if (!status.recovery?.available) {
      console.log('\nNo recovery available for this transaction.');
      process.exit(0);
    }

    console.log(`\nRecovery available:`);
    console.log(`  Type: ${status.recovery.type}`);
    console.log(`  Reason: ${status.recovery.reason}`);

    if (dryRun) {
      console.log('\nDRY RUN - Recovery would be executed here');
    } else {
      // Determine which chain to use for recovery based on type
      const recoveryChain = status.recovery.type === 'emergency'
        ? status.sourceChain
        : status.destinationChain;

      const signer = getAdapter(adapterType, recoveryChain!);

      console.log(`\nExecuting ${status.recovery.type} recovery on chain ${recoveryChain}...`);
      const result = await sdk.recover(requestId, {
        signer,
        slippage: 1,
      });

      console.log(`Recovery TX: ${result.transactionHash}`);
      console.log(`Status: ${result.status}`);
    }
  } else {
    // Demo mode: explain the recovery flow
    console.log('No --id provided. Showing recovery flow explanation.\n');

    console.log('Recovery Types:');
    console.log('  1. Emergency - Withdraw funds on source chain (destination failed)');
    console.log('  2. Retry - Retry execution on destination chain');
    console.log('  3. Inconsistency - Re-quote and execute due to price change\n');

    console.log('To test recovery:');
    console.log('  1. Execute a swap that fails on destination');
    console.log('  2. Run: npm run e2e:recovery -- --id <requestId> --no-dry-run');
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
