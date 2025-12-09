/**
 * @fileoverview ApprovalService unit tests
 * Tests EIP-2612 permit support and approve() fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalService } from '../../../../src/application/services/ApprovalService.js';
import type { ApprovalParams } from '../../../../src/domain/interfaces/index.js';
import { createMockSigner, TEST_ADDRESS } from '../../../mocks/MockSigner.js';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let mockSigner: ReturnType<typeof createMockSigner>;

  const TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
  const SPENDER_ADDRESS = '0x1234567890123456789012345678901234567890';
  const AMOUNT = 1000000000n; // 1000 USDC

  beforeEach(() => {
    service = new ApprovalService();
    mockSigner = createMockSigner();
  });

  describe('handleApproval - native token', () => {
    it('should return no approval needed for native ETH (zero address)', async () => {
      const params: ApprovalParams = {
        token: { address: '0x0000000000000000000000000000000000000000', permit: false },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.needed).toBe(false);
      expect(result.type).toBe('none');
      expect(mockSigner.call).not.toHaveBeenCalled();
    });

    it('should return no approval needed for native ETH (0xeee address)', async () => {
      const params: ApprovalParams = {
        token: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', permit: false },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.needed).toBe(false);
      expect(result.type).toBe('none');
    });
  });

  describe('handleApproval - sufficient allowance', () => {
    it('should return no approval needed when allowance is sufficient', async () => {
      // Mock allowance call to return enough allowance
      const sufficientAllowance = '0x' + (AMOUNT + 1n).toString(16).padStart(64, '0');
      mockSigner.call.mockResolvedValue(sufficientAllowance);

      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: true },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.needed).toBe(false);
      expect(result.type).toBe('none');
      expect(mockSigner.call).toHaveBeenCalled();
    });

    it('should return no approval needed when allowance equals amount', async () => {
      const exactAllowance = '0x' + AMOUNT.toString(16).padStart(64, '0');
      mockSigner.call.mockResolvedValue(exactAllowance);

      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: true },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.needed).toBe(false);
      expect(result.type).toBe('none');
    });
  });

  describe('handleApproval - permit flow', () => {
    beforeEach(() => {
      // Mock allowance as 0
      mockSigner.call
        .mockResolvedValueOnce('0x' + '0'.repeat(64)) // allowance = 0
        .mockResolvedValueOnce('0x' + '0'.repeat(64)) // nonce = 0
        .mockResolvedValueOnce(encodeTokenName('USD Coin')); // name = "USD Coin"
    });

    it('should use permit when token supports it', async () => {
      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: true },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.needed).toBe(true);
      expect(result.type).toBe('permit');
      expect(result.permit).toBeDefined();
      expect(result.permit?.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(mockSigner.signTypedData).toHaveBeenCalled();
    });

    it('should include correct permit signature components', async () => {
      // Mock signature with known values
      const mockSignature =
        '0x' +
        'a'.repeat(64) + // r
        'b'.repeat(64) + // s
        '1b'; // v = 27

      mockSigner.signTypedData.mockResolvedValue(mockSignature);

      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: true },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.permit).toBeDefined();
      expect(result.permit?.r).toBe('0x' + 'a'.repeat(64));
      expect(result.permit?.s).toBe('0x' + 'b'.repeat(64));
      expect(result.permit?.v).toBe(27);
    });

    it('should use unlimited amount when mode is unlimited', async () => {
      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: true },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'unlimited',
      };

      await service.handleApproval(params);

      // Check that signTypedData was called with max uint256
      expect(mockSigner.signTypedData).toHaveBeenCalled();
      const call = mockSigner.signTypedData.mock.calls[0];
      const message = call[2] as { value: bigint };
      expect(message.value).toBe(2n ** 256n - 1n);
    });
  });

  describe('handleApproval - approve fallback', () => {
    beforeEach(() => {
      // Mock allowance as 0
      mockSigner.call.mockResolvedValue('0x' + '0'.repeat(64));
    });

    it('should use approve when token does not support permit', async () => {
      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: false },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.needed).toBe(true);
      expect(result.type).toBe('approve');
      expect(result.approvalTxHash).toBe('0x' + 'a'.repeat(64));
      expect(mockSigner.sendTransaction).toHaveBeenCalled();
    });

    it('should fallback to approve when permit fails', async () => {
      // Setup: allowance = 0, nonce call fails
      mockSigner.call
        .mockResolvedValueOnce('0x' + '0'.repeat(64)) // allowance = 0
        .mockRejectedValueOnce(new Error('nonces not supported')); // nonce fails

      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: true },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.type).toBe('approve');
      expect(mockSigner.sendTransaction).toHaveBeenCalled();
    });

    it('should approve with exact amount when mode is exact', async () => {
      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: false },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      await service.handleApproval(params);

      const txCall = mockSigner.sendTransaction.mock.calls[0][0];
      expect(txCall.to).toBe(TOKEN_ADDRESS);
      // Data should be approve(spender, amount)
      expect(txCall.data).toContain('095ea7b3'); // approve selector
    });

    it('should approve with max uint256 when mode is unlimited', async () => {
      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: false },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'unlimited',
      };

      await service.handleApproval(params);

      const txCall = mockSigner.sendTransaction.mock.calls[0][0];
      // Data should contain max uint256 as the amount
      const maxUint256Hex = 'f'.repeat(64);
      expect(txCall.data.toLowerCase()).toContain(maxUint256Hex);
    });
  });

  describe('edge cases', () => {
    it('should handle zero allowance response', async () => {
      mockSigner.call.mockResolvedValue('0x');

      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: false },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.needed).toBe(true);
      expect(result.type).toBe('approve');
    });

    it('should handle very large allowance values', async () => {
      const maxAllowance = '0x' + 'f'.repeat(64);
      mockSigner.call.mockResolvedValue(maxAllowance);

      const params: ApprovalParams = {
        token: { address: TOKEN_ADDRESS, permit: true },
        chainId: 1,
        owner: TEST_ADDRESS,
        spender: SPENDER_ADDRESS,
        amount: AMOUNT,
        signer: mockSigner,
        mode: 'exact',
      };

      const result = await service.handleApproval(params);

      expect(result.needed).toBe(false);
      expect(result.type).toBe('none');
    });
  });
});

/**
 * Helper to encode a token name as ABI-encoded string
 */
function encodeTokenName(name: string): string {
  const hexName = Buffer.from(name).toString('hex');
  const offset = '0'.repeat(62) + '20'; // offset = 32
  const length = name.length.toString(16).padStart(64, '0');
  const paddedName = hexName.padEnd(64, '0');
  return '0x' + offset + length + paddedName;
}
