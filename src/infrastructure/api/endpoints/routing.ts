/**
 * @fileoverview Routing endpoint implementation
 */

import type { HttpClient } from '../client/index.js';
import type { RoutingScanRequest, RoutingScanResponse } from '../../../types/api/index.js';
import type { Quote, StreamedRoute } from '../../../types/index.js';

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

/**
 * Scan for available routes via NDJSON stream
 * POST /routing/scan/stream
 */
export async function* scanRoutesStream(
  client: HttpClient,
  request: RoutingScanRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamedRoute> {
  for await (const item of client.streamNdjson<{ simulation?: Quote; error?: string }>(
    '/routing/scan/stream',
    request,
    signal,
  )) {
    if ('error' in item && typeof item.error === 'string' && !('simulation' in item)) {
      yield { error: item.error };
    } else if ('simulation' in item && item.simulation) {
      yield { quote: item.simulation };
    } else if ('error' in item) {
      yield { error: String(item.error) };
    }
  }
}
