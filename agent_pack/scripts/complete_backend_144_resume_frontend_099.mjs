import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execution = path.join(pack, '03_execution');
const stateFile = path.join(execution, 'TASK_STATE.json');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const now = new Date().toISOString();
state.updatedAt = now;
state.tasks.backend_144 = { ...state.tasks.backend_144, status: 'complete', completedAt: now, reason: null, evidencePath: '07_finish/backend_144/completion.json' };
state.tasks.frontend_099 = { ...state.tasks.frontend_099, status: 'in_progress', reason: null };
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);

const directory = path.join(pack, '07_finish', 'backend_144');
fs.mkdirSync(directory, { recursive: true });
const completion = {
  taskId: 'backend_144',
  summary: 'Added additive public listing category facets with deterministic counts and publication-safe location/source card metadata, plus optional persisted public code and view-count fields.',
  filesChanged: [
    'packages/contracts/src/search/index.ts',
    'apps/api/src/modules/search/properties.ts',
    'apps/api/tests/search/properties.test.ts',
    'apps/api/tests/search/router.test.ts',
    'apps/api/tests/performance/search-performance.test.ts',
    'apps/web/tests/e2e/public-fixtures.ts'
  ],
  verification: [
    { command: 'npm.cmd run build --workspace @sadat-real-estate/contracts', result: 'passed', exitCode: 0 },
    { command: 'npm.cmd run typecheck --workspace apps/api', result: 'passed', exitCode: 0 },
    { command: 'node --import tsx --test focused search and performance tests', result: 'passed: 7/7', exitCode: 0 },
    { command: 'eslint affected projection files --max-warnings=0', result: 'passed', exitCode: 0 }
  ],
  dataPolicy: 'Taxonomy counts come from published active properties; location and organization labels are bulk-hydrated only from active/approved public records; screenshot-only production content was not added.'
};
fs.writeFileSync(path.join(directory, 'completion.json'), `${JSON.stringify(completion, null, 2)}\n`);
console.log(JSON.stringify({ completed: 'backend_144', resumed: 'frontend_099' }, null, 2));
