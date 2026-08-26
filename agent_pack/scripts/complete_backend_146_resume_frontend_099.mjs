import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = path.join(pack, '03_execution', 'TASK_STATE.json');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const now = new Date().toISOString();

state.updatedAt = now;
state.tasks.backend_146 = {
  ...state.tasks.backend_146,
  status: 'complete',
  completedAt: now,
  reason: null,
  evidencePath: '07_finish/backend_146/completion.json'
};
state.tasks.frontend_099 = {
  ...state.tasks.frontend_099,
  status: 'in_progress',
  reason: null
};
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);

const directory = path.join(pack, '07_finish', 'backend_146');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'completion.json'), `${JSON.stringify({
  taskId: 'backend_146',
  summary: 'Added a strict persisted property delivery-status contract and API-backed public filter required by canonical PUB-02.',
  filesChanged: [
    'packages/contracts/src/properties/index.ts',
    'packages/contracts/src/search/index.ts',
    'packages/contracts/src/contracts/index.ts',
    'apps/api/src/modules/properties/models.ts',
    'apps/api/src/modules/properties/repository.ts',
    'apps/api/src/modules/properties/service.ts',
    'apps/api/src/modules/search/properties.ts',
    'apps/api/openapi/openapi.json',
    'apps/api/postman/Sadat-Real-Estate.postman_collection.json',
    'docs/api/public-properties-search.md'
  ],
  verification: [
    { command: 'contracts build', result: 'passed', exitCode: 0 },
    { command: 'API and web typecheck', result: 'passed', exitCode: 0 },
    { command: 'focused property/search/route tests', result: 'passed: 13/13', exitCode: 0 },
    { command: 'affected lint', result: 'passed: 0 errors', exitCode: 0 },
    { command: 'OpenAPI and Postman validation', result: 'passed', exitCode: 0 }
  ]
}, null, 2)}\n`);

console.log(JSON.stringify({ completed: 'backend_146', resumed: 'frontend_099' }, null, 2));
