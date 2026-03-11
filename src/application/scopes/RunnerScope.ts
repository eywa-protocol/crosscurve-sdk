/**
 * @fileoverview Runner scope for Tier 2 API
 * @layer application - Depends ONLY on domain
 */

import type { IRunnerApi } from '../../domain/interfaces/IRunnerApi.js';
import type { TxCreateResponse } from '../../types/api/responses.js';
import type { RunnerStatus } from '../../types/runner.js';

/**
 * Runner scope: sdk.runner.*
 */
export class RunnerScope {
  constructor(private readonly apiClient: IRunnerApi) {}

  /**
   * Create emergency runner transaction
   * POST /tx/create/emergencyRunner
   */
  async createEmergency(requestId: string): Promise<TxCreateResponse> {
    return this.apiClient.createEmergencyRunner(requestId);
  }

  /**
   * Get runner status
   * GET /tx/create/runner/{requestId}
   */
  async getStatus(requestId: string): Promise<RunnerStatus> {
    return this.apiClient.getRunnerStatus(requestId);
  }
}
