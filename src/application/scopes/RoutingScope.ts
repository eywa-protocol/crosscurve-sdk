/**
 * @fileoverview Routing scope for Tier 2 API
 * @layer application - Depends ONLY on domain
 */

import type { IApiClient } from '../../domain/interfaces/index.js';
import type { Quote, StreamedRoute } from '../../types/index.js';
import type { RoutingScanRequest, TokenReference } from '../../types/api/index.js';

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

  /**
   * Scan for routes via NDJSON stream
   * POST /routing/scan/stream
   */
  async *scanStream(request: RoutingScanRequest, signal?: AbortSignal): AsyncIterable<StreamedRoute> {
    yield* this.apiClient.scanRoutesStream(request, signal);
  }

  /**
   * Discover reachable output tokens for a given input token
   * POST /routing/discover
   */
  async discover(params: { tokenIn: string; chainIdIn: number }): Promise<TokenReference[]> {
    return this.apiClient.discover({
      tokenIn: params.tokenIn,
      chainIdIn: String(params.chainIdIn),
    });
  }
}
