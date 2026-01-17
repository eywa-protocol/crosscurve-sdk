import { ethers } from 'ethers5';
import { EthersV5Adapter } from '@crosscurve/sdk';
import { getRpcUrl } from '../config/index.js';

export interface EthersV5Clients {
  provider: ethers.providers.JsonRpcProvider;
  wallet: ethers.Wallet;
  adapter: EthersV5Adapter;
}

export function createEthersV5Signer(chainId: number): EthersV5Clients {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment');
  }

  const rpcUrl = getRpcUrl(chainId);
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const adapter = new EthersV5Adapter(wallet);

  return { provider, wallet, adapter };
}

export function getEthersV5Adapter(chainId: number): EthersV5Adapter {
  return createEthersV5Signer(chainId).adapter;
}
