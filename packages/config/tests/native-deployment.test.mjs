import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const native = path.join(root, 'deploy/native');
const temporaryRoot = path.join(root, '.tmp');
const requiredTestInputs = ['docs/quality/figma_parity/SCREEN_ROUTE_API_JOURNEY_MATRIX.json'];

function runGit(args, options = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8', windowsHide: true, ...options });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
}

test('release copy without Git metadata still verifies generated-capture ignore rules', () => {
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(temporaryRoot, 'release-without-git-'));
  const release = path.join(sandbox, 'release');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/iu.test(key)));
  delete env.NODE_TEST_CONTEXT;
  env.GIT_CEILING_DIRECTORIES = sandbox;
  try {
    for (const file of ['.gitignore', 'packages/config/tests/workspace-policy.test.mjs', 'packages/config/scripts/workspace-policy.mjs']) {
      const destination = path.join(release, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(root, file), destination);
    }
    const checkout = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: release, env, encoding: 'utf8', windowsHide: true });
    assert.equal(checkout.status, 128, 'The regression fixture must not have or discover a .git directory');
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern=generated captures', 'packages/config/tests/workspace-policy.test.mjs'], { cwd: release, env, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /generated captures stay ignored/u);
    assert.equal(fs.existsSync(path.join(release, '.git')), false, 'Verification must not initialize Git in the production release');
  } finally {
    assert.equal(path.dirname(path.resolve(sandbox)), path.resolve(temporaryRoot));
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

// Read the real ledgers so adding required evidence cannot silently break deployment.
const requiredQualityEvidence = [...new Set(fs.readdirSync(path.join(root, 'agent_pack/07_finish')).flatMap(feature => {
  const ledgerPath = path.join(root, 'agent_pack/07_finish', feature, 'design-comparison.json');
  if (!fs.existsSync(ledgerPath)) return [];
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  return [...(ledger.screens ?? []), ...(ledger.entries ?? [])].flatMap(screen =>
    Array.isArray(screen.runtimeEvidence) ? screen.runtimeEvidence.filter(evidence =>
      typeof evidence === 'string' && evidence.startsWith('docs/quality/')) : []);
}))];

test('sparse deployment checkout retains required parity evidence but excludes unused captures', () => {
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(temporaryRoot, 'deployment-test-'));
  const source = path.join(sandbox, 'source');
  const clone = path.join(sandbox, 'clone');
  try {
    fs.mkdirSync(source);
    const retained = ['package-lock.json', '.env.production.example', '.github/workflows/ci.yml', 'docs/design_sources/final_screens/admin/ADM-01.png', 'apps/web/public/assets/logo.svg', 'apps/web/tests/e2e/visual.spec.ts', ...requiredTestInputs, ...requiredQualityEvidence];
    const excluded = ['docs/quality/figma_parity/screens/PUB-10/figma.png', 'docs/quality/figma_parity/screens/SEK-04/unused.png', 'docs/quality/figma_parity/report.json', 'docs/quality/unused.json'];
    const files = [...retained, ...excluded];
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true });
      fs.writeFileSync(path.join(source, file), file);
    }
    runGit(['init', '--quiet', '--initial-branch=main', source]);
    runGit(['-C', source, 'add', '.']);
    runGit(['-C', source, '-c', 'user.name=Deployment Test', '-c', 'user.email=deployment@example.invalid', 'commit', '--quiet', '-m', 'fixture']);
    runGit(['clone', '--quiet', '--no-checkout', '--depth', '1', source, clone]);
    runGit(['-C', clone, 'sparse-checkout', 'set', '--no-cone', '--stdin'], { input: fs.readFileSync(path.join(native, 'release-source.sparse-checkout'), 'utf8') });
    runGit(['-C', clone, 'checkout', '--force', 'main']);
    for (const file of retained) assert.equal(fs.existsSync(path.join(clone, file)), true, file);
    for (const file of excluded) assert.equal(fs.existsSync(path.join(clone, file)), false, file);
    // Ubuntu deployment/CI can also exercise the actual rsync exclusion syntax.
    if (spawnSync('rsync', ['--version'], { windowsHide: true }).status === 0) {
      const copy = path.join(sandbox, 'copy');
      fs.mkdirSync(copy);
      const result = spawnSync('rsync', ['-a', `--exclude-from=${path.join(native, 'release-source.exclude')}`, `${source}/`, `${copy}/`], { encoding: 'utf8', windowsHide: true });
      assert.equal(result.status, 0, result.stderr);
      for (const file of retained) assert.equal(fs.existsSync(path.join(copy, file)), true, `rsync: ${file}`);
      for (const file of excluded) assert.equal(fs.existsSync(path.join(copy, file)), false, `rsync: ${file}`);
      // --from0 changes how both the tracked-path list and filter file are read.
      fs.writeFileSync(path.join(source, 'operator.log'), 'untracked');
      fs.writeFileSync(path.join(source, '.env.production'), 'fixture-only-secret');
      const tracked = spawnSync('git', ['-C', source, 'ls-files', '-z'], { encoding: 'utf8', windowsHide: true });
      assert.equal(tracked.status, 0, tracked.stderr);
      const list = path.join(sandbox, 'tracked.list');
      const rules = path.join(sandbox, 'rules.list');
      fs.writeFileSync(list, tracked.stdout);
      fs.writeFileSync(rules, fs.readFileSync(path.join(native, 'release-source.exclude'), 'utf8').replaceAll('\n', '\0'));
      const managed = path.join(sandbox, 'managed');
      fs.mkdirSync(managed);
      const handoff = spawnSync('rsync', ['-a', '--from0', `--files-from=${list}`, `--exclude-from=${rules}`, '--include=.env*.example', '--exclude=.env*', `${source}/`, `${managed}/`], { encoding: 'utf8', windowsHide: true });
      assert.equal(handoff.status, 0, handoff.stderr);
      for (const file of retained) assert.equal(fs.existsSync(path.join(managed, file)), true, `managed rsync: ${file}`);
      for (const file of [...excluded, '.env.production', 'operator.log']) assert.equal(fs.existsSync(path.join(managed, file)), false, `managed rsync: ${file}`);
    }
    const result = spawnSync('git', ['-C', clone, 'status', '--porcelain'], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.stdout.trim(), '', 'Sparse exclusions must not make the checkout dirty');
  } finally {
    assert.equal(path.dirname(sandbox), temporaryRoot);
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('both deployment copies exclude generated evidence before copying, while keeping release checks', () => {
  const manage = fs.readFileSync(path.join(native, 'manage-production.sh'), 'utf8');
  const release = fs.readFileSync(path.join(native, 'deploy-release.sh'), 'utf8');
  const clone = fs.readFileSync(path.join(native, 'deploy-from-github.sh'), 'utf8');
  const filters = fs.readFileSync(path.join(native, 'release-source.exclude'), 'utf8');
  assert.match(manage, /--delete-excluded/u);
  for (const source of [manage, release]) assert.match(source, /--exclude-from=.*release-source\.exclude/u);
  assert.match(filters, /^\/docs\/quality\/\*\*\*$/mu);
  for (const evidence of [...requiredTestInputs, ...requiredQualityEvidence]) {
    const parts = evidence.split('/');
    for (let length = 2; length <= parts.length; length++) {
      const rule = `+ /${parts.slice(0, length).join('/')}${length < parts.length ? '/' : ''}`;
      assert.ok(filters.includes(rule), `rsync must retain required evidence: ${rule}`);
      assert.ok(filters.indexOf(rule) < filters.indexOf('/docs/quality/***'));
    }
    assert.ok(fs.existsSync(path.join(root, evidence)), evidence);
  }
  assert.doesNotMatch(filters, /design_sources\/final_screens|public\/assets|tests\/e2e/u);
  assert.match(filters, /\/docs\/design_sources\/recovery_candidates\/\*\*\*/u);
  assert.ok(clone.indexOf('check-disk-space.sh') < clone.indexOf('git clone'));
  assert.match(clone, /git clone .*--no-checkout/u);
  assert.ok(clone.indexOf('sparse-checkout set') < clone.indexOf('checkout --force'));
  assert.doesNotMatch(manage, /bash "\$STAGED_SOURCE\/deploy\/native\/deploy-from-github\.sh"/u);
  assert.match(manage, /bash "\$STAGED_SOURCE\/deploy\/native\/deploy-release\.sh" "\$STAGED_SOURCE"/u);
  assert.match(manage, /trap cleanup_manage EXIT/u);
  assert.match(manage, /--from0 --files-from=.*ls-files -z/u);
  assert.match(manage, /setpriv --reuid=elsadat --regid=elsadat --init-groups env/u);
  assert.match(manage, /HOME=\/var\/lib\/elsadat USER=elsadat LOGNAME=elsadat/u);
  assert.match(manage, /tr '\\n' '\\0' < .*release-source\.exclude/u);
  assert.ok(manage.indexOf("--include='.env*.example'") < manage.indexOf("--exclude='.env*'"));
  assert.ok(release.indexOf('prune-deployments.sh') < release.indexOf('check-disk-space.sh'));
  assert.ok(clone.indexOf('prune-deployments.sh') < clone.indexOf('check-disk-space.sh'));
  assert.match(clone, /prune-deployments\.sh" "\$\(realpath -e "\$SCRIPT_DIR\/\.\.\/\.\."\)"/u);
  for (const command of ['npm run typecheck', 'npm run lint', 'npm test', 'npm run build']) assert.ok(release.includes(command));
  assert.ok(release.indexOf('trap cleanup_failed_release EXIT') < release.indexOf('rsync -a'));
  assert.match(release, /readlink -e "\$CURRENT_LINK".*!= "\$RELEASE_DIR"/u);
  assert.ok(release.indexOf('mkdir "$RELEASE_DIR"') < release.indexOf('trap cleanup_failed_release EXIT'));
});
