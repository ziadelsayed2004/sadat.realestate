import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RUNTIME_ROUTE_INVENTORY,
  runtimeRouteKey,
  validateRuntimeRouteInventory
} from '../../src/modules/docs/route-inventory.js';

test('runtime inventory is deterministic, unique, and labels only executable routes', () => {
  assert.deepEqual(validateRuntimeRouteInventory(), []);
  assert.ok(RUNTIME_ROUTE_INVENTORY.length > 0);
  assert.ok(RUNTIME_ROUTE_INVENTORY.every(route => route.status === 'implemented'));
  assert.deepEqual(
    [...RUNTIME_ROUTE_INVENTORY].map(runtimeRouteKey),
    [...RUNTIME_ROUTE_INVENTORY].map(runtimeRouteKey).sort()
  );
});

test('runtime inventory rejects duplicates and planned-route claims', () => {
  const route = RUNTIME_ROUTE_INVENTORY[0]!;
  const duplicate = [...RUNTIME_ROUTE_INVENTORY, route];
  assert.ok(validateRuntimeRouteInventory(duplicate).some(issue => issue.includes(`duplicate ${runtimeRouteKey(route)}`)));
  assert.ok(validateRuntimeRouteInventory([{ ...route, status: 'planned' as 'implemented' }]).some(issue => issue.includes('non-implemented')));
});
