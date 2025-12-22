#!/usr/bin/env npx tsx
/**
 * @fileoverview CLI tool for scanning routes via CrossCurve SDK
 *
 * Uses sdk.init() to load chains/tokens, then sdk.routing.scan() to find routes.
 *
 * Usage:
 *   npx tsx tests/e2e/scan-routes.ts --tokenIn <address> --tokenOut <address> --chainIdIn <id> --chainIdOut <id> --amountIn <amount> [options]
 */

import { formatUnits } from 'viem';
import { CrossCurveSDK } from '../../src/sdk.js';
import type { RoutingScanRequest } from '../../src/types/api/requests.js';
import type { RouteProviderValue } from '../../src/constants/providers.js';

interface CliArgs {
  tokenIn: string;
  tokenOut: string;
  chainIdIn: number;
  chainIdOut: number;
  amountIn: string;
  slippage: number;
  from?: string;
  providers?: RouteProviderValue[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = { slippage: 1 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = args[i + 1];

    switch (key) {
      case 'tokenIn': parsed.tokenIn = value; i++; break;
      case 'tokenOut': parsed.tokenOut = value; i++; break;
      case 'chainIdIn': parsed.chainIdIn = parseInt(value, 10); i++; break;
      case 'chainIdOut': parsed.chainIdOut = parseInt(value, 10); i++; break;
      case 'amountIn': parsed.amountIn = value; i++; break;
      case 'slippage': parsed.slippage = parseFloat(value); i++; break;
      case 'from': parsed.from = value; i++; break;
      case 'providers': parsed.providers = value.split(',') as RouteProviderValue[]; i++; break;
      case 'help': case 'h':
        console.log(`Usage: npx tsx tests/e2e/scan-routes.ts --tokenIn <addr> --tokenOut <addr> --chainIdIn <id> --chainIdOut <id> --amountIn <amount> [--slippage <pct>] [--from <addr>] [--providers <list>]`);
        process.exit(0);
    }
  }

  const required = ['tokenIn', 'tokenOut', 'chainIdIn', 'chainIdOut', 'amountIn'] as const;
  const missing = required.filter(k => parsed[k] === undefined);
  if (missing.length > 0) {
    console.error(`Missing: ${missing.join(', ')}`);
    process.exit(1);
  }

  return parsed as CliArgs;
}

async function main(): Promise<void> {
  const args = parseArgs();

  const sdk = new CrossCurveSDK();
  await sdk.init();

  // Lookup tokens for display
  const tokenIn = sdk.getToken(args.chainIdIn, args.tokenIn);
  const tokenOut = sdk.getToken(args.chainIdOut, args.tokenOut);
  const chainIn = sdk.chains.find(c => c.id === args.chainIdIn);
  const chainOut = sdk.chains.find(c => c.id === args.chainIdOut);

  console.log(`\n${chainIn?.name || args.chainIdIn} ${tokenIn?.symbol || args.tokenIn} -> ${chainOut?.name || args.chainIdOut} ${tokenOut?.symbol || args.tokenOut}`);
  console.log(`Amount: ${tokenIn ? formatUnits(BigInt(args.amountIn), tokenIn.decimals) : args.amountIn} ${tokenIn?.symbol || ''}`);

  const request: RoutingScanRequest = {
    params: {
      tokenIn: args.tokenIn,
      tokenOut: args.tokenOut,
      chainIdIn: args.chainIdIn,
      chainIdOut: args.chainIdOut,
      amountIn: args.amountIn,
    },
    slippage: args.slippage,
    from: args.from,
    providers: args.providers,
  };

  const routes = await sdk.routing.scan(request);

  console.log(`\nFound ${routes.length} route(s):\n`);

  routes.forEach((route, i) => {
    const amountOut = tokenOut ? formatUnits(BigInt(route.amountOut), tokenOut.decimals) : route.amountOut;
    const fee = route.deliveryFee?.usd ? `$${route.deliveryFee.usd.toFixed(2)} fee` : '';
    console.log(`${i + 1}. ${amountOut} ${tokenOut?.symbol || ''} ${fee}`);

    if (route.route?.length) {
      route.route.forEach((step: any, j: number) => {
        const from = step.fromToken?.symbol || step.params?.tokenIn?.symbol || '?';
        const to = step.toToken?.symbol || step.params?.tokenOut?.symbol || '?';
        console.log(`   ${j + 1}. [${step.type}] ${from} -> ${to}`);
      });
    }
  });
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
