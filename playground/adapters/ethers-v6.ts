import { ethers } from 'ethers';
import { EthersV6Adapter } from '@crosscurve/sdk';
import { getRpcUrl } from '../config/index.js';

export interface EthersV6Clients {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Wallet;
  adapter: EthersV6Adapter;
}

export function createEthersV6Signer(chainId: number): EthersV6Clients {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment');
  }

  const rpcUrl = getRpcUrl(chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const adapter = new EthersV6Adapter(wallet);

  return { provider, wallet, adapter };
}

export function getEthersV6Adapter(chainId: number): EthersV6Adapter {
  return createEthersV6Signer(chainId).adapter;
}
