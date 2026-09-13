import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registryPath = 'docs/quality/figma_parity/EXTERNAL_BLOCKER_REGISTRY_2026-09-13.json';
const auditPath = 'docs/quality/figma_parity/CURRENT_COMPLETION_AUDIT.json';
const queuePath = 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json';
const [registry, audit, queue] = await Promise.all([
  readFile(registryPath, 'utf8').then(JSON.parse),
  readFile(auditPath, 'utf8').then(JSON.parse),
  readFile(queuePath, 'utf8').then(JSON.parse)
]);

const open = audit.screens
  .filter(screen => screen.closureProven !== true)
  .map(screen => screen.screenId)
  .sort();
const snapshot = [...registry.auditSnapshot.openScreens].sort();
assert.equal(registry.auditSnapshot.totalScreens, audit.summary.total);
if (registry.status === 'RESOLVED') {
  assert.equal(open.length, 0, 'A resolved registry requires zero open screens in the current completion audit.');
  const queueById = new Map(queue.screens.map(screen => [screen.screenId, screen]));
  for (const screenId of snapshot) {
    assert.ok(['REPAIRED_VERIFIED', 'VERIFIED_NO_CHANGE'].includes(queueById.get(screenId)?.classification), `${screenId} is not closed in the execution queue.`);
  }
} else {
  assert.deepEqual(snapshot, open, 'Registry open-screen snapshot must exactly match the current completion audit.');
  assert.equal(registry.auditSnapshot.closedScreens, audit.summary.closed);
}

const covered = new Set();
for (const root of registry.rootCauses) {
  assert.match(root.id, /^EXT-[A-Z0-9-]+$/u);
  assert.ok(root.affectedScreens.length > 0);
  assert.equal(root.repositoryResolvableWithoutDecision, false);
  if (registry.status === 'RESOLVED') {
    assert.equal(root.resolution?.status, 'APPROVED_AND_IMPLEMENTED', `${root.id} has no implemented owner resolution.`);
    assert.equal(root.resolution?.approvedBy, 'Project Owner', `${root.id} has no Project Owner approval.`);
  }
  for (const field of ['owner', 'requiredInput', 'recommendedOption']) {
    assert.ok(typeof root[field] === 'string' && root[field].length >= 20, `${root.id}.${field} is incomplete.`);
  }
  for (const screen of root.affectedScreens) {
    assert.ok(snapshot.includes(screen), `${root.id} references a screen outside the original blocker snapshot: ${screen}.`);
    covered.add(screen);
  }
}

for (const item of registry.repositoryRevalidation) {
  assert.match(item.id, /^REPO-[A-Z0-9-]+$/u);
  assert.ok(item.reason.length >= 40 && item.nextAction.length >= 40);
  for (const screen of item.affectedScreens) {
    assert.ok(snapshot.includes(screen), `${item.id} references a screen outside the original blocker snapshot: ${screen}.`);
    covered.add(screen);
  }
}

assert.deepEqual([...covered].sort(), snapshot, 'Every original blocker screen must belong to a root cause or repository revalidation item.');
console.log(JSON.stringify({
  status: 'PASS',
  total: audit.summary.total,
  closed: audit.summary.closed,
  open: open.length,
  registryStatus: registry.status ?? 'ACTIVE',
  rootCauses: registry.rootCauses.length,
  repositoryRevalidationItems: registry.repositoryRevalidation.length,
  repositoryRevalidationScreens: new Set(registry.repositoryRevalidation.flatMap(item => item.affectedScreens)).size
}));
