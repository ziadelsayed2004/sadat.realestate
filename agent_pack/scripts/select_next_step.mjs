import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(pack, p), 'utf8'));
const catalog = read('03_execution/TASK_CATALOG.json');
const state = read('03_execution/TASK_STATE.json');
const status = (id) => state.tasks[id]?.status;
const ready = (task) => task.dependsOn.every((id) => status(id) === 'complete');
const active = catalog.find((task) => status(task.id) === 'in_progress');
const selected = active || catalog.find((task) => ['open', 'partial'].includes(status(task.id)) && ready(task)) || null;
const blockedByDependencies = catalog.filter((task) => ['open', 'partial'].includes(status(task.id)) && !ready(task)).map((task) => ({
  taskId: task.id,
  unresolved: task.dependsOn.filter((id) => status(id) !== 'complete').map((id) => ({ taskId: id, status: status(id) || 'missing' })),
}));
const counts = {};
for (const task of catalog) {
  counts[task.track] ||= { total: 0, open: 0, in_progress: 0, partial: 0, blocked: 0, complete: 0 };
  counts[task.track].total += 1;
  counts[task.track][status(task.id)] += 1;
}
const output = {
  generatedAt: new Date().toISOString(),
  selectedTaskId: selected?.id || null,
  selectedTaskStatus: selected ? status(selected.id) : null,
  selectedTaskFile: selected?.atomicTaskFile || null,
  selectedTask: selected,
  counts,
  blockedTasks: catalog.filter((task) => status(task.id) === 'blocked').map((task) => ({ taskId: task.id, reason: state.tasks[task.id].reason })),
  blockedByDependencies,
  graphComplete: catalog.every((task) => status(task.id) === 'complete'),
};
fs.writeFileSync(path.join(pack, 'step_info.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ selectedTaskId: output.selectedTaskId, selectedTaskFile: output.selectedTaskFile, graphComplete: output.graphComplete, counts }, null, 2));
