/**
 * @fileoverview Approval service interface
 * @layer domain - Port for token approval functionality
 */

import type { ChainSigner } from '../../types/signer.js';
import type { ApprovalMode } from '../../types/config.js';

/**
 * Token information needed for approval
 */
export interface ApprovalTokenInfo {
  /** Token contract address */
  address: string;
  /** Whether token supports EIP-2612 permit */
  permit?: boolean;
}

/**
 * Parameters for handling token approval
 */
export interface ApprovalParams {
  /** Token to approve */
  token: ApprovalTokenInfo;
  /** Chain ID where token exists */
  chainId: number;
  /** Owner address (who is approving) */
  owner: string;
  /** Spender address (contract to approve) */
  spender: string;
  /** Amount to approve in token units (wei) */
  amount: bigint;
  /** Signer for approval transaction or permit signature */
  signer: ChainSigner;
  /** Approval mode: 'exact' or 'unlimited' */
  mode?: ApprovalMode;
}

/**
 * Permit signature components (EIP-2612)
 */
export interface PermitSignature {
  /** Recovery ID */
  v: number;
  /** R component of signature */
  r: string;
  /** S component of signature */
  s: string;
  /** Permit deadline as Unix timestamp */
  deadline: number;
}

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
 * Interface for token approval operations
 * Implemented by ApprovalService in application layer
 */
export interface IApprovalService {
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
   * @param params Approval parameters
   * @returns Approval result with permit signature or approval tx hash
   */
  handleApproval(params: ApprovalParams): Promise<ApprovalResult>;
}
