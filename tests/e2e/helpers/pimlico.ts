import type { CrossCurveSDK } from '../../../src/index.js';
import type { JsonRpcResponse } from '../../../src/index.js';

/**
 * Call SDK's pimlico proxy and extract the result.
 * Throws if the JSON-RPC response contains an error.
 */
export async function pimlicoRpc(
  sdk: CrossCurveSDK,
  chainName: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const response: JsonRpcResponse = await sdk.aa.pimlicoRpc(chainName, {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  });
  if (response.error) {
    throw new Error(`${method}: ${response.error.message}`);
  }
  return response.result;
}
