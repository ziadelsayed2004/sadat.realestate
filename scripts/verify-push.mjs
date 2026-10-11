import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const pushChecks = ['lint', 'typecheck', 'test'];

export function runPushChecks(run) {
  for (const script of pushChecks) {
    const status = run(script);
    if (status !== 0) return status ?? 1;
  }
  return 0;
}

export function assertPushSnapshot(snapshot, commits) {
  if (snapshot.status.trim()) throw new Error('Commit or stash pending changes before pushing, so checks run on the code being uploaded.');
  if (commits.some(commit => commit !== snapshot.head)) throw new Error('Check out the commit being pushed first; a different working tree cannot verify it.');
}

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Git verification failed: ${args[0]}`);
  return result.stdout.trim();
}

function snapshot() {
  return { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) };
}

async function main() {
  const hook = process.argv.includes('--pre-push');
  let checked;
  if (hook) {
    let updates = '';
    for await (const chunk of process.stdin) updates += chunk;
    const refs = updates.trim().split('\n').filter(Boolean).map(line => line.trim().split(/\s+/u)).filter(([, sha]) => !/^0+$/u.test(sha));
    if (!refs.length) return;
    checked = snapshot();
    assertPushSnapshot(checked, refs.map(([ref]) => git(['rev-parse', '--verify', `${ref}^{commit}`])));
  }
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Run npm run verify:push to use the installed npm CLI on Windows or Linux.');
  const status = runPushChecks(script => {
    console.log(`PUSH_CHECK npm run ${script}`);
    return spawnSync(process.execPath, [npmCli, 'run', script], { cwd: root, stdio: 'inherit' }).status;
  });
  if (status !== 0) {
    console.error('PUSH_BLOCKED quality checks failed. Fix the reported errors and retry; no code was uploaded.');
    process.exitCode = status;
    return;
  }
  if (checked) {
    const after = snapshot();
    assertPushSnapshot(after, [checked.head]);
  }
  console.log('PUSH_CHECK_OK all quality checks passed');
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  await main().catch(error => { console.error(`PUSH_BLOCKED ${error.message}`); process.exitCode = 1; });
}
