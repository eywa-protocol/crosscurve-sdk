/**
 * @fileoverview API Client port (interface)
 * @layer domain - ISP-compliant composed interface
 */

import type { IRoutingApi } from './IRoutingApi.js';
import type { ITransactionApi } from './ITransactionApi.js';
import type { ISearchApi } from './ISearchApi.js';
import type { IInconsistencyApi } from './IInconsistencyApi.js';
import type { IDataApi } from './IDataApi.js';
import type { IPricesApi } from './IPricesApi.js';
import type { IRunnerApi } from './IRunnerApi.js';
import type { IAAApi } from './IAAApi.js';
import type { IPimlicoApi } from './IPimlicoApi.js';

/**
 * Composed API client interface for HTTP operations
 * Implemented by infrastructure/api/ApiClient
 *
 * This interface follows ISP by composing smaller, focused interfaces:
 * - IRoutingApi: Route scanning operations
 * - ITransactionApi: Transaction create/get operations
 * - ISearchApi: Transaction search operations
 * - IInconsistencyApi: Inconsistency resolution operations
 * - IDataApi: Token and chain data operations
 * - IPricesApi: Token price lookup operations
 * - IRunnerApi: Runner emergency operations
 * - IAAApi: Account abstraction transaction creation
 * - IPimlicoApi: Pimlico bundler proxy operations
 *
 * Consumers can depend on specific sub-interfaces for narrower contracts.
 */
export interface IApiClient
  extends IRoutingApi,
    ITransactionApi,
    ISearchApi,
    IInconsistencyApi,
    IDataApi,
    IPricesApi,
    IRunnerApi,
    IAAApi,
    IPimlicoApi {}
