import type { HttpClient } from '../client/HttpClient.js';
import type { JsonRpcRequest, JsonRpcResponse } from '../../../types/aa.js';
import { ValidationError } from '../../../errors/index.js';

const ALLOWED_METHODS = new Set([
  'eth_sendUserOperation',
  'eth_estimateUserOperationGas',
  'eth_getUserOperationReceipt',
  'eth_getUserOperationByHash',
  'eth_supportedEntryPoints',
  'pm_getPaymasterData',
  'pm_getPaymasterStubData',
  'pm_supportedTokens',
  'pimlico_getUserOperationGasPrice',
  'pimlico_getTokenQuotes',
]);

export async function pimlicoHealth(client: HttpClient): Promise<{ status: 'ok' | 'unavailable' }> {
  return client.get<{ status: 'ok' | 'unavailable' }>('/pimlico/health');
}

export async function pimlicoRpc(client: HttpClient, chainName: string, request: JsonRpcRequest): Promise<JsonRpcResponse> {
  if (!ALLOWED_METHODS.has(request.method)) {
    throw new ValidationError(`Method ${request.method} is not allowed through Pimlico proxy`);
  }
  return client.post<JsonRpcResponse>(`/pimlico/${chainName}`, request);
}
