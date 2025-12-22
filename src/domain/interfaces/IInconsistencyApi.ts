/**
 * @fileoverview Inconsistency API interface
 * @layer domain - ISP-compliant interface for inconsistency resolution operations
 */

import type {
  InconsistencyGetResponse,
  InconsistencyCreateRequest,
  InconsistencyCreateResponse,
} from '../../types/api/index.js';

/**
 * Interface for inconsistency resolution operations
 */
export interface IInconsistencyApi {
  /**
   * Get inconsistency parameters
   * GET /inconsistency/{requestId}
   */
  getInconsistencyParams(requestId: string): Promise<InconsistencyGetResponse>;

  /**
   * Create inconsistency resolution route
   * POST /inconsistency
   */
  createInconsistency(request: InconsistencyCreateRequest): Promise<InconsistencyCreateResponse>;
}
