import type { HttpClient } from '../client/HttpClient.js';
import type { TxCreateResponse } from '../../../types/api/responses.js';
import type { RunnerStatus } from '../../../types/runner.js';

export async function createEmergencyRunner(client: HttpClient, requestId: string): Promise<TxCreateResponse> {
  return client.post<TxCreateResponse>('/tx/create/emergencyRunner', { requestId });
}

export async function getRunnerStatus(client: HttpClient, requestId: string): Promise<RunnerStatus> {
  return client.get<RunnerStatus>(`/tx/create/runner/${requestId}`);
}
