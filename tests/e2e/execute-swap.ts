#!/usr/bin/env npx tsx
/**
 * @fileoverview CLI tool for executing swaps via CrossCurve SDK
 *
 * Usage:
 *   npx tsx tests/e2e/execute-swap.ts --tokenIn <address> --tokenOut <address> --chainIdIn <id> --chainIdOut <id> --amountIn <amount> --privateKey <key> [options]
 */

import { readFileSync, existsSync } from 'fs';
import { formatUnits } from 'viem';
import { privateKeyToAccount, mnemonicToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http } from 'viem';

// Load .env.test manually
function loadEnv(): void {
  const envPath = '.env.test';
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
loadEnv();
import { arbitrum, optimism, avalanche, bsc } from 'viem/chains';
import { CrossCurveSDK } from '../../src/sdk.js';
import { ViemAdapter } from '../../src/infrastructure/adapters/ViemAdapter.js';
import type { RouteProviderValue } from '../../src/constants/providers.js';

const CHAINS: Record<number, any> = {
  42161: arbitrum,
  10: optimism,
  43114: avalanche,
  56: bsc,
};

interface CliArgs {
  tokenIn: string;
  tokenOut: string;
  chainIdIn: number;
  chainIdOut: number;
  amountIn: string;
  slippage: number;
  privateKey?: string;
  mnemonic?: string;
  providers?: RouteProviderValue[];
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = { slippage: 1, dryRun: false };

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
      case 'privateKey': parsed.privateKey = value; i++; break;
      case 'mnemonic': parsed.mnemonic = value; i++; break;
      case 'providers': parsed.providers = value.split(',') as RouteProviderValue[]; i++; break;
      case 'dryRun': parsed.dryRun = true; break;
      case 'help': case 'h':
        console.log(`Usage: npx tsx tests/e2e/execute-swap.ts [options]

Required:
  --tokenIn      Source token address
  --tokenOut     Destination token address
  --chainIdIn    Source chain ID
  --chainIdOut   Destination chain ID
  --amountIn     Amount in wei

Signing (one of):
  --privateKey   Private key (or PRIVATE_KEY env)
  --mnemonic     Mnemonic phrase (or TEST_MNEMONIC env from .env.test)

Optional:
  --slippage     Slippage tolerance in % (default: 1)
  --providers    Comma-separated providers (cross-curve,rubic,bungee)
  --dryRun       Only get quote, don't execute
  --help         Show this help
`);
        process.exit(0);
    }
  }

  parsed.privateKey = parsed.privateKey || process.env.PRIVATE_KEY;
  parsed.mnemonic = parsed.mnemonic || process.env.TEST_MNEMONIC;

  const required = ['tokenIn', 'tokenOut', 'chainIdIn', 'chainIdOut', 'amountIn'] as const;
  const missing = required.filter(k => !parsed[k]);
  if (missing.length > 0) {
    console.error(`Missing: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (!parsed.privateKey && !parsed.mnemonic) {
    console.error('Missing: privateKey or mnemonic');
    process.exit(1);
  }

  return parsed as CliArgs;
}

async function main(): Promise<void> {
  const args = parseArgs();

  const sdk = new CrossCurveSDK();
  await sdk.init();

  const tokenIn = sdk.getToken(args.chainIdIn, args.tokenIn);
  const tokenOut = sdk.getToken(args.chainIdOut, args.tokenOut);
  const chainIn = sdk.chains.find(c => c.id === args.chainIdIn);
  const chainOut = sdk.chains.find(c => c.id === args.chainIdOut);

  console.log(`\n${chainIn?.name || args.chainIdIn} ${tokenIn?.symbol || args.tokenIn}`);
  console.log(`  -> ${chainOut?.name || args.chainIdOut} ${tokenOut?.symbol || args.tokenOut}`);
  console.log(`Amount: ${tokenIn ? formatUnits(BigInt(args.amountIn), tokenIn.decimals) : args.amountIn} ${tokenIn?.symbol || ''}`);

  // Create account from privateKey or mnemonic
  const account = args.privateKey
    ? privateKeyToAccount(args.privateKey as `0x${string}`)
    : mnemonicToAccount(args.mnemonic!);
  const chain = CHAINS[args.chainIdIn];
  if (!chain) {
    throw new Error(`Unsupported chain: ${args.chainIdIn}`);
  }

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const signer = new ViemAdapter(walletClient, publicClient, account);
  const sender = await signer.getAddress();

  console.log(`Sender: ${sender}`);

  // Get quote
  console.log('\nGetting quote...');
  const quote = await sdk.getQuote({
    fromChain: args.chainIdIn,
    toChain: args.chainIdOut,
    fromToken: args.tokenIn,
    toToken: args.tokenOut,
    amount: args.amountIn,
    slippage: args.slippage,
    sender,
    providers: args.providers,
  });

  const amountOut = tokenOut ? formatUnits(BigInt(quote.amountOut), tokenOut.decimals) : quote.amountOut;
  const fee = quote.deliveryFee?.usd ? `$${quote.deliveryFee.usd.toFixed(2)} fee` : '';

  console.log(`Quote: ${amountOut} ${tokenOut?.symbol || ''} ${fee}`);
  console.log(`Provider: ${quote.provider}`);

  if (quote.route?.length) {
    console.log('Route:');
    quote.route.forEach((step, i) => {
      const from = step.fromToken?.symbol || tokenIn?.symbol || '?';
      const to = step.toToken?.symbol || tokenOut?.symbol || '?';
      console.log(`  ${i + 1}. [${step.type}] ${from} -> ${to}`);
    });
  }

  if (args.dryRun) {
    console.log('\n--dryRun: Skipping execution');
    return;
  }

  // Execute
  console.log('\nExecuting swap...');
  const result = await sdk.executeQuote(quote, { signer });

  console.log('\n=== Execution Result ===');
  console.log(`Status: ${result.status}`);
  console.log(`TX Hash: ${result.transactionHash}`);
  if (result.requestId) {
    console.log(`Request ID: ${result.requestId}`);
  }

  // Track until complete
  console.log('\n=== Tracking ===');
  const terminalStatuses = ['completed', 'failed', 'refunded'];
  let lastStatus = '';

  while (true) {
    const status = await sdk.trackExecuteResult(result);
    const currentStatus = status.status;

    if (currentStatus !== lastStatus) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Status: ${currentStatus}`);

      if (status.source?.hash) {
        console.log(`  Source TX: ${status.source.hash}`);
      }
      if (status.destination?.hash) {
        console.log(`  Dest TX: ${status.destination.hash}`);
      }
      if (status.oracle?.requestId) {
        console.log(`  Request ID: ${status.oracle.requestId}`);
      }

      lastStatus = currentStatus;
    }

    if (terminalStatuses.includes(currentStatus)) {
      console.log(`\nFinal status: ${currentStatus}`);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  if (process.env.DEBUG) {
    console.error(e.stack);
  }
  process.exit(1);
});
