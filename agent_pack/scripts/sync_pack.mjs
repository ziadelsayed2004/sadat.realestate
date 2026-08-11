import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(pack, p), 'utf8'));
const write = (p, v) => fs.writeFileSync(path.join(pack, p), typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n');
const catalog = read('03_execution/TASK_CATALOG.json');
const state = read('03_execution/TASK_STATE.json');
const statuses = ['open', 'in_progress', 'partial', 'blocked', 'complete'];
const byStatus = Object.fromEntries(statuses.map((s) => [s, 0]));
const byTrack = {};
for (const task of catalog) {
  const s = state.tasks[task.id]?.status;
  if (!statuses.includes(s)) throw new Error('Invalid status for ' + task.id + ': ' + s);
  byStatus[s] += 1;
  byTrack[task.track] ||= { total: 0, open: 0, in_progress: 0, partial: 0, blocked: 0, complete: 0 };
  byTrack[task.track].total += 1;
  byTrack[task.track][s] += 1;
}
const lines = ['# Task Board — Sadat Real Estate', '', '> Generated from TASK_CATALOG.json + TASK_STATE.json. Do not edit manually.', ''];
let phase = null;
for (const task of catalog) {
  if (task.phase !== phase) { phase = task.phase; lines.push('## ' + phase, ''); }
  const s = state.tasks[task.id].status;
  const box = s === 'complete' ? 'x' : s === 'partial' ? '/' : s === 'blocked' ? '!' : ' ';
  const suffix = s === 'in_progress' ? ' — IN PROGRESS' : '';
  lines.push('- [' + box + '] ' + task.id + ' — ' + task.title + suffix);
}
write('03_execution/TASK_BOARD.md', lines.join('\n') + '\n');
const complete = catalog.filter((task) => state.tasks[task.id].status === 'complete').map((task) => task.id);
write('07_finish/FINISH_INDEX.json', complete);
write('03_execution/COUNT_SUMMARY.json', { total: catalog.length, byTrack, byStatus, selectedTaskId: null, updatedAt: new Date().toISOString() });
const selector = spawnSync(process.execPath, [path.join(pack, 'scripts/select_next_step.mjs')], { stdio: 'inherit' });
if (selector.status !== 0) process.exit(selector.status || 1);
const step = read('step_info.json');
const summary = read('03_execution/COUNT_SUMMARY.json');
summary.selectedTaskId = step.selectedTaskId;
write('03_execution/COUNT_SUMMARY.json', summary);
console.log('Pack state synchronized.');
