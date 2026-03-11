import type { HttpClient } from '../client/HttpClient.js';
import type { AACreateTxParams, AATransaction } from '../../../types/aa.js';

export async function createAATransaction(client: HttpClient, params: AACreateTxParams): Promise<AATransaction> {
  const body = {
    from: params.from,
    recipient: params.recipient ?? params.from,
    routing: params.quote,
    walletType: params.walletType,
    gasMode: params.gasMode,
    gasToken: params.gasToken,
    paymasterAddress: params.paymasterAddress,
    entryPoint: params.entryPoint,
    buildCalldata: true,
  };
  return client.post<AATransaction>('/tx/create', body);
}
