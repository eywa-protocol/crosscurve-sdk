/**
 * @fileoverview Routing API interface
 * @layer domain - ISP-compliant interface for routing operations
 */

import type {
  RoutingScanRequest,
  RoutingScanResponse,
} from '../../types/api/index.js';

/**
 * Interface for routing operations
 */
export interface IRoutingApi {
  /**
   * Scan for available routes
   * POST /routing/scan
   */
  scanRoutes(request: RoutingScanRequest): Promise<RoutingScanResponse>;
}
