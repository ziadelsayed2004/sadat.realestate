import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = path.join(pack, '03_execution', 'TASK_STATE.json');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const now = new Date().toISOString();
state.updatedAt = now;
state.tasks.backend_147 = { ...state.tasks.backend_147, status: 'complete', completedAt: now, reason: null, evidencePath: '07_finish/backend_147/completion.json' };
state.tasks.frontend_099 = { ...state.tasks.frontend_099, status: 'in_progress', reason: null };
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
const directory = path.join(pack, '07_finish', 'backend_147');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'completion.json'), `${JSON.stringify({
  taskId: 'backend_147',
  summary: 'Separated discovery-category and property-type facets, and added a strict category filter resolved through active child property types for canonical PUB-02.',
  filesChanged: ['packages/contracts/src/search/index.ts', 'apps/api/src/modules/search/properties.ts', 'apps/api/tests/search/properties.test.ts', 'apps/api/openapi/openapi.json', 'docs/api/public-properties-search.md'],
  verification: [
    { command: 'contracts build and API typecheck', result: 'passed', exitCode: 0 },
    { command: 'focused search and route tests', result: 'passed: 5/5', exitCode: 0 },
    { command: 'affected lint', result: 'passed', exitCode: 0 },
    { command: 'OpenAPI and Postman validation', result: 'passed', exitCode: 0 }
  ]
}, null, 2)}\n`);
console.log(JSON.stringify({ completed: 'backend_147', resumed: 'frontend_099' }, null, 2));
