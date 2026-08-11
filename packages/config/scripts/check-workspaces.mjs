import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkspaceGraph, validateWorkspaceGraph } from './workspace-policy.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const issues = validateWorkspaceGraph(loadWorkspaceGraph(rootDir));
if (issues.length > 0) {
  console.error(issues.map((issue) => `WORKSPACE_CHECK_ERROR: ${issue}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('WORKSPACE_CHECK_OK');
}
