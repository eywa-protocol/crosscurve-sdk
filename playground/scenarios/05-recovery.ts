import 'dotenv/config';
import { CrossCurveSDK } from '@crosscurve/sdk';
import { getAdapter, type AdapterType } from '../adapters/index.js';
import { parseArgs } from 'node:util';

async function main() {
  const { values } = parseArgs({
    options: {
      id: { type: 'string' },
      adapter: { type: 'string', default: 'viem' },
      chain: { type: 'string' },
      slippage: { type: 'string', default: '1' },
      'dry-run': { type: 'boolean', default: true },
    },
  });

  if (!values.id) {
    console.error('Usage: --id <requestId> --chain <chainId> [--adapter viem|ethers-v6|ethers-v5] [--slippage 1] [--no-dry-run]');
    process.exit(1);
  }

  const adapterType = values.adapter as AdapterType;
  const chainId = Number(values.chain);
  const slippage = Number(values.slippage);
  const dryRun = values['dry-run'];

  console.log('=== Recovery Test ===\n');
  console.log(`Request ID: ${values.id}`);
  console.log(`Adapter: ${adapterType}`);
  console.log(`Slippage: ${slippage}%`);
  console.log(`Dry run: ${dryRun}\n`);

  const sdk = new CrossCurveSDK();
  await sdk.init();

  // First, check transaction status
  console.log('Checking transaction status...');
  const status = await sdk.trackTransaction(values.id);

  console.log(`Current status: ${status.status}`);

  if (!status.recovery?.available) {
    console.log('\nNo recovery available for this transaction.');
    console.log('Recovery is only available for failed transactions.');
    process.exit(0);
  }

  console.log(`\nRecovery available:`);
  console.log(`  Type: ${status.recovery.type}`);
  console.log(`  Reason: ${status.recovery.reason}`);

  if (dryRun) {
    console.log('\nDRY RUN - Skipping recovery execution');
    console.log('Run with --no-dry-run to execute recovery');
  } else {
    if (!chainId) {
      console.error('--chain is required for recovery execution');
      process.exit(1);
    }

    const signer = getAdapter(adapterType, chainId);

    console.log('\nExecuting recovery...');
    const result = await sdk.recover(values.id, {
      signer,
      slippage,
    });

    console.log('\nRecovery result:');
    console.log(`  Transaction hash: ${result.transactionHash}`);
    console.log(`  Status: ${result.status}`);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
