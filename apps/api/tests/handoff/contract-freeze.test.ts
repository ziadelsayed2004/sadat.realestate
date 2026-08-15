import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDefaultContractFreeze,
  buildScreenEndpointMatrix,
  generateV1ClientTypes,
  loadOpenApiDocument,
  loadScreenRegistry,
  toHandoffOperations
} from '../../src/modules/handoff/contract-freeze.js';
import { contractFreezeSchema } from '@sadat-real-estate/contracts';

const generatedAt = '2026-09-01T12:00:00.000Z';

test('freezes the current executable inventory and all 131 screen registry entries deterministically', () => {
  const first = buildDefaultContractFreeze({ generatedAt });
  const second = buildDefaultContractFreeze({ generatedAt });
  assert.deepEqual(first, second);
  assert.equal(first.version, 'v1');
  assert.equal(first.screens.length, 131);
  assert.equal(first.operations.length, toHandoffOperations().length);
  assert.equal(first.generatedClient.basePath, '/api/v1');
  assert.deepEqual(first.generatedClient.operationIds, first.operations.map(operation => operation.operationId));
  assert.ok(first.screens.some(screen => screen.coverage === 'partial'));
  assert.ok(first.screens.some(screen => screen.coverage === 'unmapped'));
  assert.ok(first.unresolved.some(item => item.kind === 'missing_runtime_endpoint'));
  assert.ok(first.unresolved.some(item => item.kind === 'service_boundary'));
  assert.equal(JSON.stringify(first).match(/password|secret|credential/gi), null);
});

test('generated client types contain only executable operation IDs and preserve deterministic source hashes', () => {
  const operations = toHandoffOperations();
  const source = generateV1ClientTypes(operations);
  for (const operation of operations) assert.match(source, new RegExp(`'${operation.operationId}'`));
  assert.doesNotMatch(source, /password|secret|credential/i);
  const first = buildDefaultContractFreeze({ generatedAt });
  const changed = buildDefaultContractFreeze({ generatedAt: '2026-09-01T12:00:01.000Z' });
  assert.equal(first.sourceHashes.runtimeInventorySha256, changed.sourceHashes.runtimeInventorySha256);
  assert.equal(first.sourceHashes.openapiSha256, changed.sourceHashes.openapiSha256);
  assert.deepEqual(loadScreenRegistry().map(screen => screen.id).sort(), [...new Set(first.screens.map(screen => screen.id))].sort());
  assert.ok(loadOpenApiDocument());
});

test('rejects duplicate handoff screens and strict unknown fields', () => {
  const screen = { id: 'TEST-01', surface: 'public' as const, englishName: 'Synthetic screen' };
  assert.throws(() => buildScreenEndpointMatrix([screen, screen]), /Duplicate handoff screen/);
  const report = buildDefaultContractFreeze({ generatedAt });
  assert.throws(() => contractFreezeSchema.parse({ ...report, unknown: true }), /Unrecognized key/);
  assert.throws(() => contractFreezeSchema.parse({ ...report, screens: report.screens.slice(0, 130) }), /131/);
});
