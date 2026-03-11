import type { TxCreateResponse } from '../../types/api/responses.js';
import type { RunnerStatus } from '../../types/runner.js';

export interface IRunnerApi {
  createEmergencyRunner(requestId: string): Promise<TxCreateResponse>;
  getRunnerStatus(requestId: string): Promise<RunnerStatus>;
}
