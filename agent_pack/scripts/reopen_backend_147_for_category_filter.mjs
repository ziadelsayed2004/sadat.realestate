import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = path.join(pack, '03_execution', 'TASK_STATE.json');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const now = new Date().toISOString();
state.updatedAt = now;
state.tasks.backend_147 = { ...state.tasks.backend_147, status: 'in_progress', completedAt: null, reason: null, evidencePath: null };
state.tasks.frontend_099 = { ...state.tasks.frontend_099, status: 'partial', reason: 'Paused at PUB-02 while backend_147 completes strict category-rail filtering through active child property types.' };
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify({ reopened: 'backend_147', paused: 'frontend_099' }, null, 2));
