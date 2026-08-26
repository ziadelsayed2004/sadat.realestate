import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '03_execution', 'TASK_STATE.json');
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = new Date().toISOString();
state.updatedAt = now;
state.tasks.backend_143 = {
  ...state.tasks.backend_143,
  status: 'complete',
  completedAt: now,
  reason: null,
  evidencePath: '07_finish/backend_143/completion.json'
};
state.tasks.frontend_099 = {
  ...state.tasks.frontend_099,
  status: 'in_progress',
  completedAt: null,
  reason: null,
  evidencePath: null
};
fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify({ completed: 'backend_143', resumed: 'frontend_099' }));
