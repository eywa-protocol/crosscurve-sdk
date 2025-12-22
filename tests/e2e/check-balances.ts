#!/usr/bin/env npx tsx
/**
 * @fileoverview CLI tool for checking wallet balances across supported chains/tokens
 *
 * Fetches allowed tokens and chains from CrossCurve API, then checks balances
 * of the provided wallet address on each chain.
 *
 * Usage:
 *   npx tsx tests/e2e/check-balances.ts --wallet <address> [options]
 *
 * Required:
 *   --wallet        Wallet address to check balances for
 *
 * Optional:
 *   --chains        Comma-separated list of chain IDs to check (default: all)
 *   --minBalance    Minimum balance to display (default: 0)
 *   --output        Output format: json, table, summary (default: summary)
 *   --showZero      Show tokens with zero balance (default: false)
 *
 * Example:
 *   npx tsx tests/e2e/check-balances.ts --wallet 0x750035feead93d8e56656d0e1f398fba3b3866d5
 */

import { createPublicClient, http, formatUnits, type PublicClient } from 'viem';
import { mainnet, arbitrum, optimism, polygon, avalanche, bsc, base, linea, scroll, zksync } from 'viem/chains';
import { CrossCurveSDK } from '../../src/sdk.js';
import type { Chain, Token } from '../../src/types/index.js';

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Native token address patterns
const NATIVE_TOKEN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
];

// Chain ID to viem chain mapping
const CHAIN_MAP: Record<number, any> = {
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  43114: avalanche,
  56: bsc,
  8453: base,
  59144: linea,
  534352: scroll,
  324: zksync,
};

// Public RPC endpoints (fallbacks)
const RPC_ENDPOINTS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  137: 'https://polygon-rpc.com',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  56: 'https://bsc-dataseed.binance.org',
  8453: 'https://mainnet.base.org',
  59144: 'https://rpc.linea.build',
  534352: 'https://rpc.scroll.io',
  324: 'https://mainnet.era.zksync.io',
};

interface CliArgs {
  wallet: string;
  chains?: number[];
  minBalance: number;
  output: 'json' | 'table' | 'summary';
  showZero: boolean;
}

interface TokenBalance {
  chain: Chain;
  token: Token;
  balance: bigint;
  formattedBalance: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = {
    minBalance: 0,
    output: 'summary',
    showZero: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.replace(/^--/, '');
    const value = args[i + 1];

    switch (key) {
      case 'wallet':
        parsed.wallet = value;
        i++;
        break;
      case 'chains':
        parsed.chains = value.split(',').map(c => parseInt(c, 10));
        i++;
        break;
      case 'minBalance':
        parsed.minBalance = parseFloat(value);
        i++;
        break;
      case 'output':
        parsed.output = value as 'json' | 'table' | 'summary';
        i++;
        break;
      case 'showZero':
        parsed.showZero = value === 'true';
        i++;
        break;
      case 'help':
      case 'h':
        printUsage();
        process.exit(0);
    }
  }

  if (!parsed.wallet) {
    console.error('Missing required argument: --wallet');
    printUsage();
    process.exit(1);
  }

  return parsed as CliArgs;
}

function printUsage(): void {
  console.log(`
Usage: npx tsx tests/e2e/check-balances.ts [options]

Required:
  --wallet        Wallet address to check balances for

Optional:
  --chains        Comma-separated chain IDs to check (default: all)
  --minBalance    Minimum balance to display (default: 0)
  --output        Output format: json, table, summary (default: summary)
  --showZero      Show tokens with zero balance (true/false, default: false)
  --help          Show this help message

Example:
  npx tsx tests/e2e/check-balances.ts --wallet 0x750035feead93d8e56656d0e1f398fba3b3866d5
`);
}

function isNativeToken(address: string): boolean {
  return NATIVE_TOKEN_ADDRESSES.includes(address.toLowerCase());
}

function getPublicClient(chainId: number): PublicClient | null {
  const chain = CHAIN_MAP[chainId];
  const rpcUrl = RPC_ENDPOINTS[chainId];

  if (!rpcUrl) {
    return null;
  }

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

async function getTokenBalance(
  client: PublicClient,
  tokenAddress: string,
  walletAddress: string,
  chainId: number
): Promise<bigint> {
  try {
    if (isNativeToken(tokenAddress)) {
      return await client.getBalance({ address: walletAddress as `0x${string}` });
    }

    const balance = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    });

    return balance;
  } catch (error) {
    // Token might not exist or contract call failed
    return 0n;
  }
}

