export * from './viem.js';
export * from './ethers-v6.js';
export * from './ethers-v5.js';

import { ChainSigner } from '@crosscurve/sdk';
import { getViemAdapter } from './viem.js';
import { getEthersV6Adapter } from './ethers-v6.js';
import { getEthersV5Adapter } from './ethers-v5.js';

export type AdapterType = 'viem' | 'ethers-v6' | 'ethers-v5';

export function getAdapter(type: AdapterType, chainId: number): ChainSigner {
  switch (type) {
    case 'viem':
      return getViemAdapter(chainId);
    case 'ethers-v6':
      return getEthersV6Adapter(chainId);
    case 'ethers-v5':
      return getEthersV5Adapter(chainId);
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}
