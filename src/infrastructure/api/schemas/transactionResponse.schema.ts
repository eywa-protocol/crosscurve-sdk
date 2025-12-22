/**
 * @fileoverview Zod schemas for transaction API response
 * Only used for validation in development/test environments
 */

import { z } from 'zod';

/**
 * Schema for transaction event
 */
export const TransactionEventSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

/**
 * Schema for source transaction details
 */
export const SourceSchema = z.object({
  chainId: z.number(),
  transactionHash: z.string(),
  from: z.string(),
  events: z.array(TransactionEventSchema),
  status: z.enum(['pending', 'completed', 'failed']),
});

/**
 * Schema for oracle details
 */
export const OracleSchema = z.object({
  relayChainId: z.number(),
  requestId: z.string(),
  status: z.enum(['in progress', 'completed']),
  height: z.number().nullable(),
  epoch: z.number().nullable(),
  time: z.number().nullable(),
});

/**
 * Schema for bridge state
 */
export const BridgeStateSchema = z.record(
  z.string(),
  z.object({
    txHash: z.string().nullable().optional(),
  })
);

/**
 * Schema for destination transaction details
 */
export const DestinationSchema = z.object({
  chainId: z.number(),
  transactionHash: z.string().nullable(),
  events: z.array(TransactionEventSchema),
  emergency: z.boolean(),
  status: z.enum(['pending', 'in progress', 'completed', 'failed', 'retry']),
  bridgeState: BridgeStateSchema,
});

/**
 * Schema for transaction metadata
 */
export const TransactionMetadataSchema = z.object({
  tokenIn: z.string().optional(),
  amountIn: z.string().optional(),
  tokenOut: z.string().optional(),
  amountOut: z.string().optional(),
}).passthrough();

/**
 * Schema for GET /transaction/{requestId} response
 */
export const TransactionGetResponseSchema = z.object({
  status: z.enum(['in progress', 'completed', 'failed', 'reverted', 'retry', 'canceled']),
  inconsistency: z.boolean(),
  source: SourceSchema,
  oracle: OracleSchema,
  destination: DestinationSchema,
  data: TransactionMetadataSchema.optional(),
});

/**
 * Schema for POST /tx/create response
 */
export const TxCreateResponseSchema = z.object({
  to: z.string(),
  value: z.string(),
  data: z.string().optional(),
  abi: z.string().optional(),
  args: z.array(z.unknown()).optional(),
});

/**
 * Schema for search response
 */
export const SearchResponseSchema = z.object({
  transactions: z.array(TransactionGetResponseSchema),
});

/**
 * Schema for inconsistency get response
 */
export const InconsistencyGetResponseSchema = z.object({
  params: z.object({
    tokenIn: z.string(),
    amountIn: z.string(),
    chainIdIn: z.number(),
    tokenOut: z.string(),
    chainIdOut: z.number(),
  }),
  signature: z.string(),
});

/**
 * Type inference from schemas
 */
export type ValidatedTransactionGetResponse = z.infer<typeof TransactionGetResponseSchema>;
export type ValidatedTxCreateResponse = z.infer<typeof TxCreateResponseSchema>;

/**
 * Validate transaction response in development
 */
export function validateTransactionResponse<T>(data: T): T {
  if (process.env.NODE_ENV !== 'production') {
    TransactionGetResponseSchema.parse(data);
  }
  return data;
}

/**
 * Validate tx create response in development
 */
export function validateTxCreateResponse<T>(data: T): T {
  if (process.env.NODE_ENV !== 'production') {
    TxCreateResponseSchema.parse(data);
  }
  return data;
}
