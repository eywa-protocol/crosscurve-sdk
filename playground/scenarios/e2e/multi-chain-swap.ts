import 'dotenv/config';
import { CrossCurveSDK, ChainId } from '@crosscurve/sdk';
import { getToken } from '../../config/index.js';
import { getAdapter, type AdapterType } from '../../adapters/index.js';
import { parseArgs } from 'node:util';

interface SwapLeg {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
}

async function main() {
  const { values } = parseArgs({
    options: {
      adapter: { type: 'string', default: 'viem' },
      'dry-run': { type: 'boolean', default: true },
    },
  });

  const adapterType = values.adapter as AdapterType;
  const dryRun = values['dry-run'];

  console.log('=== Multi-Chain Swap E2E Test ===\n');
  console.log(`Adapter: ${adapterType}`);
  console.log(`Dry run: ${dryRun}\n`);

  // Define swap path: Arbitrum USDC -> Optimism USDC -> Base USDC
  const swapLegs: SwapLeg[] = [
    {
      fromChain: ChainId.ARBITRUM,
      toChain: ChainId.OPTIMISM,
      fromToken: 'USDC',
      toToken: 'USDC',
    },
    {
      fromChain: ChainId.OPTIMISM,
      toChain: ChainId.BASE,
      fromToken: 'USDC',
      toToken: 'USDC',
    },
  ];

  console.log('Swap path:');
  for (let i = 0; i < swapLegs.length; i++) {
    const leg = swapLegs[i];
    console.log(`  Leg ${i + 1}: ${leg.fromToken} (chain ${leg.fromChain}) -> ${leg.toToken} (chain ${leg.toChain})`);
  }
  console.log();

  const sdk = new CrossCurveSDK();
  await sdk.init();

  let currentAmount = '1000000'; // Start with 1 USDC

  for (let i = 0; i < swapLegs.length; i++) {
    const leg = swapLegs[i];
    console.log(`\n--- Leg ${i + 1}/${swapLegs.length} ---`);

    const fromToken = getToken(leg.fromChain, leg.fromToken);
    const toToken = getToken(leg.toChain, leg.toToken);

    const signer = getAdapter(adapterType, leg.fromChain);
    const sender = await signer.getAddress();

    console.log(`From: ${currentAmount} ${fromToken.symbol} on chain ${leg.fromChain}`);
    console.log(`To: ${toToken.symbol} on chain ${leg.toChain}`);

    const quote = await sdk.getQuote({
      fromChain: leg.fromChain,
      toChain: leg.toChain,
      fromToken: fromToken.address,
      toToken: toToken.address,
      amount: currentAmount,
      slippage: 0.5,
      sender,
    });

    console.log(`Quote: ${quote.estimatedOutput} ${toToken.symbol}`);

    if (dryRun) {
      console.log('SKIPPED (dry run)');
      currentAmount = quote.estimatedOutput;
    } else {
      console.log('Executing...');
      const result = await sdk.executeQuote(quote, {
        signer,
        autoRecover: true,
      });

      console.log(`TX: ${result.transactionHash}`);

      // Wait for completion before next leg
      let status = await sdk.trackTransaction(result.requestId!);
      while (status.status !== 'completed' && status.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 15000));
        status = await sdk.trackTransaction(result.requestId!);
        console.log(`Status: ${status.status}`);
      }

      if (status.status === 'failed') {
        console.log('Swap failed. Stopping multi-chain flow.');
        break;
      }

      // Use output for next leg (would need to query actual balance in production)
      currentAmount = quote.minOutput;
    }
  }

  console.log(`\n\nFinal amount: ~${currentAmount} USDC on Base`);
  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
