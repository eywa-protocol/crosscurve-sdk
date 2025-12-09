/**
 * @fileoverview Recovery signature creation utilities
 * @implements PRD Section 7.10 - Recovery
 */

/**
 * Create signature message for recovery operations
 */
export function createRecoverySignatureMessage(requestId: string): Uint8Array {
  const message = `CrossCurve Recovery: ${requestId}`;
  return new TextEncoder().encode(message);
}

/**
 * Create signature message for emergency withdrawal
 */
export function createEmergencySignatureMessage(requestId: string): Uint8Array {
  return createRecoverySignatureMessage(requestId);
}

/**
 * Create signature message for retry
 */
export function createRetrySignatureMessage(requestId: string): Uint8Array {
  return createRecoverySignatureMessage(requestId);
}

/**
 * Create signature message for inconsistency resolution
 */
export function createInconsistencySignatureMessage(requestId: string): Uint8Array {
  return createRecoverySignatureMessage(requestId);
}
