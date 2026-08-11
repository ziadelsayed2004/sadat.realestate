import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [taskId, nextStatus, ...rest] = process.argv.slice(2);
const reasonIndex = rest.indexOf('--reason');
const reason = reasonIndex >= 0 ? rest[reasonIndex + 1] : null;
const allowed = ['open', 'in_progress', 'partial', 'blocked', 'complete'];
if (!taskId || !allowed.includes(nextStatus)) {
  console.error('Usage: node scripts/set_task_status.mjs <task_id> <open|in_progress|partial|blocked|complete> [--reason text]');
  process.exit(2);
}
const catalogPath = path.join(pack, '03_execution/TASK_CATALOG.json');
const statePath = path.join(pack, '03_execution/TASK_STATE.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const task = catalog.find((entry) => entry.id === taskId);
if (!task || !state.tasks[taskId]) throw new Error('Unknown task: ' + taskId);
const currentStatus = state.tasks[taskId].status;
const getStatus = (id) => state.tasks[id]?.status;
const unresolved = task.dependsOn.filter((id) => getStatus(id) !== 'complete');
if (['in_progress', 'complete'].includes(nextStatus) && unresolved.length) throw new Error('Unresolved dependencies: ' + unresolved.join(', '));
if (nextStatus === 'in_progress') {
  const other = Object.entries(state.tasks).find(([id, entry]) => id !== taskId && entry.status === 'in_progress');
  if (other) throw new Error('Another task is already in progress: ' + other[0]);
}
if (['partial', 'blocked', 'open'].includes(nextStatus) && !reason) throw new Error('--reason is required for ' + nextStatus);
let evidencePath = null;
if (nextStatus === 'complete') {
  if (!['in_progress', 'partial'].includes(currentStatus)) throw new Error('Task must be in_progress or partial before completion; current=' + currentStatus);
  evidencePath = '07_finish/' + taskId + '/completion.json';
  const absolute = path.join(pack, evidencePath);
  if (!fs.existsSync(absolute)) throw new Error('Missing completion evidence: ' + evidencePath);
  const evidence = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  if (evidence.taskId !== taskId) throw new Error('Evidence taskId mismatch');
  if (!evidence.summary || !Array.isArray(evidence.filesChanged) || !evidence.filesChanged.length || !Array.isArray(evidence.verification) || !evidence.verification.length) {
    throw new Error('Evidence requires summary, non-empty filesChanged, and non-empty verification');
  }
  if (evidence.verification.some((entry) => entry.result === 'failed')) throw new Error('Cannot complete with failed verification');
}
const now = new Date().toISOString();
state.tasks[taskId] = {
  ...state.tasks[taskId],
  status: nextStatus,
  startedAt: nextStatus === 'in_progress' ? (state.tasks[taskId].startedAt || now) : state.tasks[taskId].startedAt,
  completedAt: nextStatus === 'complete' ? now : null,
  reason: reason || null,
  evidencePath,
};
state.updatedAt = now;
fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
const sync = spawnSync(process.execPath, [path.join(pack, 'scripts/sync_pack.mjs')], { stdio: 'inherit' });
if (sync.status !== 0) process.exit(sync.status || 1);
console.log(taskId + ' -> ' + nextStatus);
