/**
 * @fileoverview Transaction log parsing utilities
 * Extracts request IDs and other data from contract events
 */

/**
 * ComplexOpProcessed event topic hash
 * event ComplexOpProcessed(uint64 indexed chainIdFrom, bytes32 indexed currentRequestId,
 *   uint64 chainIdTo, bytes32 nextRequestId, uint8 result, uint8 lastOp)
 *
 * Computed: keccak256('ComplexOpProcessed(uint64,bytes32,uint64,bytes32,uint8,uint8)')
 */
const COMPLEX_OP_PROCESSED_TOPIC = '0x830adbcf80ee865e0f0883ad52e813fdbf061b0216b724694a2b4e06708d243c';

/**
 * Represents a transaction log entry
 */
export interface TransactionLog {
  topics?: string[];
  data?: string;
}

/**
 * Extract requestId from ComplexOpProcessed event in transaction logs
 *
 * Event signature:
 * event ComplexOpProcessed(
 *   uint64 indexed chainIdFrom,
 *   bytes32 indexed currentRequestId,
 *   uint64 chainIdTo,
 *   bytes32 nextRequestId,
 *   uint8 result,
 *   uint8 lastOp
 * )
 *
 * IMPORTANT: Must check topics[0] matches COMPLEX_OP_PROCESSED_TOPIC
 * All routes through CrossCurve contract emit this event, including rubic/bungee routes
 *
 * @param receipt Transaction receipt containing logs (from any adapter)
 * @returns Request ID if ComplexOpProcessed event found, undefined otherwise
 */
export function extractRequestIdFromLogs(receipt: { logs?: TransactionLog[] } | null | undefined): string | undefined {
  if (!receipt?.logs || !Array.isArray(receipt.logs)) {
    return undefined;
  }

  for (const log of receipt.logs) {
    // CRITICAL: First check if this is a ComplexOpProcessed event by matching topic hash
    // topics[0] is the event signature hash, topics[1] is chainIdFrom, topics[2] is currentRequestId
    if (!log.topics || log.topics.length < 3) {
      continue;
    }

    // Must match the ComplexOpProcessed event signature
    if (log.topics[0] !== COMPLEX_OP_PROCESSED_TOPIC) {
      continue;
    }

    try {
      // Decode non-indexed data: (uint64 chainIdTo, bytes32 nextRequestId, uint8 result, uint8 lastOp)
      // nextRequestId is at offset 32 (after chainIdTo which is padded to 32 bytes)
      const data = log.data;
      if (data && data.length >= 130) { // 0x + 64 chars for chainIdTo + 64 chars for nextRequestId
        // Extract nextRequestId (bytes32 at position 32-64)
        const nextRequestId = '0x' + data.slice(66, 130);
        if (nextRequestId && nextRequestId !== '0x' + '0'.repeat(64)) {
          return nextRequestId;
        }
      }

      // Fallback: use currentRequestId from topics[2]
      const currentRequestId = log.topics[2];
      if (currentRequestId && currentRequestId !== '0x' + '0'.repeat(64)) {
        return currentRequestId;
      }
    } catch (error) {
      // Log parsing failed for this entry, continue to next log
      // This can happen with malformed logs or unexpected data formats
      console.debug('Failed to parse ComplexOpProcessed log:', error);
    }
  }

  // No ComplexOpProcessed event found
  return undefined;
}

/**
 * Get the ComplexOpProcessed event topic hash
 * Useful for event filtering
 */
export function getComplexOpProcessedTopic(): string {
  return COMPLEX_OP_PROCESSED_TOPIC;
}
