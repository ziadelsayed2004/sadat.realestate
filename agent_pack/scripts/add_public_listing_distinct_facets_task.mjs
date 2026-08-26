import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execution = path.join(pack, '03_execution');
const read = name => JSON.parse(fs.readFileSync(path.join(execution, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(execution, name), `${JSON.stringify(value, null, 2)}\n`);
const task = {
  id: 'backend_147', phase: 'F7_post_release_assurance', area: 'public listing parity',
  title: 'Distinct Public Listing Rail and Filter Taxonomies — PUB-02',
  goal: 'Expose distinct API-backed category-rail and property-type-filter facets required by canonical PUB-02.',
  kind: 'implementation', screens: [], sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json'],
  notes: ['Canonical source key: Odl1Epn2u6lIEuIMmABT7o; PUB-02 node: 6017:12095; owned by frontend_099.'],
  track: 'backend', dependsOn: ['backend_146'],
  atomicTaskFile: '04_tracks/backend/F7_post_release_assurance/backend_147.md',
  allowedRoots: ['packages/contracts/src/search/**', 'apps/api/src/modules/search/**', 'apps/api/tests/search/**', 'apps/api/openapi/**', 'apps/api/postman/**', 'docs/api/public-properties-search.md', 'agent_pack/01_product/API_ENDPOINT_BLUEPRINT.json', 'agent_pack/**'],
  acceptance: ['Return separate bounded category-rail and property-type facets.', 'Populate both from active taxonomy data with published-property counts.', 'Synchronize API artifacts.', 'Pass focused verification and pack audit.'],
  verification: ['contracts build', 'API typecheck', 'focused search tests', 'OpenAPI/Postman validation', 'affected lint', 'node agent_pack/scripts/audit_pack.mjs'],
  sequence: 122
};

const catalog = read('TASK_CATALOG.json');
if (catalog.some(entry => entry.id === task.id)) throw new Error('backend_147 exists');
catalog.splice(catalog.findIndex(entry => entry.track === 'frontend'), 0, task);
catalog.forEach((entry, index) => { entry.sequence = index + 1; });
write('TASK_CATALOG.json', catalog);
const now = new Date().toISOString();
const state = read('TASK_STATE.json');
state.updatedAt = now;
state.tasks.frontend_099.status = 'partial';
state.tasks.frontend_099.reason = 'Paused at PUB-02 for the bounded distinct rail/filter taxonomy response required by the canonical frame.';
state.tasks[task.id] = { status: 'in_progress', startedAt: now, completedAt: null, reason: null, evidencePath: null };
write('TASK_STATE.json', state);
const dependencies = read('DEPENDENCIES.json');
dependencies.push({ taskId: task.id, dependsOn: task.dependsOn });
write('DEPENDENCIES.json', dependencies);
const map = new Map(read('ATOMIC_TASK_MAP.json').map(entry => [entry.taskId, entry]));
map.set(task.id, { taskId: task.id, track: task.track, phase: task.phase, sequence: task.sequence, atomicTaskFile: task.atomicTaskFile });
write('ATOMIC_TASK_MAP.json', catalog.map(entry => ({ ...map.get(entry.id), sequence: entry.sequence })));
const plans = read('STEP_FILE_PLAN.json');
plans.push({ taskId: task.id, allowedRoots: task.allowedRoots });
write('STEP_FILE_PLAN.json', plans);
const manifest = read('MANIFEST.json');
manifest.taskCounts = { total: catalog.length, backend: catalog.filter(entry => entry.track === 'backend').length, frontend: catalog.filter(entry => entry.track === 'frontend').length };
manifest.generatedAt = now;
write('MANIFEST.json', manifest);
for (const entry of catalog) {
  const file = path.join(pack, entry.atomicTaskFile);
  const source = fs.readFileSync(file, 'utf8');
  const updated = source.replace(/\| Sequence \| \d+ \/ \d+ \|/u, `| Sequence | ${entry.sequence} / ${catalog.length} |`);
  if (updated !== source) fs.writeFileSync(file, updated);
}
console.log(JSON.stringify({ taskId: task.id, total: catalog.length, paused: 'frontend_099' }, null, 2));
