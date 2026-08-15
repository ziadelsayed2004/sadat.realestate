import { IMPLEMENTED_ROUTE_DEFINITIONS } from './api-artifacts.js';

const HTTP_METHODS = new Set(['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE']);

export type RuntimeRouteInventoryEntry = {
  method: string;
  path: string;
  operationId: string;
  status: 'implemented';
};

export const RUNTIME_ROUTE_INVENTORY: readonly RuntimeRouteInventoryEntry[] = Object.freeze(
  IMPLEMENTED_ROUTE_DEFINITIONS
    .map(route => ({ ...route, method: route.method.toUpperCase(), status: 'implemented' as const }))
    .sort((left, right) => `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`))
);

export function runtimeRouteKey(route: Pick<RuntimeRouteInventoryEntry, 'method' | 'path'>): string {
  return `${route.method.toUpperCase()} ${route.path}`;
}

export function validateRuntimeRouteInventory(
  routes: readonly RuntimeRouteInventoryEntry[] = RUNTIME_ROUTE_INVENTORY
): string[] {
  const issues: string[] = [];
  const keys = new Set<string>();
  for (const route of routes) {
    const key = runtimeRouteKey(route);
    if (!HTTP_METHODS.has(route.method.toUpperCase())) issues.push(`Runtime inventory has unsupported method ${route.method}`);
    if (!route.path.startsWith('/')) issues.push(`Runtime inventory has invalid path ${route.path}`);
    if (!/^[a-z][a-zA-Z0-9]+$/.test(route.operationId)) issues.push(`Runtime inventory has invalid operationId ${route.operationId}`);
    if (route.status !== 'implemented') issues.push(`Runtime inventory presents non-implemented route ${key}`);
    if (keys.has(key)) issues.push(`Runtime inventory contains duplicate ${key}`);
    keys.add(key);
  }
  return [...new Set(issues)];
}
