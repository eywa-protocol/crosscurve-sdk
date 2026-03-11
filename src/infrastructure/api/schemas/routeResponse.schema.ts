/**
 * @fileoverview Zod schemas for routing API response
 * Only used for validation in development/test environments
 */

import { z } from 'zod';

/**
 * Schema for token reference in route step
 */
export const RouteStepTokenSchema = z.object({
  address: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  chainId: z.number(),
});

/**
 * Schema for transaction data
 */
export const TxDataSchema = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string(),
  chainId: z.number(),
});

/**
 * Schema for route step
 */
export const RouteStepSchema = z.object({
  type: z.string(),
  fromChainId: z.number(),
  toChainId: z.number(),
  fromToken: RouteStepTokenSchema,
  toToken: RouteStepTokenSchema,
  params: z.record(z.string(), z.unknown()).optional(),
  quote: z.object({
    id: z.string().optional(),
    quote: z.object({
      id: z.string().optional(),
    }).passthrough().optional(),
    route: z.object({
      txData: TxDataSchema.optional(),
    }).passthrough().optional(),
    transaction: TxDataSchema.optional(),
  }).passthrough().optional(),
});

/**
 * Schema for transaction info consumption
 */
export const ConsumptionSchema = z.object({
  gasConsumption: z.number(),
  bridge: z.string().nullable(),
  type: z.enum(['start', 'data', 'hash']),
});

/**
 * Schema for transaction info
 */
export const TransactionInfoSchema = z.object({
  chainId: z.number(),
  consumptions: z.array(ConsumptionSchema),
});

/**
 * Schema for fee with token
 */
export const FeeWithTokenSchema = z.object({
  token: z.string(),
  amount: z.string(),
  usd: z.number(),
});

/**
 * Schema for delivery fee
 */
export const DeliveryFeeSchema = FeeWithTokenSchema;

/**
 * Schema for total fee
 */
export const TotalFeeSchema = z.object({
  type: z.string(),
  percent: z.string(),
  amount: z.string(),
});

/**
 * Schema for runner
 */
export const RunnerSchema = z.object({
  address: z.string(),
  token: z.string(),
  deadline: z.number(),
});

/**
 * Schema for quote
 */
export const QuoteSchema = z.object({
  route: z.array(RouteStepSchema),
  amountIn: z.string(),
  amountOut: z.string(),
  deliveryFee: DeliveryFeeSchema,
  txs: z.array(TransactionInfoSchema),
  signature: z.string(),
  amountOutWithoutSlippage: z.string(),
  priceImpact: z.number(),
  tokenInPrice: z.number(),
  tokenOutPrice: z.number(),
  sourceFee: FeeWithTokenSchema,
  totalFee: TotalFeeSchema,
  expectedFinalitySeconds: z.number(),
  deadline: z.number(),
  slippage: z.number(),
  feeShare: z.string().optional(),
  feeShareRecipient: z.string().optional(),
  feeShareToken: z.string().optional(),
  runner: RunnerSchema.optional(),
});

/**
 * Schema for routing scan response (array of quotes)
 */
export const RoutingScanResponseSchema = z.array(QuoteSchema);

/**
 * Type inference from schema
 */
export type ValidatedQuote = z.infer<typeof QuoteSchema>;
export type ValidatedRoutingScanResponse = z.infer<typeof RoutingScanResponseSchema>;

/**
 * Validate routing response in development
 * Returns the data unchanged if valid, throws ZodError if invalid
 */
export function validateRoutingResponse<T>(data: T): T {
  if (process.env.NODE_ENV !== 'production') {
    RoutingScanResponseSchema.parse(data);
  }
  return data;
}

/**
 * Validate single quote in development
 */
export function validateQuote<T>(data: T): T {
  if (process.env.NODE_ENV !== 'production') {
    QuoteSchema.parse(data);
  }
  return data;
}
