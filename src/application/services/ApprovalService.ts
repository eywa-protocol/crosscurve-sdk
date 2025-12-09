/**
 * @fileoverview Token approval service
 * @layer application - Implements IApprovalService domain interface
 *
 * Handles token approvals with EIP-2612 permit support and fallback to approve()
 */

import type {
  IApprovalService,
  ApprovalParams,
  ApprovalResult,
  PermitSignature,
} from '../../domain/interfaces/index.js';
import type { ChainSigner, TransactionRequest } from '../../types/signer.js';
import {
  createPermitTypedData,
  parsePermitSignature,
  isNativeToken,
  type PermitDomain,
} from '../../utils/permit.js';

/**
 * ERC20 function selectors
 */
const ERC20_SELECTORS = {
  allowance: '0xdd62ed3e', // allowance(address,address)
  approve: '0x095ea7b3', // approve(address,uint256)
  nonces: '0x7ecebe00', // nonces(address)
  name: '0x06fdde03', // name()
};

/**
 * Max uint256 for unlimited approval
 */
const MAX_UINT256 = 2n ** 256n - 1n;

/**
 * Service for managing token approvals with EIP-2612 permit support
 *
 * Implements permit-first approach:
 * 1. Check if native token (no approval needed)
 * 2. Check current allowance via ChainSigner.call()
 * 3. If sufficient, return early
 * 4. Try EIP-2612 permit if token supports it
 * 5. Fallback to approve() transaction
 */
export class ApprovalService implements IApprovalService {
  /**
   * Handle token approval with permit-first approach
   */
  async handleApproval(params: ApprovalParams): Promise<ApprovalResult> {
    const { token, chainId, owner, spender, amount, signer, mode } = params;

    // Native tokens don't need approval
    if (isNativeToken(token.address)) {
      return { needed: false, type: 'none' };
    }

    // Check current allowance
    const currentAllowance = await this.getAllowance(signer, token.address, owner, spender);
    if (currentAllowance >= amount) {
      return { needed: false, type: 'none' };
    }

    // Determine approval amount based on mode
    const approvalAmount = mode === 'unlimited' ? MAX_UINT256 : amount;

    // Try permit if token supports it
    if (token.permit) {
      try {
        const permit = await this.createPermit(
          signer,
          token.address,
          chainId,
          owner,
          spender,
          approvalAmount
        );
        return { needed: true, type: 'permit', permit };
      } catch {
        // Permit failed, fallback to approve
      }
    }

    // Fallback to approve()
    const approvalTxHash = await this.executeApprove(signer, token.address, spender, approvalAmount);
    return { needed: true, type: 'approve', approvalTxHash };
  }

  /**
   * Get current ERC20 allowance via contract call
   */
  private async getAllowance(
    signer: ChainSigner,
    token: string,
    owner: string,
    spender: string
  ): Promise<bigint> {
    const encodedOwner = owner.slice(2).toLowerCase().padStart(64, '0');
    const encodedSpender = spender.slice(2).toLowerCase().padStart(64, '0');
    const data = ERC20_SELECTORS.allowance + encodedOwner + encodedSpender;

    const result = await signer.call({ to: token, data });
    return this.decodeUint256(result);
  }

  /**
   * Get ERC20 nonce for permit via contract call
   */
  private async getNonce(signer: ChainSigner, token: string, owner: string): Promise<bigint> {
    const encodedOwner = owner.slice(2).toLowerCase().padStart(64, '0');
    const data = ERC20_SELECTORS.nonces + encodedOwner;

    const result = await signer.call({ to: token, data });
    return this.decodeUint256(result);
  }

  /**
   * Get ERC20 token name via contract call
   */
  private async getTokenName(signer: ChainSigner, token: string): Promise<string> {
    const result = await signer.call({ to: token, data: ERC20_SELECTORS.name });
    return this.decodeString(result);
  }

  /**
   * Create EIP-2612 permit signature
   */
  private async createPermit(
    signer: ChainSigner,
    tokenAddress: string,
    chainId: number,
    owner: string,
    spender: string,
    amount: bigint
  ): Promise<PermitSignature> {
    const nonce = await this.getNonce(signer, tokenAddress, owner);
    const tokenName = await this.getTokenName(signer, tokenAddress);

    // Permit deadline: 1 hour from now
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain: PermitDomain = {
      name: tokenName,
      version: '1',
      chainId,
      verifyingContract: tokenAddress,
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
   */
  private async executeApprove(
    signer: ChainSigner,
    tokenAddress: string,
    spender: string,
    amount: bigint
  ): Promise<string> {
    const encodedSpender = spender.slice(2).toLowerCase().padStart(64, '0');
    const encodedAmount = amount.toString(16).padStart(64, '0');
    const data = ERC20_SELECTORS.approve + encodedSpender + encodedAmount;

    const txRequest: TransactionRequest = {
      to: tokenAddress,
      data,
    };

    const response = await signer.sendTransaction(txRequest);
    await response.wait();

    return response.hash;
  }

  /**
   * Decode uint256 from hex result
   */
  private decodeUint256(hex: string): bigint {
    if (!hex || hex === '0x') {
      return 0n;
    }
    return BigInt(hex);
  }

  /**
   * Decode ABI-encoded string from hex result
   */
  private decodeString(hex: string): string {
    if (!hex || hex === '0x' || hex.length < 130) {
      return '';
    }

    // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
    // Remove 0x prefix
    const data = hex.slice(2);

    // Read offset (first 32 bytes) - should be 0x20 (32) for simple string
    // Read length (next 32 bytes after offset)
    const lengthHex = data.slice(64, 128);
    const length = parseInt(lengthHex, 16);

    if (length === 0) {
      return '';
    }

    // Read string bytes
    const stringHex = data.slice(128, 128 + length * 2);

    // Convert hex to string
    let result = '';
    for (let i = 0; i < stringHex.length; i += 2) {
      const charCode = parseInt(stringHex.slice(i, i + 2), 16);
      if (charCode === 0) break;
      result += String.fromCharCode(charCode);
    }

    return result;
  }
}
