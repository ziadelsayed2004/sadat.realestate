import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '03_execution', 'TASK_CATALOG.json');
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const task = catalog.find((entry) => entry.id === 'backend_143');
if (task === undefined) throw new Error('backend_143 missing');
task.screens = [];
fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ taskId: task.id, screens: task.screens }));
