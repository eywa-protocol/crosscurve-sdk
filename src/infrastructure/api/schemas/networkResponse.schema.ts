/**
 * @fileoverview Zod schemas for networks API response
 * Only used for validation in development/test environments
 */

import { z } from 'zod';

/**
 * Schema for token data from API
 */
export const ApiTokenDataSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  tags: z.array(z.string()),
  icon: z.string().optional(),
  permit: z.boolean().optional(),
  wrapped: z.object({
    chainId: z.number(),
    address: z.string(),
  }).optional(),
  realToken: z.object({
    chainId: z.number(),
    address: z.string(),
  }).optional(),
  coins: z.array(z.string()).optional(),
});

/**
 * Schema for network data from API
 */
export const NetworkApiDataSchema = z.object({
  name: z.string(),
  icon: z.string(),
  chainId: z.number(),
  rpcHttp: z.array(z.string()),
  rpcPublic: z.string(),
  hubChain: z.boolean(),
  router: z.string(),
  curveFactory: z.string(),
  frontHelper: z.string(),
  claimHelper: z.string(),
  walletFactory: z.string(),
  nft: z.string(),
  tokens: z.array(ApiTokenDataSchema),
  pools: z.array(z.unknown()).optional(),
});

/**
 * Schema for GET /networks response
 */
export const NetworksApiResponseSchema = z.record(z.string(), NetworkApiDataSchema);

/**
 * Type inference from schema
 */
export type ValidatedNetworksApiResponse = z.infer<typeof NetworksApiResponseSchema>;

/**
 * Validate networks response in development
 * Returns the data unchanged if valid, throws ZodError if invalid
 */
export function validateNetworksResponse<T>(data: T): T {
  if (process.env.NODE_ENV !== 'production') {
    NetworksApiResponseSchema.parse(data);
  }
  return data;
}
