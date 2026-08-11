import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadWorkspaceGraph, validateWorkspaceGraph } from '../scripts/workspace-policy.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function graphCopy() {
  return structuredClone(loadWorkspaceGraph(rootDir));
}

test('accepts the real workspace graph', () => {
  assert.deepEqual(validateWorkspaceGraph(graphCopy()), []);
});

test('rejects a missing workspace', () => {
  const graph = graphCopy();
  delete graph.workspacePackages['apps/web'];
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('missing workspace manifest')));
});

test('rejects duplicate package names', () => {
  const graph = graphCopy();
  graph.workspacePackages['apps/web'].name = graph.workspacePackages['apps/api'].name;
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('duplicate workspace package name')));
});

test('rejects a non-private root', () => {
  const graph = graphCopy();
  graph.rootPackage.private = false;
  assert.ok(validateWorkspaceGraph(graph).includes('root package must be private'));
});

test('rejects an invalid Node engine', () => {
  const graph = graphCopy();
  graph.rootPackage.engines.node = '>=22 <23';
  assert.ok(validateWorkspaceGraph(graph).includes('root Node engine must be >=24 <25'));
});

test('rejects a missing lockfile workspace entry', () => {
  const graph = graphCopy();
  delete graph.lockfile.packages['apps/api'];
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('missing workspace entry')));
});

test('rejects an unexpected dependency in a non-API workspace', () => {
  const graph = graphCopy();
  graph.workspacePackages['packages/ui'].dependencies = { express: '5.2.1' };
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('packages/ui dependencies')));
});

test('rejects an API lockfile dependency mismatch', () => {
  const graph = graphCopy();
  graph.lockfile.packages['apps/api'].dependencies.express = '5.0.0';
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('apps/api dependencies')));
});

test('rejects a non-strict shared configuration', () => {
  const graph = graphCopy();
  graph.tsconfig.compilerOptions.strict = false;
  assert.ok(validateWorkspaceGraph(graph).includes('tsconfig.base.json must enable strict mode'));
});
