/**
 * @fileoverview Routing endpoint implementation
 * @implements PRD Appendix A - POST /routing/scan
 */

import type { HttpClient } from '../client/index.js';
import type { RoutingScanRequest, RoutingScanResponse } from '../../../types/api/index.js';

/**
 * Scan for available routes
 * POST /routing/scan
 */
export async function scanRoutes(
  client: HttpClient,
  request: RoutingScanRequest
): Promise<RoutingScanResponse> {
  return client.post<RoutingScanResponse>('/routing/scan', request);
}
