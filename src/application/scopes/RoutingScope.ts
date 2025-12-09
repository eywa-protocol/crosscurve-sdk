/**
 * @fileoverview Routing scope for Tier 2 API
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient } from '../../domain/interfaces/index.js';
import type { Quote } from '../../types/index.js';
import type { RoutingScanRequest } from '../../types/api/index.js';

/**
 * Routing scope: sdk.routing.*
 */
export class RoutingScope {
  constructor(private readonly apiClient: IApiClient) {}

  /**
   * Scan for all available routes
   * POST /routing/scan
   */
  async scan(request: RoutingScanRequest): Promise<Quote[]> {
    // API returns array directly
    return this.apiClient.scanRoutes(request);
  }
}
