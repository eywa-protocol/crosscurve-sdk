/**
 * @fileoverview Token approval utilities
 * @implements PRD Section 7.5 - Token Approvals
 *
 * Handles token approvals with EIP-2612 permit support and fallback to approve()
 */

import type { ChainSigner, TransactionRequest } from '../types/signer.js';
import type { Token } from '../types/token.js';
import {
  createPermitTypedData,
  parsePermitSignature,
  isNativeToken,
  type PermitSignature,
  type PermitDomain,
} from './permit.js';

/**
 * ERC20 ABI fragments for approval operations
 */
const ERC20_ABI = {
  allowance: 'function allowance(address owner, address spender) view returns (uint256)',
  approve: 'function approve(address spender, uint256 amount) returns (bool)',
  nonces: 'function nonces(address owner) view returns (uint256)',
  name: 'function name() view returns (string)',
  DOMAIN_SEPARATOR: 'function DOMAIN_SEPARATOR() view returns (bytes32)',
};

/**
 * Result of approval handling
 */
export interface ApprovalResult {
  /** Whether approval was needed */
  needed: boolean;
  /** Type of approval used */
  type: 'permit' | 'approve' | 'none';
  /** Permit signature if permit was used */
  permit?: PermitSignature;
  /** Approval transaction hash if approve() was used */
  approvalTxHash?: string;
}

/**
 * Parameters for handling token approval
 */
export interface ApprovalParams {
  /** Token to approve */
  token: Token;
  /** Chain ID */
  chainId: number;
  /** Owner address */
  owner: string;
  /** Spender address (contract) */
  spender: string;
  /** Amount to approve in token units */
  amount: bigint;
  /** Signer for approval transaction or permit signature */
  signer: ChainSigner;
  /** Function to check allowance */
  getAllowance: (token: string, owner: string, spender: string) => Promise<bigint>;
  /** Function to get permit nonce */
  getNonce?: (token: string, owner: string) => Promise<bigint>;
  /** Function to get token name for permit domain */
  getTokenName?: (token: string) => Promise<string>;
}

/**
 * Handle token approval with permit-first approach
 *
 * Flow:
 * 1. Check if native token (no approval needed)
 * 2. Check current allowance
 * 3. If sufficient allowance, return
 * 4. If token supports permit, try EIP-2612 permit
 * 5. If permit fails or not supported, fallback to approve()
 *
 * @implements PRD Section 7.5 - exact amounts only, no unlimited approvals
 */
export async function handleApproval(params: ApprovalParams): Promise<ApprovalResult> {
  const { token, chainId, owner, spender, amount, signer, getAllowance } = params;

  // Native tokens don't need approval
  if (isNativeToken(token.address)) {
    return { needed: false, type: 'none' };
  }

  // Check current allowance
  const currentAllowance = await getAllowance(token.address, owner, spender);
  if (currentAllowance >= amount) {
    return { needed: false, type: 'none' };
  }

  // Try permit if token supports it
  if (token.permit && params.getNonce && params.getTokenName) {
    try {
      const permit = await createPermit(
        token,
        chainId,
        owner,
        spender,
        amount,
        signer,
        params.getNonce,
        params.getTokenName
      );
      return { needed: true, type: 'permit', permit };
    } catch {
      // Permit failed, fallback to approve
    }
  }

  // Fallback to approve()
  const approvalTxHash = await executeApprove(token.address, spender, amount, signer);
  return { needed: true, type: 'approve', approvalTxHash };
}

/**
 * Create EIP-2612 permit signature
 */
async function createPermit(
  token: Token,
  chainId: number,
  owner: string,
  spender: string,
  amount: bigint,
  signer: ChainSigner,
  getNonce: (token: string, owner: string) => Promise<bigint>,
  getTokenName: (token: string) => Promise<string>
): Promise<PermitSignature> {
  const nonce = await getNonce(token.address, owner);
  const tokenName = await getTokenName(token.address);

  // Permit deadline: 1 hour from now
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const domain: PermitDomain = {
    name: tokenName,
    version: '1',
    chainId,
    verifyingContract: token.address,
  };

  const typedData = createPermitTypedData(domain, owner, spender, amount, nonce, deadline);

  const signature = await signer.signTypedData(
    typedData.domain,
    typedData.types,
    typedData.message as Record<string, unknown>
  );

  const parsed = parsePermitSignature(signature);
  return { ...parsed, deadline };
}

/**
 * Execute standard approve() transaction
 *
 * @implements PRD Section 7.5 - exact amounts only
 */
async function executeApprove(
  tokenAddress: string,
  spender: string,
  amount: bigint,
  signer: ChainSigner
): Promise<string> {
  // Encode approve(spender, amount) call
  // Function selector: keccak256('approve(address,uint256)')[:8] = '0x095ea7b3'
  const selector = '0x095ea7b3';
  const encodedSpender = spender.slice(2).padStart(64, '0');
  const encodedAmount = amount.toString(16).padStart(64, '0');
  const data = selector + encodedSpender + encodedAmount;

  const txRequest: TransactionRequest = {
    to: tokenAddress,
    data,
  };

  const response = await signer.sendTransaction(txRequest);
  await response.wait();

  return response.hash;
}
