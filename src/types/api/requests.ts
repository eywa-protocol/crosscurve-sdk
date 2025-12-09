/**
 * @fileoverview API request payload types
 */

import type { RouteStep, Quote } from '../quote.js';
import type { RouteProviderValue } from '../../constants/providers.js';

/**
 * Request payload for POST /routing/scan
 */
export interface RoutingScanRequest {
  params: {
    tokenIn: string;
    amountIn: string;
    chainIdIn: number;
    tokenOut: string;
    chainIdOut: number;
  };
  slippage: number;
  from?: string;
  providers?: RouteProviderValue[];
  feeFromAmount?: boolean;
  feeToken?: string;
}

/**
 * Request payload for POST /tx/create
 * The routing field should contain the full quote object from /routing/scan
 * including the signature for validation
 */
export interface TxCreateRequest {
  from: string;
  recipient: string;
  routing: Quote;
  permit?: {
    v: number;
    r: string;
    s: string;
    deadline: number;
  };
  buildCalldata?: boolean;
}

/**
 * Request payload for POST /tx/create/emergency
 */
export interface TxCreateEmergencyRequest {
  requestId: string;
  signature: string;
}

/**
 * Request payload for POST /tx/create/retry
 */
export interface TxCreateRetryRequest {
  requestId: string;
  signature: string;
}

/**
 * Request payload for POST /inconsistency
 * Requires a new routing (Quote) for the remaining operation
 */
export interface InconsistencyCreateRequest {
  requestId: string;
  signature: string;
  routing: Quote;
  permit?: {
    v: number;
    r: string;
    s: string;
    deadline: number;
  };
}
