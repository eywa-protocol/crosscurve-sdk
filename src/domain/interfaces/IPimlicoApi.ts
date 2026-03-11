/**
 * @fileoverview Interface for Pimlico bundler proxy
 */

import type { JsonRpcRequest, JsonRpcResponse } from '../../types/aa.js';

export interface IPimlicoApi {
  pimlicoHealth(): Promise<{ status: 'ok' | 'unavailable' }>;
  pimlicoRpc(chainName: string, request: JsonRpcRequest): Promise<JsonRpcResponse>;
}
