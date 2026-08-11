import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  path.join(configRoot, 'scripts', 'workspace-policy.mjs'),
  path.join(configRoot, 'scripts', 'check-workspaces.mjs'),
  path.join(configRoot, 'scripts', 'check-syntax.mjs'),
  path.join(configRoot, 'scripts', 'run-tests.mjs'),
  path.join(configRoot, 'tests', 'workspace-policy.test.mjs')
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('SYNTAX_CHECK_OK');
