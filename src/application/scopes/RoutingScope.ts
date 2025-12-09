/**
 * @fileoverview Routing scope for Tier 2 API
 * @implements PRD Section 3.2 US-4 - Custom Route Selection
 * @implements PRD Section 5.1 - Tier 2 Flow
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
   * @implements PRD US-4
   */
  async scan(request: RoutingScanRequest): Promise<Quote[]> {
    // API returns array directly
    return this.apiClient.scanRoutes(request);
  }
}
