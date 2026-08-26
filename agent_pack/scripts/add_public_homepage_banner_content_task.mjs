import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execution = path.join(pack, '03_execution');
const read = (name) => JSON.parse(fs.readFileSync(path.join(execution, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(execution, name), `${JSON.stringify(value, null, 2)}\n`);
const task = {
  id: 'backend_143',
  phase: 'F7_post_release_assurance',
  area: 'public homepage parity',
  title: 'Public Homepage Banner Content Projection — PUB-01',
  goal: 'Project localized published banner copy required by canonical PUB-01.',
  kind: 'implementation',
  screens: ['PUB-01'],
  sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json'],
  notes: ['Canonical source key: Odl1Epn2u6lIEuIMmABT7o; node: 6017:10847.'],
  track: 'backend',
  dependsOn: ['backend_142'],
  atomicTaskFile: '04_tracks/backend/F7_post_release_assurance/backend_143.md',
  allowedRoots: ['packages/contracts/src/public/**', 'packages/contracts/src/contracts/**', 'apps/api/src/modules/public/**', 'apps/api/src/modules/database/seed.ts', 'apps/api/tests/public/**', 'apps/web/tests/e2e/public-fixtures.ts', 'agent_pack/**'],
  acceptance: ['Add localized eyebrow, body, and highlight banner projection.', 'Use published active records and deterministic non-production data only.', 'Pass focused verification and pack audit.'],
  verification: ['contracts build', 'API typecheck', 'focused homepage tests', 'affected lint', 'node agent_pack/scripts/audit_pack.mjs'],
  sequence: 118
};

const catalog = read('TASK_CATALOG.json');
if (catalog.some((entry) => entry.id === task.id)) throw new Error('backend_143 exists');
const firstFrontend = catalog.findIndex((entry) => entry.track === 'frontend');
catalog.splice(firstFrontend, 0, task);
catalog.forEach((entry, index) => { entry.sequence = index + 1; });
write('TASK_CATALOG.json', catalog);

const now = new Date().toISOString();
const state = read('TASK_STATE.json');
state.updatedAt = now;
state.tasks.frontend_099.status = 'partial';
state.tasks.frontend_099.reason = 'Paused at PUB-01 for the bounded backend banner-content projection required by the canonical frame.';
state.tasks[task.id] = { status: 'in_progress', startedAt: now, completedAt: null, reason: null, evidencePath: null };
write('TASK_STATE.json', state);

const dependencies = read('DEPENDENCIES.json');
dependencies.push({ taskId: task.id, dependsOn: task.dependsOn });
write('DEPENDENCIES.json', dependencies);

const oldMap = new Map(read('ATOMIC_TASK_MAP.json').map((entry) => [entry.taskId, entry]));
oldMap.set(task.id, { taskId: task.id, track: task.track, phase: task.phase, sequence: task.sequence, atomicTaskFile: task.atomicTaskFile });
write('ATOMIC_TASK_MAP.json', catalog.map((entry) => ({ ...oldMap.get(entry.id), sequence: entry.sequence })));

const plans = read('STEP_FILE_PLAN.json');
plans.push({ taskId: task.id, allowedRoots: task.allowedRoots });
write('STEP_FILE_PLAN.json', plans);

const manifest = read('MANIFEST.json');
manifest.taskCounts = { total: catalog.length, backend: catalog.filter((entry) => entry.track === 'backend').length, frontend: catalog.filter((entry) => entry.track === 'frontend').length };
manifest.generatedAt = now;
write('MANIFEST.json', manifest);

for (const entry of catalog) {
  const file = path.join(pack, entry.atomicTaskFile);
  const source = fs.readFileSync(file, 'utf8');
  const updated = source.replace(/\| Sequence \| \d+ \/ \d+ \|/u, `| Sequence | ${entry.sequence} / ${catalog.length} |`);
  if (updated !== source) fs.writeFileSync(file, updated);
}

console.log(JSON.stringify({ taskId: task.id, sequence: task.sequence, total: catalog.length, paused: 'frontend_099' }, null, 2));
