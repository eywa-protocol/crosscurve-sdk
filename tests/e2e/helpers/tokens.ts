export const TESTNET_TOKENS = {
  SEPOLIA_USDT: {
    address: '0xfc699beec6fba29e714b34fdc3baf948846d0426',
    decimals: 6,
    symbol: 'USDT',
    chainId: 11155111,
  },
  SEPOLIA_USDC: {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    symbol: 'USDC',
    chainId: 11155111,
  },
  ARB_SEPOLIA_USDT: {
    address: '0x866a8ff9900ad18dda3db4dd2e9704d650be5a95',
    decimals: 6,
    symbol: 'USDT',
    chainId: 421614,
  },
} as const;

export const TESTNET_CHAINS = {
  SEPOLIA: 11155111,
  ARB_SEPOLIA: 421614,
} as const;

/** Pimlico ERC-20 paymaster (v0.6 for 4337) */
export const PIMLICO_PM_V06 = '0x6666666666667849c56f2850848cE1C4da65c68b';

/** EntryPoint v0.6 (for 4337) */
export const ENTRYPOINT_V06 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

/** EntryPoint v0.8 (for 7702) */
export const ENTRYPOINT_V08 = '0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108';

/** Pimlico ERC-20 paymaster (v0.8 for 7702) */
export const PIMLICO_PM_V08 = '0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402';

/** 7702 Simple Smart Account implementation */
export const SIMPLE_7702_IMPL = '0xe6Cae83BdE06E4c305530e199D7217f42808555B';

/** Standard swap amount: 1 USDT (6 decimals) */
export const SWAP_AMOUNT = '1000000';
