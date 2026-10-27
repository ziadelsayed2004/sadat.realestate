import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadWorkspaceGraph, validateWorkspaceGraph } from '../scripts/workspace-policy.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('generated captures stay ignored while approved references and product assets remain versionable', () => {
  const ignored = ['docs/quality/new-capture.png', 'docs/quality/figma_parity/screens/PUB-01/runtime-new.png', 'docs/design_sources/recovery_candidates/rejected.png', 'docs/assets/new-raw.png', 'apps/web/test-results/new.png', 'apps/web/blob-report/new.zip'];
  const kept = ['apps/web/public/assets/product.png', 'docs/design_sources/final_screens/public/PUB-01.png', 'apps/web/tests/e2e/__snapshots__/visual.spec.ts-snapshots/baseline.png', 'docs/quality/figma_parity/screens/SEK-04/runtime-after-source-refresh-ar-2026-09-13.png'];
  const result = spawnSync('git', ['check-ignore', '--no-index', '--stdin'], { cwd: rootDir, input: [...ignored, ...kept].join('\n') + '\n', encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split(/\r?\n/u).sort(), ignored.sort());
});

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

test('rejects an unexpected root quality dependency', () => {
  const graph = graphCopy();
  graph.rootPackage.devDependencies.unapproved = '1.0.0';
  assert.ok(validateWorkspaceGraph(graph).includes('root devDependencies do not match the approved quality dependency set'));
});

test('rejects a missing root quality command', () => {
  const graph = graphCopy();
  delete graph.rootPackage.scripts['test:coverage'];
  assert.ok(validateWorkspaceGraph(graph).includes('root quality script is missing: test:coverage'));
});

test('keeps CI on the declared Node baseline and the local quality command', () => {
  const workflow = fs.readFileSync(path.join(rootDir, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run quality/);
  assert.match(workflow, /APP_ENV: test/);
  assert.doesNotMatch(workflow, /TEST_MONGODB_URI|production/);
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

test('rejects an unexpected frontend foundation dependency', () => {
  const graph = graphCopy();
  graph.workspacePackages['apps/web'].devDependencies.vite = '7.1.3';
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('apps/web devDependencies')));
});

test('rejects an API lockfile dependency mismatch', () => {
  const graph = graphCopy();
  graph.lockfile.packages['apps/api'].dependencies.express = '5.0.0';
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('apps/api dependencies')));
});

test('requires the approved banner image processor in the manifest and lockfile', () => {
  const graph = graphCopy();
  assert.equal(graph.workspacePackages['apps/api'].dependencies.sharp, '0.35.5');
  assert.equal(graph.lockfile.packages['apps/api'].dependencies.sharp, '0.35.5');
  delete graph.workspacePackages['apps/api'].dependencies.sharp;
  delete graph.lockfile.packages['apps/api'].dependencies.sharp;
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('apps/api dependencies')));
});

test('rejects a different image processor version even if the lockfile matches it', () => {
  const graph = graphCopy();
  graph.workspacePackages['apps/api'].dependencies.sharp = '0.35.4';
  graph.lockfile.packages['apps/api'].dependencies.sharp = '0.35.4';
  assert.ok(validateWorkspaceGraph(graph).some((issue) => issue.includes('apps/api dependencies')));
});

test('rejects a non-strict shared configuration', () => {
  const graph = graphCopy();
  graph.tsconfig.compilerOptions.strict = false;
  assert.ok(validateWorkspaceGraph(graph).includes('tsconfig.base.json must enable strict mode'));
});
