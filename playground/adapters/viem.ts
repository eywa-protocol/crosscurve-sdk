import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
  type PublicClient,
  type WalletClient,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ViemAdapter } from '@crosscurve/sdk';
import { getChainConfig, getRpcUrl } from '../config/index.js';

export interface ViemClients {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Account;
  adapter: ViemAdapter;
}

export function createViemSigner(chainId: number): ViemClients {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment');
  }

  const { chain } = getChainConfig(chainId);
  const rpcUrl = getRpcUrl(chainId);
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    chain,
    transport: http(rpcUrl),
    account,
  });

  const adapter = new ViemAdapter(walletClient, publicClient, account);

  return { publicClient, walletClient, account, adapter };
}

export function getViemAdapter(chainId: number): ViemAdapter {
  return createViemSigner(chainId).adapter;
}
