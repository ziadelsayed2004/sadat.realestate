import { spawnSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function installQualityHooks(runGit) {
  const repository = runGit(['rev-parse', '--show-toplevel']);
  if (repository.status !== 0) return 'QUALITY_HOOK_SKIPPED release directory has no Git checkout';
  const checkout = path.resolve(repository.stdout.trim());
  if ((process.platform === 'win32' ? checkout.toLowerCase() !== root.toLowerCase() : checkout !== root)) return 'QUALITY_HOOK_SKIPPED directory belongs to a different Git checkout';
  const current = runGit(['config', '--get', 'core.hooksPath']);
  if (current.status !== 0 && current.status !== 1) throw new Error('Could not inspect the Git hook configuration');
  if (current.stdout.trim() && current.stdout.trim() !== '.githooks') {
    throw new Error('An existing core.hooksPath is configured. Add npm run verify:push -- --pre-push to its pre-push hook; it will not be overwritten.');
  }
  const result = runGit(['config', '--local', 'core.hooksPath', '.githooks']);
  if (result.status !== 0) throw new Error('Could not enable the pre-push quality checks');
  return 'QUALITY_HOOK_ENABLED every push runs lint, type checks, build, and the complete test suite';
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    if (process.platform !== 'win32') chmodSync(path.join(root, '.githooks/pre-push'), 0o755);
    console.log(installQualityHooks(args => spawnSync('git', args, { cwd: root, encoding: 'utf8' })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
