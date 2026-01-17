import 'dotenv/config';
import { CrossCurveSDK, ChainId } from '@crosscurve/sdk';
import { getToken } from '../../config/index.js';
import { getAdapter, type AdapterType } from '../../adapters/index.js';
import { parseArgs } from 'node:util';
import * as readline from 'readline';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function runSwapFlow(
  sdk: CrossCurveSDK,
  adapterType: AdapterType,
  fromChain: number,
  toChain: number,
  amount: string,
  dryRun: boolean,
  label: string,
) {
  console.log(`\n--- ${label} ---\n`);

  const fromToken = getToken(fromChain, 'USDC');
  const toToken = getToken(toChain, 'USDC');

  const signer = getAdapter(adapterType, fromChain);
  const sender = await signer.getAddress();

  console.log(`From: ${amount} ${fromToken.symbol} on chain ${fromChain}`);
  console.log(`To: ${toToken.symbol} on chain ${toChain}`);
  console.log(`Sender: ${sender}\n`);

  const quote = await sdk.getQuote({
    fromChain,
    toChain,
    fromToken: fromToken.address,
    toToken: toToken.address,
    amount,
    slippage: 0.5,
    sender,
  });

  console.log(`Quote received:`);
  console.log(`  Provider: ${quote.provider}`);
  console.log(`  Estimated output: ${quote.estimatedOutput}`);
  console.log(`  Min output: ${quote.minOutput}\n`);

  if (dryRun) {
    console.log('DRY RUN - Execution skipped');
    return { success: true, dryRun: true };
  }

  console.log('Executing swap...');
  const result = await sdk.executeQuote(quote, {
    signer,
    autoRecover: true,
  });

  console.log(`TX: ${result.transactionHash}`);
  console.log(`Request ID: ${result.requestId}`);

  // Track to completion
  let status = await sdk.trackTransaction(result.requestId!);
  while (status.status !== 'completed' && status.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 15000));
    status = await sdk.trackTransaction(result.requestId!);
    console.log(`Status: ${status.status}`);
  }

  return { success: status.status === 'completed', dryRun: false, result };
}

async function main() {
  const { values } = parseArgs({
    options: {
      adapter: { type: 'string', default: 'viem' },
      'skip-testnet': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: true },
    },
  });

  const adapterType = values.adapter as AdapterType;
  const skipTestnet = values['skip-testnet'];
  const dryRun = values['dry-run'];

  console.log('=== Testnet to Mainnet Validation E2E Test ===\n');
  console.log(`Adapter: ${adapterType}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Skip testnet: ${skipTestnet}\n`);

  const sdk = new CrossCurveSDK();
  await sdk.init();

  // Note: CrossCurve may not support testnets - this is a template
  // Adjust chain IDs based on actual testnet support

  if (!skipTestnet) {
    console.log('TESTNET PHASE');
    console.log('Note: If testnets are not supported, use --skip-testnet\n');

    // This would use testnet chains if supported
    // For now, we simulate with mainnet dry-run
    const testnetResult = await runSwapFlow(
      sdk,
      adapterType,
      ChainId.ARBITRUM,
      ChainId.OPTIMISM,
      '1000000', // 1 USDC
      true, // Always dry-run for "testnet" simulation
      'Testnet Simulation (Arbitrum -> Optimism)',
    );

    if (!testnetResult.success) {
      console.log('\nTestnet validation failed. Stopping.');
      process.exit(1);
    }

    console.log('\nTestnet validation passed!');
  }

  // Mainnet phase
  console.log('\n\nMAINNET PHASE');

  if (dryRun) {
    await runSwapFlow(
      sdk,
      adapterType,
      ChainId.ARBITRUM,
      ChainId.OPTIMISM,
      '1000000',
      true,
      'Mainnet (Arbitrum -> Optimism)',
    );
  } else {
    const answer = await prompt('\nProceed with MAINNET swap? This uses REAL funds. (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('Mainnet swap cancelled.');
      process.exit(0);
    }

    await runSwapFlow(
      sdk,
      adapterType,
      ChainId.ARBITRUM,
      ChainId.OPTIMISM,
      '1000000',
      false,
      'Mainnet (Arbitrum -> Optimism)',
    );
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