async function checkBalances(
  wallet: string,
  chains: Chain[],
  tokens: Token[],
  filterChainIds?: number[]
): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];
  const clientCache = new Map<number, PublicClient>();

  // Filter chains if specified
  const targetChains = filterChainIds
    ? chains.filter(c => filterChainIds.includes(c.id))
    : chains;

  console.log(`\nChecking balances for wallet: ${wallet}`);
  console.log(`Chains to check: ${targetChains.map(c => c.name).join(', ')}`);

  for (const chain of targetChains) {
    let client = clientCache.get(chain.id);
    if (!client) {
      client = getPublicClient(chain.id) as PublicClient;
      if (!client) {
        console.log(`  Skipping chain ${chain.name} (${chain.id}) - no RPC available`);
        continue;
      }
      clientCache.set(chain.id, client);
    }

    const chainTokens = tokens.filter(t => t.chainId === chain.id);
    console.log(`\n  Checking ${chain.name} (${chainTokens.length} tokens)...`);

    let checkedCount = 0;
    for (const token of chainTokens) {
      const balance = await getTokenBalance(client, token.address, wallet, chain.id);
      checkedCount++;

      if (checkedCount % 10 === 0) {
        process.stdout.write(`    Progress: ${checkedCount}/${chainTokens.length}\r`);
      }

      if (balance > 0n) {
        const formattedBalance = formatUnits(balance, token.decimals);
        balances.push({
          chain,
          token,
          balance,
          formattedBalance,
        });
      }
    }
    console.log(`    Completed: ${checkedCount}/${chainTokens.length}`);
  }

  return balances;
}

function printSummary(balances: TokenBalance[], args: CliArgs): void {
  console.log('\n=== Wallet Balance Summary ===\n');
  console.log(`Wallet: ${args.wallet}`);
  console.log(`Tokens with balance: ${balances.length}`);

  if (balances.length === 0) {
    console.log('\nNo tokens found with balance.');
    return;
  }

  // Group by chain
  const byChain = new Map<number, TokenBalance[]>();
  for (const b of balances) {
    const chainBalances = byChain.get(b.chain.id) || [];
    chainBalances.push(b);
    byChain.set(b.chain.id, chainBalances);
  }

  for (const [chainId, chainBalances] of byChain) {
    const chainName = chainBalances[0].chain.name;
    console.log(`\n${chainName} (Chain ID: ${chainId}):`);

    // Sort by formatted balance descending
    chainBalances.sort((a, b) => {
      const aVal = parseFloat(a.formattedBalance);
      const bVal = parseFloat(b.formattedBalance);
      return bVal - aVal;
    });

    for (const b of chainBalances) {
      const formatted = parseFloat(b.formattedBalance).toFixed(6);
      const native = isNativeToken(b.token.address) ? ' (native)' : '';
      console.log(`  ${b.token.symbol.padEnd(10)} ${formatted.padStart(20)}${native}`);
      console.log(`    Address: ${b.token.address}`);
    }
  }

  // Summary stats
  console.log('\n--- Summary ---');
  console.log(`Total chains with balance: ${byChain.size}`);
  console.log(`Total tokens with balance: ${balances.length}`);
}

function printTable(balances: TokenBalance[]): void {
  console.log('\n┌──────────┬──────────────┬──────────────────────┬──────────────────────────────────────────────┐');
  console.log('│ Chain    │ Symbol       │ Balance              │ Address                                      │');
  console.log('├──────────┼──────────────┼──────────────────────┼──────────────────────────────────────────────┤');

  for (const b of balances) {
    const chain = b.chain.name.slice(0, 8).padEnd(8);
    const symbol = b.token.symbol.slice(0, 12).padEnd(12);
    const balance = parseFloat(b.formattedBalance).toFixed(6).slice(0, 20).padEnd(20);
    const address = b.token.address.slice(0, 44).padEnd(44);
    console.log(`│ ${chain} │ ${symbol} │ ${balance} │ ${address} │`);
  }

  console.log('└──────────┴──────────────┴──────────────────────┴──────────────────────────────────────────────┘');
}

function printJson(balances: TokenBalance[]): void {
  const output = balances.map(b => ({
    chain: {
      id: b.chain.id,
      name: b.chain.name,
    },
    token: {
      address: b.token.address,
      symbol: b.token.symbol,
      decimals: b.token.decimals,
    },
    balance: b.balance.toString(),
    formattedBalance: b.formattedBalance,
  }));

  console.log(JSON.stringify(output, null, 2));
}

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('Initializing CrossCurve SDK...');
  const sdk = new CrossCurveSDK();

  console.log('Loading chains and tokens from API...');
  await sdk.init();

  const chains = [...sdk.chains];
  const allTokens: Token[] = [];
  for (const [, tokens] of sdk.tokens) {
    allTokens.push(...tokens);
  }

  console.log(`Loaded ${chains.length} chains and ${allTokens.length} tokens`);

  const balances = await checkBalances(args.wallet, chains, allTokens, args.chains);

  // Filter by minimum balance
  const filtered = balances.filter(b => {
    const value = parseFloat(b.formattedBalance);
    return args.showZero || value >= args.minBalance;
  });

  switch (args.output) {
    case 'json':
      printJson(filtered);
      break;
    case 'table':
      printTable(filtered);
      break;
    case 'summary':
    default:
      printSummary(filtered, args);
      break;
  }
}

main().catch(error => {
  console.error('\nError:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
