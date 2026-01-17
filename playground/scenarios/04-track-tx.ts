import 'dotenv/config';
import { CrossCurveSDK } from '@crosscurve/sdk';
import { parseArgs } from 'node:util';

async function main() {
  const { values } = parseArgs({
    options: {
      id: { type: 'string' },
      hash: { type: 'string' },
      provider: { type: 'string' },
      'bridge-id': { type: 'string' },
    },
  });

  if (!values.id && !values.hash) {
    console.error('Usage: --id <requestId> OR --hash <txHash> [--provider rubic|bungee] [--bridge-id <id>]');
    process.exit(1);
  }

  console.log('=== Track Transaction Test ===\n');

  const sdk = new CrossCurveSDK();
  await sdk.init();

  let status;

  if (values.id) {
    console.log(`Tracking by request ID: ${values.id}\n`);
    status = await sdk.trackTransaction(values.id);
  } else if (values.hash) {
    console.log(`Tracking by transaction hash: ${values.hash}`);
    if (values.provider) {
      console.log(`Provider: ${values.provider}`);
    }
    console.log();

    status = await sdk.trackTransaction(values.hash, {
      provider: values.provider as 'rubic' | 'bungee' | undefined,
      bridgeId: values['bridge-id'],
    });
  }

  console.log('Transaction status:');
  console.log(`  Status: ${status?.status}`);
  console.log(`  Source chain: ${status?.sourceChain}`);
  console.log(`  Destination chain: ${status?.destinationChain}`);

  if (status?.sourceTransaction) {
    console.log(`\nSource transaction:`);
    console.log(`  Hash: ${status.sourceTransaction.hash}`);
    console.log(`  Status: ${status.sourceTransaction.status}`);
  }

  if (status?.destinationTransaction) {
    console.log(`\nDestination transaction:`);
    console.log(`  Hash: ${status.destinationTransaction.hash}`);
    console.log(`  Status: ${status.destinationTransaction.status}`);
  }

  if (status?.recovery?.available) {
    console.log(`\nRecovery available:`);
    console.log(`  Type: ${status.recovery.type}`);
    console.log(`  Reason: ${status.recovery.reason}`);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
