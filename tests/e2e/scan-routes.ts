#!/usr/bin/env npx tsx
/**
 * @fileoverview CLI tool for validating route parameters using Tier 1 API
 *
 * Loads chains and tokens from the API, validates provided parameters,
 * and displays token information. Uses only Tier 1 (data) endpoints.
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
 *   --output        Output format: json, table, summary (default: summary)
 *
 * Examples:
 *   # USDT on Arbitrum to USDT on Optimism
 *   npx tsx tests/e2e/scan-routes.ts \
 *     --tokenIn 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 \
 *     --tokenOut 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58 \
 *     --chainIdIn 42161 \
 *     --chainIdOut 10 \
 *     --amountIn 1000000
 */

import { formatUnits } from 'viem';
import { CrossCurveSDK } from '../../src/sdk.js';
import type { Chain, Token } from '../../src/types/index.js';

interface CliArgs {
  tokenIn: string;
  tokenOut: string;
  chainIdIn: number;
  chainIdOut: number;
  amountIn: string;
  output: 'json' | 'table' | 'summary';
}

interface ValidationResult {
  chainIn: Chain | null;
  chainOut: Chain | null;
  tokenIn: Token | null;
  tokenOut: Token | null;
  amountIn: string;
  formattedAmountIn: string | null;
  errors: string[];
  warnings: string[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = {
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
  --output        Output format: json, table, summary (default: summary)
  --help          Show this help message

Example:
  npx tsx tests/e2e/scan-routes.ts \\
    --tokenIn 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 \\
    --tokenOut 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58 \\
    --chainIdIn 42161 \\
    --chainIdOut 10 \\
    --amountIn 1000000
`);
}

function findChain(chains: readonly Chain[], chainId: number): Chain | null {
  return chains.find(c => c.id === chainId) ?? null;
}

function findToken(tokens: ReadonlyMap<number, readonly Token[]>, chainId: number, address: string): Token | null {
  const chainTokens = tokens.get(chainId);
  if (!chainTokens) return null;
  return chainTokens.find(t => t.address.toLowerCase() === address.toLowerCase()) ?? null;
}

async function validateRoute(sdk: CrossCurveSDK, args: CliArgs): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Find chains
  const chainIn = findChain(sdk.chains, args.chainIdIn);
  const chainOut = findChain(sdk.chains, args.chainIdOut);

  if (!chainIn) {
    errors.push(`Source chain ${args.chainIdIn} not found in supported chains`);
  }
  if (!chainOut) {
    errors.push(`Destination chain ${args.chainIdOut} not found in supported chains`);
  }

  // Find tokens
  const tokenIn = findToken(sdk.tokens, args.chainIdIn, args.tokenIn);
  const tokenOut = findToken(sdk.tokens, args.chainIdOut, args.tokenOut);

  if (!tokenIn) {
    errors.push(`Source token ${args.tokenIn} not found on chain ${args.chainIdIn}`);
  }
  if (!tokenOut) {
    errors.push(`Destination token ${args.tokenOut} not found on chain ${args.chainIdOut}`);
  }

  // Format amount
  let formattedAmountIn: string | null = null;
  if (tokenIn) {
    try {
      formattedAmountIn = formatUnits(BigInt(args.amountIn), tokenIn.decimals);
    } catch {
      errors.push(`Invalid amountIn: ${args.amountIn}`);
    }
  }

  // Add warnings for token properties
  if (tokenIn && !tokenIn.permit) {
    warnings.push(`Source token ${tokenIn.symbol} does not support permit (will require approval tx)`);
  }
  if (tokenIn?.wrapped) {
    warnings.push(`Source token ${tokenIn.symbol} is a wrapped token`);
  }
  if (tokenOut?.wrapped) {
    warnings.push(`Destination token ${tokenOut.symbol} is a wrapped token`);
  }

  return {
    chainIn,
    chainOut,
    tokenIn,
    tokenOut,
    amountIn: args.amountIn,
    formattedAmountIn,
    errors,
    warnings,
  };
}

function printSummary(result: ValidationResult, args: CliArgs): void {
  console.log('\n=== Route Validation Results ===\n');

  // Source chain
  console.log('Source Chain:');
  if (result.chainIn) {
    console.log(`  ID:     ${result.chainIn.id}`);
    console.log(`  Name:   ${result.chainIn.name}`);
    console.log(`  Router: ${result.chainIn.router}`);
  } else {
    console.log(`  ERROR: Chain ${args.chainIdIn} not found`);
  }

  // Source token
  console.log('\nSource Token:');
  if (result.tokenIn) {
    console.log(`  Symbol:   ${result.tokenIn.symbol}`);
    console.log(`  Name:     ${result.tokenIn.name}`);
    console.log(`  Address:  ${result.tokenIn.address}`);
    console.log(`  Decimals: ${result.tokenIn.decimals}`);
    console.log(`  Permit:   ${result.tokenIn.permit ? 'Yes' : 'No'}`);
    if (result.tokenIn.tags && result.tokenIn.tags.length > 0) {
      console.log(`  Tags:     ${result.tokenIn.tags.join(', ')}`);
    }
  } else {
    console.log(`  ERROR: Token ${args.tokenIn} not found on chain ${args.chainIdIn}`);
  }

  // Destination chain
  console.log('\nDestination Chain:');
  if (result.chainOut) {
    console.log(`  ID:     ${result.chainOut.id}`);
    console.log(`  Name:   ${result.chainOut.name}`);
    console.log(`  Router: ${result.chainOut.router}`);
  } else {
    console.log(`  ERROR: Chain ${args.chainIdOut} not found`);
  }

  // Destination token
  console.log('\nDestination Token:');
  if (result.tokenOut) {
    console.log(`  Symbol:   ${result.tokenOut.symbol}`);
    console.log(`  Name:     ${result.tokenOut.name}`);
    console.log(`  Address:  ${result.tokenOut.address}`);
    console.log(`  Decimals: ${result.tokenOut.decimals}`);
    console.log(`  Permit:   ${result.tokenOut.permit ? 'Yes' : 'No'}`);
    if (result.tokenOut.tags && result.tokenOut.tags.length > 0) {
      console.log(`  Tags:     ${result.tokenOut.tags.join(', ')}`);
    }
  } else {
    console.log(`  ERROR: Token ${args.tokenOut} not found on chain ${args.chainIdOut}`);
  }

  // Amount
  console.log('\nAmount:');
  console.log(`  Raw:       ${result.amountIn}`);
  if (result.formattedAmountIn && result.tokenIn) {
    console.log(`  Formatted: ${result.formattedAmountIn} ${result.tokenIn.symbol}`);
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }

  // Validation status
  console.log('\n--- Validation Status ---');
  if (result.errors.length === 0) {
    console.log('Valid: All parameters are valid for routing');
  } else {
    console.log(`Invalid: ${result.errors.length} error(s) found`);
  }
}

function printTable(result: ValidationResult): void {
  console.log('\n┌─────────────┬────────────────────────────────────────────────────┐');
  console.log('│ Field       │ Value                                              │');
  console.log('├─────────────┼────────────────────────────────────────────────────┤');

  const rows = [
    ['Chain In', result.chainIn ? `${result.chainIn.name} (${result.chainIn.id})` : 'NOT FOUND'],
    ['Token In', result.tokenIn ? `${result.tokenIn.symbol} - ${result.tokenIn.address.slice(0, 20)}...` : 'NOT FOUND'],
    ['Chain Out', result.chainOut ? `${result.chainOut.name} (${result.chainOut.id})` : 'NOT FOUND'],
    ['Token Out', result.tokenOut ? `${result.tokenOut.symbol} - ${result.tokenOut.address.slice(0, 20)}...` : 'NOT FOUND'],
    ['Amount', result.formattedAmountIn ? `${result.formattedAmountIn} ${result.tokenIn?.symbol || ''}` : result.amountIn],
    ['Valid', result.errors.length === 0 ? 'Yes' : 'No'],
  ];

  rows.forEach(([field, value]) => {
    console.log(`│ ${field.padEnd(11)} │ ${String(value).slice(0, 50).padEnd(50)} │`);
  });

  console.log('└─────────────┴────────────────────────────────────────────────────┘');
}

function printJson(result: ValidationResult): void {
  const output = {
    valid: result.errors.length === 0,
    chainIn: result.chainIn ? {
      id: result.chainIn.id,
      name: result.chainIn.name,
      router: result.chainIn.router,
    } : null,
    chainOut: result.chainOut ? {
      id: result.chainOut.id,
      name: result.chainOut.name,
      router: result.chainOut.router,
    } : null,
    tokenIn: result.tokenIn ? {
      address: result.tokenIn.address,
      symbol: result.tokenIn.symbol,
      name: result.tokenIn.name,
      decimals: result.tokenIn.decimals,
      permit: result.tokenIn.permit,
      tags: result.tokenIn.tags,
    } : null,
    tokenOut: result.tokenOut ? {
      address: result.tokenOut.address,
      symbol: result.tokenOut.symbol,
      name: result.tokenOut.name,
      decimals: result.tokenOut.decimals,
      permit: result.tokenOut.permit,
      tags: result.tokenOut.tags,
    } : null,
    amount: {
      raw: result.amountIn,
      formatted: result.formattedAmountIn,
    },
    errors: result.errors,
    warnings: result.warnings,
  };

  console.log(JSON.stringify(output, null, 2));
}

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('Initializing CrossCurve SDK...');
  const sdk = new CrossCurveSDK();

  console.log('Loading chains and tokens from API (Tier 1)...');
  await sdk.init();

  console.log(`Loaded ${sdk.chains.length} chains and ${[...sdk.tokens.values()].flat().length} tokens`);

  console.log('Validating route parameters...');
  const result = await validateRoute(sdk, args);

  switch (args.output) {
    case 'json':
      printJson(result);
      break;
    case 'table':
      printTable(result);
      break;
    case 'summary':
    default:
      printSummary(result, args);
      break;
  }

  // Exit with error code if validation failed
  if (result.errors.length > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\nError:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
