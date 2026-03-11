import { parseAbi, formatUnits, formatEther, type PublicClient } from 'viem';

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
]);

export interface BalanceSnapshot {
  eth: bigint;
  tokens: Map<string, bigint>;
}

export interface BalanceDelta {
  eth: bigint;
  tokens: Map<string, bigint>;
}

/**
 * Snapshot ETH + ERC-20 balances for an address
 */
export async function getBalances(
  client: PublicClient,
  address: string,
  tokenAddresses: string[],
): Promise<BalanceSnapshot> {
  const [eth, ...tokenBalances] = await Promise.all([
    client.getBalance({ address: address as `0x${string}` }),
    ...tokenAddresses.map(
      (token) =>
        client.readContract({
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }) as Promise<bigint>,
    ),
  ]);

  const tokens = new Map<string, bigint>();
  tokenAddresses.forEach((addr, i) => {
    tokens.set(addr.toLowerCase(), tokenBalances[i]);
  });

  return { eth, tokens };
}

/**
 * Calculate delta between two snapshots (after - before)
 */
export function calcDelta(before: BalanceSnapshot, after: BalanceSnapshot): BalanceDelta {
  const tokens = new Map<string, bigint>();
  for (const [addr, beforeBal] of before.tokens) {
    const afterBal = after.tokens.get(addr) ?? 0n;
    tokens.set(addr, afterBal - beforeBal);
  }
  return { eth: after.eth - before.eth, tokens };
}

/**
 * Format a balance snapshot for logging
 */
export function formatSnapshot(snapshot: BalanceSnapshot, decimalsMap: Map<string, number>): string {
  const parts = [`ETH: ${formatEther(snapshot.eth)}`];
  for (const [addr, bal] of snapshot.tokens) {
    const decimals = decimalsMap.get(addr.toLowerCase()) ?? 18;
    parts.push(`${addr.slice(0, 8)}: ${formatUnits(bal, decimals)}`);
  }
  return parts.join(', ');
}
