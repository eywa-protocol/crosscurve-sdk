#!/usr/bin/env npx tsx
/**
 * @fileoverview CLI tool for scanning routes via CrossCurve API
 *
 * Usage:
 *   npx tsx tests/e2e/scan-routes.ts --tokenIn <address> --tokenOut <address> --chainIdIn <id> --chainIdOut <id> --amountIn <amount> [options]
 *
 * Required:
 *   --tokenIn       Source token address
 *   --tokenOut      Destination token address
 *   --chainIdIn     Source chain ID
 *   --chainIdOut    Destination chain ID
 *   --amountIn      Amount in smallest units (wei for ETH, etc.)
 *
 * Optional:
 *   --slippage      Slippage tolerance in percent (default: 1)
 *   --from          Sender address
 *   --providers     Comma-separated list of providers (crosscurve,rubic,bungee)
 *   --feeFromAmount Whether to deduct fee from amount (default: false)
 *   --feeToken      Token address for fee payment
 *   --output        Output format: json, table, summary (default: summary)
 *
 * Examples:
 *   # USDT on Arbitrum to USDT on Optimism
 *   npx tsx tests/e2e/scan-routes.ts \
 *     --tokenIn 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 \
 *     --tokenOut 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58 \
 *     --chainIdIn 42161 \
 *     --chainIdOut 10 \
 *     --amountIn 1000000 \
 *     --slippage 0.5
 */

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
  feeFromAmount?: boolean;
  feeToken?: string;
  output: 'json' | 'table' | 'summary';
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = {
    slippage: 1,
    output: 'summary',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.replace(/^--/, '');
    const value = args[i + 1];

    switch (key) {
      case 'tokenIn':
        parsed.tokenIn = value;
        i++;
        break;
      case 'tokenOut':
        parsed.tokenOut = value;
        i++;
        break;
      case 'chainIdIn':
        parsed.chainIdIn = parseInt(value, 10);
        i++;
        break;
      case 'chainIdOut':
        parsed.chainIdOut = parseInt(value, 10);
        i++;
        break;
      case 'amountIn':
        parsed.amountIn = value;
        i++;
        break;
      case 'slippage':
        parsed.slippage = parseFloat(value);
        i++;
        break;
      case 'from':
        parsed.from = value;
        i++;
        break;
      case 'providers':
        parsed.providers = value.split(',') as RouteProviderValue[];
        i++;
        break;
      case 'feeFromAmount':
        parsed.feeFromAmount = value === 'true';
        i++;
        break;
      case 'feeToken':
        parsed.feeToken = value;
        i++;
        break;
      case 'output':
        parsed.output = value as 'json' | 'table' | 'summary';
        i++;
        break;
      case 'help':
      case 'h':
        printUsage();
        process.exit(0);
    }
  }

  // Validate required args
  const required = ['tokenIn', 'tokenOut', 'chainIdIn', 'chainIdOut', 'amountIn'] as const;
  const missing = required.filter(key => parsed[key] === undefined);

  if (missing.length > 0) {
    console.error(`Missing required arguments: ${missing.join(', ')}`);
    printUsage();
    process.exit(1);
  }

  return parsed as CliArgs;
}

function printUsage(): void {
  console.log(`
Usage: npx tsx tests/e2e/scan-routes.ts [options]

Required:
  --tokenIn       Source token address
  --tokenOut      Destination token address
  --chainIdIn     Source chain ID
  --chainIdOut    Destination chain ID
  --amountIn      Amount in smallest units

Optional:
  --slippage      Slippage tolerance in percent (default: 1)
  --from          Sender address
  --providers     Comma-separated providers (crosscurve,rubic,bungee)
  --feeFromAmount Deduct fee from amount (true/false)
  --feeToken      Token address for fee
  --output        Output format: json, table, summary (default: summary)
  --help          Show this help message
`);
}

