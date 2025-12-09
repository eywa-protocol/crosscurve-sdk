/**
 * @fileoverview Mock implementation of ChainSigner for testing
 */

import { vi } from 'vitest';
import type {
  ChainSigner,
  TransactionRequest,
  TransactionResponse,
  TypedDataDomain,
  TypedDataField,
} from '../../src/types/signer.js';

/**
 * Default test address
 */
export const TEST_ADDRESS = '0x750035FeeAd93D8e56656d0E1f398fBa3b3866D5';

/**
 * Creates a mock ChainSigner with all methods mocked
 */
export function createMockSigner(
  address: string = TEST_ADDRESS
): ChainSigner & {
  getAddress: ReturnType<typeof vi.fn>;
  signMessage: ReturnType<typeof vi.fn>;
  signTypedData: ReturnType<typeof vi.fn>;
  sendTransaction: ReturnType<typeof vi.fn>;
} {
  const mockTxResponse: TransactionResponse = {
    hash: '0x' + 'a'.repeat(64),
    wait: vi.fn().mockResolvedValue({
      hash: '0x' + 'a'.repeat(64),
      blockNumber: 12345,
      status: 1,
      logs: [],
    }),
  };

  return {
    getAddress: vi.fn<[], Promise<string>>().mockResolvedValue(address),
    signMessage: vi.fn<[Uint8Array], Promise<string>>().mockResolvedValue(
      '0x' + 'b'.repeat(130) // 65 bytes signature
    ),
    signTypedData: vi
      .fn<[TypedDataDomain, Record<string, TypedDataField[]>, Record<string, unknown>], Promise<string>>()
      .mockResolvedValue('0x' + 'c'.repeat(130)),
    sendTransaction: vi
      .fn<[TransactionRequest], Promise<TransactionResponse>>()
      .mockResolvedValue(mockTxResponse),
  };
}

/**
 * Creates a mock transaction response with ComplexOpProcessed event
 */
export function createMockTxResponseWithRequestId(requestId: string): TransactionResponse {
  const COMPLEX_OP_PROCESSED_TOPIC = '0x830adbcf80ee865e0f0883ad52e813fdbf061b0216b724694a2b4e06708d243c';

  return {
    hash: '0x' + 'a'.repeat(64),
    wait: vi.fn().mockResolvedValue({
      hash: '0x' + 'a'.repeat(64),
      blockNumber: 12345,
      status: 1,
      logs: [
        {
          topics: [
            COMPLEX_OP_PROCESSED_TOPIC,
            '0x' + '0'.repeat(48) + '00000001', // chainIdFrom (indexed)
            requestId, // currentRequestId (indexed)
          ],
          data:
            '0x' +
            '0'.repeat(48) +
            '00000002' + // chainIdTo
            requestId.slice(2) + // nextRequestId
            '00' + // result
            '00', // lastOp
        },
      ],
    }),
  };
}
