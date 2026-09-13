import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registryPath = 'docs/quality/figma_parity/EXTERNAL_BLOCKER_REGISTRY_2026-09-13.json';
const auditPath = 'docs/quality/figma_parity/CURRENT_COMPLETION_AUDIT.json';
const [registry, audit] = await Promise.all([
  readFile(registryPath, 'utf8').then(JSON.parse),
  readFile(auditPath, 'utf8').then(JSON.parse)
]);

const open = audit.screens
  .filter(screen => screen.closureProven !== true)
  .map(screen => screen.screenId)
  .sort();
const snapshot = [...registry.auditSnapshot.openScreens].sort();
assert.deepEqual(snapshot, open, 'Registry open-screen snapshot must exactly match the current completion audit.');
assert.equal(registry.auditSnapshot.totalScreens, audit.summary.total);
assert.equal(registry.auditSnapshot.closedScreens, audit.summary.closed);

const covered = new Set();
for (const root of registry.rootCauses) {
  assert.match(root.id, /^EXT-[A-Z0-9-]+$/u);
  assert.ok(root.affectedScreens.length > 0);
  assert.equal(root.repositoryResolvableWithoutDecision, false);
  for (const field of ['owner', 'requiredInput', 'recommendedOption']) {
    assert.ok(typeof root[field] === 'string' && root[field].length >= 20, `${root.id}.${field} is incomplete.`);
  }
  for (const screen of root.affectedScreens) {
    assert.ok(open.includes(screen), `${root.id} references closed or unknown screen ${screen}.`);
    covered.add(screen);
  }
}

for (const item of registry.repositoryRevalidation) {
  assert.match(item.id, /^REPO-[A-Z0-9-]+$/u);
  assert.ok(item.reason.length >= 40 && item.nextAction.length >= 40);
  for (const screen of item.affectedScreens) {
    assert.ok(open.includes(screen), `${item.id} references closed or unknown screen ${screen}.`);
    covered.add(screen);
  }
}

assert.deepEqual([...covered].sort(), open, 'Every open screen must belong to an external root cause or repository revalidation item.');
console.log(JSON.stringify({
  status: 'PASS',
  total: audit.summary.total,
  closed: audit.summary.closed,
  open: open.length,
  rootCauses: registry.rootCauses.length,
  repositoryRevalidationItems: registry.repositoryRevalidation.length,
  repositoryRevalidationScreens: new Set(registry.repositoryRevalidation.flatMap(item => item.affectedScreens)).size
}));