function formatAmount(amount: string, decimals: number = 18): string {
  const num = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = num / divisor;
  const fraction = num % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 6);
  return `${whole}.${fractionStr}`;
}

function printSummary(routes: any[], args: CliArgs): void {
  console.log('\n=== Route Scan Results ===\n');

  console.log('Request:');
  console.log(`  From Chain: ${args.chainIdIn}`);
  console.log(`  To Chain: ${args.chainIdOut}`);
  console.log(`  Token In: ${args.tokenIn}`);
  console.log(`  Token Out: ${args.tokenOut}`);
  console.log(`  Amount In: ${args.amountIn}`);
  console.log(`  Slippage: ${args.slippage}%`);

  if (!routes || routes.length === 0) {
    console.log('\nNo routes found.');
    return;
  }

  console.log(`\nFound ${routes.length} route(s):\n`);

  routes.forEach((route, routeIndex) => {
    console.log(`--- Route ${routeIndex + 1} ---`);
    console.log(`  Amount Out: ${route.amountOut}`);
    console.log(`  Amount Out Min: ${route.amountOutMin}`);
    console.log(`  Execution Time: ${route.executionTime}s`);
    console.log(`  Route Steps: ${route.route?.length || 0}`);

    if (route.route && route.route.length > 0) {
      console.log('  Path:');
      route.route.forEach((step: any, index: number) => {
        const type = step.type || 'unknown';
        const fromToken = step.fromToken?.symbol || step.params?.tokenIn?.symbol || '?';
        const toToken = step.toToken?.symbol || step.params?.tokenOut?.symbol || '?';
        console.log(`    ${index + 1}. [${type}] ${fromToken} -> ${toToken}`);
      });
    }

    if (route.warnings && route.warnings.length > 0) {
      console.log('  Warnings:');
      route.warnings.forEach((warning: any) => {
        console.log(`    - ${warning.type}: ${warning.message || warning.value || ''}`);
      });
    }

    if (route.tags && route.tags.length > 0) {
      console.log(`  Tags: ${route.tags.join(', ')}`);
    }
    console.log('');
  });
}

function printTable(routes: any[]): void {
  if (!routes || routes.length === 0) {
    console.log('\nNo routes found.');
    return;
  }

  console.log('\n┌───┬──────────────────┬──────────────────┬───────────┬───────┬──────────┐');
  console.log('│ # │ Amount Out       │ Amount Out Min   │ Time (s)  │ Steps │ Tags     │');
  console.log('├───┼──────────────────┼──────────────────┼───────────┼───────┼──────────┤');

  routes.forEach((route, index) => {
    const num = String(index + 1).padEnd(1);
    const amountOut = String(route.amountOut || 'N/A').slice(0, 16).padEnd(16);
    const amountOutMin = String(route.amountOutMin || 'N/A').slice(0, 16).padEnd(16);
    const time = String(route.executionTime || 0).slice(0, 9).padEnd(9);
    const steps = String(route.route?.length || 0).padEnd(5);
    const tags = (route.tags || []).join(',').slice(0, 8).padEnd(8);
    console.log(`│ ${num} │ ${amountOut} │ ${amountOutMin} │ ${time} │ ${steps} │ ${tags} │`);
  });

  console.log('└───┴──────────────────┴──────────────────┴───────────┴───────┴──────────┘');
}

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('Initializing CrossCurve SDK...');
  const sdk = new CrossCurveSDK();

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
    feeFromAmount: args.feeFromAmount,
    feeToken: args.feeToken,
  };

  console.log('Scanning routes...');

  try {
    const response = await sdk.routing.scan(request);

    switch (args.output) {
      case 'json':
        console.log(JSON.stringify(response, null, 2));
        break;
      case 'table':
        printTable(response);
        break;
      case 'summary':
      default:
        printSummary(response, args);
        break;
    }
  } catch (error) {
    console.error('\nError scanning routes:');
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
