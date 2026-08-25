import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execution = path.join(pack, '03_execution');
const read = (file) => JSON.parse(fs.readFileSync(path.join(execution, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(execution, file), JSON.stringify(value, null, 2) + '\n');
const taskId = 'frontend_099';

const task = {
  id: taskId,
  phase: 'F7_post_release_assurance',
  area: 'public exact visual parity',
  title: 'Public Exact Figma Parity Closure — PUB-01 through PUB-08',
  goal: 'Close every repository-owned material visual difference in the already audited PUB-01 through PUB-08 screens using cached canonical clone evidence, deterministic API-backed success data, and normal focused verification.',
  kind: 'quality',
  screens: [],
  sourceRefs: [
    '09_sources/DESIGN_SOURCE_MANIFEST.json',
    '01_product/SCREEN_COVERAGE.json',
    '08_reality_sync/PLATFORM_COMPLETION_AUDIT.json'
  ],
  notes: [
    'This is the second implementation pass for PUB-01 through PUB-08 and must not discover PUB-09.',
    'The task is associated with the Partial frontend_098 final-gate task but does not make frontend_098 complete.',
    'The canonical source is FIGMA_FILE_KEY=Odl1Epn2u6lIEuIMmABT7o. The source key 0HBdTNGROmmpC6S7OYa3iJ is forbidden.',
    'The eight Screen IDs remain owned by their existing catalog task; this closure task intentionally has an empty screens array so ownership stays unique.'
  ],
  track: 'frontend',
  dependsOn: ['frontend_097'],
  atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_099.md',
  allowedRoots: [
    'apps/web/src/features/public/**',
    'apps/web/src/features/content/**',
    'apps/web/src/features/frontend_foundation/**',
    'apps/web/tests/e2e/**',
    'apps/web/tests/performance/**',
    'apps/api/src/modules/public/**',
    'apps/api/src/modules/search/**',
    'apps/api/src/modules/compare/**',
    'apps/api/src/modules/organizations/**',
    'apps/api/src/modules/articles/**',
    'packages/contracts/**',
    'packages/ui/**',
    'apps/web/public/assets/clone/**',
    'scripts/**',
    'docs/quality/figma_parity/**',
    'agent_pack/**'
  ],
  acceptance: [
    'Keep the closure task In Progress or Partial until every repository-owned material visual defect is repaired and verified.',
    'Review PUB-01 through PUB-08 in order using cached Figma evidence and record an element-level defect list for every screen.',
    'Capture a genuinely new runtime-after.png only after a real runtime, data, contract, or capture repair; never duplicate runtime-before.png.',
    'Capture at each exact cached Figma frame width with the required locale, direction, deterministic success state, ready fonts, decoded images, and disabled animation variance.',
    'Repair typography, geometry, spacing, grids, imagery, controls, CTA/footer, API projections, and lazy-loading behavior in repository-owned code and data paths.',
    'Use only REPAIRED_VERIFIED, VERIFIED_NO_CHANGE, or PARTIAL with an exact external blocker for final screen classifications.',
    'Do not update a visual baseline until the corrected runtime has been directly reviewed against the canonical clone; then inspect the baseline and pass normal visual tests without --ignore-snapshots.',
    'Pass normal focused visual snapshots 8/8, focused accessibility and functional/API tests, affected typecheck/lint, and the focused performance gate.',
    'Leave below-fold Production images lazy and restrict eager loading to LCP/above-fold media while making the capture harness scroll and wait for lazy media.',
    'Mark Complete only when all eight screens are visually verified, zero material differences remain, all required gates pass, completion evidence is valid, Finish Index is consistent, and the Agent Pack audit has zero errors.'
  ],
  verification: [
    'affected contracts build and typecheck',
    'affected apps/web and apps/api typecheck and lint',
    'focused public Vitest and API/integration tests',
    'focused Playwright functional, locale/direction, accessibility, approved-viewport, and normal visual tests',
    'focused per-screen visual comparison and manual diff review',
    'focused performance and lazy-loading gate',
    'node agent_pack/scripts/audit_pack.mjs'
  ],
  sequence: 199
};

const catalog = read('TASK_CATALOG.json');
if (catalog.some((entry) => entry.id === taskId)) throw new Error(`${taskId} already exists`);
catalog.push(task);
catalog.forEach((entry, index) => { entry.sequence = index + 1; });
write('TASK_CATALOG.json', catalog);

const state = read('TASK_STATE.json');
if (state.tasks[taskId]) throw new Error(`${taskId} already exists in TASK_STATE.json`);
const now = new Date().toISOString();
state.updatedAt = now;
state.tasks[taskId] = {
  status: 'open',
  startedAt: null,
  completedAt: null,
  reason: null,
  evidencePath: null
};
write('TASK_STATE.json', state);

const dependencies = read('DEPENDENCIES.json');
dependencies.push({ taskId, dependsOn: task.dependsOn });
write('DEPENDENCIES.json', dependencies);

const atomicMap = read('ATOMIC_TASK_MAP.json');
atomicMap.push({ taskId, track: task.track, phase: task.phase, sequence: task.sequence, atomicTaskFile: task.atomicTaskFile });
write('ATOMIC_TASK_MAP.json', atomicMap);

const stepPlan = read('STEP_FILE_PLAN.json');
stepPlan.push({ taskId, allowedRoots: task.allowedRoots });
write('STEP_FILE_PLAN.json', stepPlan);

const manifest = read('MANIFEST.json');
manifest.taskCounts = { total: catalog.length, backend: catalog.filter((entry) => entry.track === 'backend').length, frontend: catalog.filter((entry) => entry.track === 'frontend').length };
manifest.generatedAt = now;
write('MANIFEST.json', manifest);

for (const entry of catalog) {
  const atomicPath = path.join(pack, entry.atomicTaskFile);
  if (!fs.existsSync(atomicPath)) throw new Error('Missing atomic task file: ' + entry.atomicTaskFile);
  const source = fs.readFileSync(atomicPath, 'utf8');
  const updated = source.replace(/\| Sequence \| \d+ \/ \d+ \|/u, `| Sequence | ${entry.sequence} / ${catalog.length} |`);
  if (updated === source && !source.includes(`| Sequence | ${entry.sequence} / ${catalog.length} |`)) {
    throw new Error('Could not update sequence in ' + entry.atomicTaskFile);
  }
  if (updated !== source) fs.writeFileSync(atomicPath, updated);
}

console.log(JSON.stringify({ taskId, status: state.tasks[taskId].status, sequence: task.sequence, totalTasks: catalog.length }, null, 2));
