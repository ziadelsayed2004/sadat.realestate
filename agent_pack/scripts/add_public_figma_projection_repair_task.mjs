import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execution = path.join(pack, '03_execution');
const read = (file) => JSON.parse(fs.readFileSync(path.join(execution, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(execution, file), JSON.stringify(value, null, 2) + '\n');
const taskId = 'backend_141';
const task = {
  id: taskId, phase: 'F7_post_release_assurance', area: 'public projection parity',
  title: 'Public Figma Data Projection Repair — PUB-01, PUB-03, PUB-06',
  goal: 'Add the smallest publication-safe projections required by the cached PUB-01, PUB-03, and PUB-06 clone evidence.',
  kind: 'implementation', screens: [],
  sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json', '01_product/SCREEN_COVERAGE.json'],
  notes: ['Canonical source: FIGMA_FILE_KEY=Odl1Epn2u6lIEuIMmABT7o.', 'No private provider contact data or screenshot-only production content may be added.'],
  track: 'backend', dependsOn: ['backend_140'],
  atomicTaskFile: '04_tracks/backend/F7_post_release_assurance/backend_141.md',
  allowedRoots: ['packages/contracts/src/public/**','packages/contracts/src/organizations/**','apps/api/src/modules/public/**','apps/api/src/modules/organizations/**','apps/api/src/**/__tests__/**','packages/contracts/src/**/__tests__/**','docs/api-artifacts/**','agent_pack/**'],
  acceptance: ['Project active public categories/counts, property features/services, and derived developer statistics.','Keep changes additive and publication-safe with deterministic empty defaults.','Pass focused contracts/API tests, affected typecheck/lint, completion evidence, and Agent Pack audit.'],
  verification: ['contracts build/typecheck','focused API and contract tests','affected API typecheck/lint','node agent_pack/scripts/audit_pack.mjs'],
  sequence: 200
};
const catalog = read('TASK_CATALOG.json');
if (catalog.some((entry) => entry.id === taskId)) throw new Error(`${taskId} already exists`);
catalog.push(task); catalog.forEach((entry, index) => { entry.sequence = index + 1; }); write('TASK_CATALOG.json', catalog);
const state = read('TASK_STATE.json'); const now = new Date().toISOString();
if (state.tasks[taskId]) throw new Error(`${taskId} already exists in TASK_STATE.json`);
state.updatedAt = now; state.tasks[taskId] = { status:'open', startedAt:null, completedAt:null, reason:null, evidencePath:null }; write('TASK_STATE.json', state);
const dependencies = read('DEPENDENCIES.json'); dependencies.push({ taskId, dependsOn:task.dependsOn }); write('DEPENDENCIES.json', dependencies);
const atomicMap = read('ATOMIC_TASK_MAP.json'); atomicMap.push({ taskId, track:task.track, phase:task.phase, sequence:task.sequence, atomicTaskFile:task.atomicTaskFile }); write('ATOMIC_TASK_MAP.json', atomicMap);
const stepPlan = read('STEP_FILE_PLAN.json'); stepPlan.push({ taskId, allowedRoots:task.allowedRoots }); write('STEP_FILE_PLAN.json', stepPlan);
const manifest = read('MANIFEST.json'); manifest.taskCounts={total:catalog.length,backend:catalog.filter((entry)=>entry.track==='backend').length,frontend:catalog.filter((entry)=>entry.track==='frontend').length}; manifest.generatedAt=now; write('MANIFEST.json',manifest);
for (const entry of catalog) {
  const atomicPath=path.join(pack,entry.atomicTaskFile); if(!fs.existsSync(atomicPath)) throw new Error('Missing atomic task file: '+entry.atomicTaskFile);
  const source=fs.readFileSync(atomicPath,'utf8'); const updated=source.replace(/\| Sequence \| \d+ \/ \d+ \|/u,`| Sequence | ${entry.sequence} / ${catalog.length} |`);
  if(updated!==source) fs.writeFileSync(atomicPath,updated);
}
console.log(JSON.stringify({taskId,status:'open',sequence:task.sequence,totalTasks:catalog.length},null,2));
