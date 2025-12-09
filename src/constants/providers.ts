/**
 * @fileoverview Route providers constants
 * @description Available providers for routing/scan API
 */

/**
 * Route provider identifiers as expected by the API
 */
export const RouteProvider = {
  /** CrossCurve native routes (Curve pools, cross-chain bridge) */
  CROSS_CURVE: 'cross-curve',
  /** Rubic aggregator */
  RUBIC: 'rubic',
  /** Bungee/Socket aggregator */
  BUNGEE: 'bungee',
} as const;

export type RouteProviderValue = (typeof RouteProvider)[keyof typeof RouteProvider];

/**
 * All available providers
 */
export const ALL_PROVIDERS: RouteProviderValue[] = [
  RouteProvider.CROSS_CURVE,
  RouteProvider.RUBIC,
  RouteProvider.BUNGEE,
];
