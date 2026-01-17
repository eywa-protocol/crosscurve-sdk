import 'dotenv/config';
import { CrossCurveSDK, ChainId } from '@crosscurve/sdk';
import { getToken } from '../config/index.js';
import { getAdapter, type AdapterType } from '../adapters/index.js';
import { parseArgs } from 'node:util';

async function main() {
  const { values } = parseArgs({
    options: {
      adapter: { type: 'string', default: 'viem' },
      amount: { type: 'string', default: '1000000' }, // 1 USDC
      'from-chain': { type: 'string', default: String(ChainId.ARBITRUM) },
      'to-chain': { type: 'string', default: String(ChainId.OPTIMISM) },
      'from-token': { type: 'string', default: 'USDC' },
      'to-token': { type: 'string', default: 'USDC' },
      'dry-run': { type: 'boolean', default: true },
    },
  });

  const adapterType = values.adapter as AdapterType;
  const fromChain = Number(values['from-chain']);
  const toChain = Number(values['to-chain']);
  const amount = values.amount!;
  const fromTokenSymbol = values['from-token']!;
  const toTokenSymbol = values['to-token']!;
  const dryRun = values['dry-run'];

  console.log('=== Execute Swap Test ===\n');
  console.log(`Adapter: ${adapterType}`);
  console.log(`Dry run: ${dryRun}\n`);

  const sdk = new CrossCurveSDK();
  await sdk.init();

  const signer = getAdapter(adapterType, fromChain);
  const sender = await signer.getAddress();

  const fromToken = getToken(fromChain, fromTokenSymbol);
  const toToken = getToken(toChain, toTokenSymbol);

  console.log('Swap parameters:');
  console.log(`  From: ${amount} ${fromToken.symbol} on chain ${fromChain}`);
  console.log(`  To: ${toToken.symbol} on chain ${toChain}`);
  console.log(`  Sender: ${sender}\n`);

  console.log('Fetching quote...');
  const quote = await sdk.getQuote({
    fromChain,
    toChain,
    fromToken: fromToken.address,
    toToken: toToken.address,
    amount,
    slippage: 0.5,
    sender,
  });

  console.log(`Quote received: ${quote.estimatedOutput} ${toToken.symbol}\n`);

  if (dryRun) {
    console.log('DRY RUN - Skipping execution');
    console.log('Run with --no-dry-run to execute the swap');
  } else {
    console.log('Executing swap...');
    const result = await sdk.executeQuote(quote, {
      signer,
      autoRecover: true,
    });

    console.log('\nSwap result:');
    console.log(`  Transaction hash: ${result.transactionHash}`);
    console.log(`  Request ID: ${result.requestId}`);
    console.log(`  Status: ${result.status}`);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
