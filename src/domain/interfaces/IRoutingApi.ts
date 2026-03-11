/**
 * @fileoverview Routing API interface
 * @layer domain - ISP-compliant interface for routing operations
 */

import type {
  RoutingScanRequest,
  RoutingScanResponse,
  DiscoverRequest,
  TokenReference,
} from '../../types/api/index.js';
import type { StreamedRoute } from '../../types/index.js';

/**
 * Interface for routing operations
 */
export interface IRoutingApi {
  /**
   * Scan for available routes
   * POST /routing/scan
   */
  scanRoutes(request: RoutingScanRequest): Promise<RoutingScanResponse>;

  /**
   * Scan for available routes via NDJSON stream
   * POST /routing/scan/stream
   */
  scanRoutesStream(request: RoutingScanRequest, signal?: AbortSignal): AsyncIterable<StreamedRoute>;

  /**
   * Discover reachable output tokens for a given input token
   * POST /routing/discover
   */
  discover(request: DiscoverRequest): Promise<TokenReference[]>;
}
