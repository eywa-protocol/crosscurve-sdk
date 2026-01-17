import 'dotenv/config';
import { CrossCurveSDK } from '@crosscurve/sdk';
import { parseArgs } from 'node:util';

async function main() {
  const { values } = parseArgs({
    options: {
      address: { type: 'string' },
      hash: { type: 'string' },
      limit: { type: 'string', default: '10' },
    },
  });

  if (!values.address && !values.hash) {
    console.error('Usage: --address <walletAddress> OR --hash <txHash> [--limit 10]');
    process.exit(1);
  }

  console.log('=== Search Transactions Test ===\n');

  const sdk = new CrossCurveSDK();
  await sdk.init();

  const limit = Number(values.limit);

  let results;

  if (values.address) {
    console.log(`Searching by address: ${values.address}`);
    console.log(`Limit: ${limit}\n`);

    results = await sdk.searchTransactions({
      address: values.address,
      limit,
    });
  } else if (values.hash) {
    console.log(`Searching by hash: ${values.hash}\n`);

    results = await sdk.searchTransactions({
      txHash: values.hash,
    });
  }

  if (!results || results.length === 0) {
    console.log('No transactions found.');
  } else {
    console.log(`Found ${results.length} transaction(s):\n`);

    for (const tx of results) {
      console.log(`  Request ID: ${tx.requestId || 'N/A'}`);
      console.log(`  Status: ${tx.status}`);
      console.log(`  Source: Chain ${tx.sourceChain}`);
      console.log(`  Destination: Chain ${tx.destinationChain}`);
      if (tx.sourceTransaction?.hash) {
        console.log(`  Source TX: ${tx.sourceTransaction.hash}`);
      }
      console.log('  ---');
    }
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
