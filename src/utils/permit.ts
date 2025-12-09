/**
 * @fileoverview EIP-2612 Permit utilities
 * @implements PRD Section 7.5 - Token Approvals
 *
 * Supports gasless token approvals via EIP-2612 permit signatures
 */

/**
 * Parameters for creating a permit signature
 */
export interface PermitParams {
  /** Token contract address */
  token: string;
  /** Spender address (contract that will spend tokens) */
  spender: string;
  /** Amount to permit in token units */
  value: bigint;
  /** Permit deadline as Unix timestamp */
  deadline: number;
}

/**
 * Permit signature components
 */
export interface PermitSignature {
  /** Recovery ID */
  v: number;
  /** R component of signature */
  r: string;
  /** S component of signature */
  s: string;
  /** Deadline used in permit */
  deadline: number;
}

/**
 * EIP-712 typed data domain for permit
 */
export interface PermitDomain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

/**
 * EIP-712 typed data types for permit
 */
export const PERMIT_TYPES: { Permit: Array<{ name: string; type: string }> } = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

/**
 * Create EIP-712 typed data for permit
 */
export function createPermitTypedData(
  domain: PermitDomain,
  owner: string,
  spender: string,
  value: bigint,
  nonce: bigint,
  deadline: number
): {
  domain: PermitDomain;
  types: typeof PERMIT_TYPES;
  primaryType: 'Permit';
  message: {
    owner: string;
    spender: string;
    value: bigint;
    nonce: bigint;
    deadline: bigint;
  };
} {
  return {
    domain,
    types: PERMIT_TYPES,
    primaryType: 'Permit',
    message: {
      owner,
      spender,
      value,
      nonce,
      deadline: BigInt(deadline),
    },
  };
}

/**
 * Parse signature into v, r, s components
 */
export function parsePermitSignature(signature: string): PermitSignature & { deadline: number } {
  // Remove 0x prefix if present
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature;

  if (sig.length !== 130) {
    throw new Error(`Invalid signature length: expected 130 hex chars, got ${sig.length}`);
  }

  const r = '0x' + sig.slice(0, 64);
  const s = '0x' + sig.slice(64, 128);
  const v = parseInt(sig.slice(128, 130), 16);

  return {
    r,
    s,
    v: v < 27 ? v + 27 : v,
    deadline: 0, // Caller must set this
  };
}

/**
 * Check if a token address is the native token (ETH, MATIC, etc.)
 */
export function isNativeToken(address: string): boolean {
  return (
    address === '0x0000000000000000000000000000000000000000' ||
    address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  );
}
