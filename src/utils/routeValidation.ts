/**
 * @fileoverview Route validation utilities
 * Provides safe access to route arrays with clear error messages
 */

import type { RouteStep } from '../types/quote.js';
import { ValidationError } from '../infrastructure/api/errors/index.js';

/**
 * Validate that route array is not empty
 * @throws ValidationError if route is undefined or empty
 */
export function validateRouteNotEmpty(route: RouteStep[] | undefined): asserts route is [RouteStep, ...RouteStep[]] {
  if (!route || route.length === 0) {
    throw new ValidationError('Quote has no route steps');
  }
}

/**
 * Get first route step with validation
 * @throws ValidationError if route is empty
 */
export function getFirstRouteStep(route: RouteStep[]): RouteStep {
  if (route.length === 0) {
    throw new ValidationError('Quote has no route steps');
  }
  return route[0];
}

/**
 * Safely get first route step or undefined
 * Use when missing route is acceptable (optional operations)
 */
export function getFirstRouteStepOrUndefined(route: RouteStep[] | undefined): RouteStep | undefined {
  if (!route || route.length === 0) {
    return undefined;
  }
  return route[0];
}

/**
 * Validate required fields on a route step
 * @throws ValidationError if required fields are missing
 */
export function validateRouteStepFields(step: RouteStep, requiredFields: (keyof RouteStep)[]): void {
  for (const field of requiredFields) {
    if (step[field] === undefined || step[field] === null) {
      throw new ValidationError(`Route step missing required field: ${field}`);
    }
  }
}

/**
 * Extract source chain ID from route step
 * Handles both standard format (fromChainId) and Rubic format (params.chainIdIn)
 */
export function extractSourceChainIdFromStep(step: RouteStep | undefined): number | undefined {
  if (!step) {
    return undefined;
  }

  if (step.fromChainId) {
    return step.fromChainId;
  }

  const stepWithChainId = step as { chainId?: number };
  if (stepWithChainId.chainId) {
    return stepWithChainId.chainId;
  }

  if (step.params) {
    const params = step.params as Record<string, unknown>;
    if (typeof params.chainIdIn === 'number') {
      return params.chainIdIn;
    }
  }

  return undefined;
}
