import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const native = path.join(root, 'deploy/native');
const temporaryRoot = path.join(root, '.tmp');

function runGit(args, options = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8', windowsHide: true, ...options });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
}

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
    const retained = ['package-lock.json', '.env.production.example', '.github/workflows/ci.yml', 'docs/design_sources/final_screens/admin/ADM-01.png', 'apps/web/public/assets/logo.svg', 'apps/web/tests/e2e/visual.spec.ts', ...requiredQualityEvidence];
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
  for (const evidence of requiredQualityEvidence) {
    const parts = evidence.split('/');
    for (let length = 2; length <= parts.length; length++) {
      const rule = `+ /${parts.slice(0, length).join('/')}${length < parts.length ? '/' : ''}`;
      assert.ok(filters.includes(rule), `rsync must retain required evidence: ${rule}`);
      assert.ok(filters.indexOf(rule) < filters.indexOf('/docs/quality/***'));
    }
    assert.ok(fs.existsSync(path.join(root, evidence)), evidence);
  }
  assert.doesNotMatch(filters, /design_sources|public\/assets|tests\/e2e/u);
  assert.ok(clone.indexOf('check-disk-space.sh') < clone.indexOf('git clone'));
  assert.match(clone, /git clone .*--no-checkout/u);
  assert.ok(clone.indexOf('sparse-checkout set') < clone.indexOf('checkout --force'));
  for (const command of ['npm run typecheck', 'npm run lint', 'npm test', 'npm run build']) assert.ok(release.includes(command));
  assert.ok(release.indexOf('trap cleanup_failed_release EXIT') < release.indexOf('rsync -a'));
  assert.match(release, /readlink -e "\$CURRENT_LINK".*!= "\$RELEASE_DIR"/u);
  assert.ok(release.indexOf('mkdir "$RELEASE_DIR"') < release.indexOf('trap cleanup_failed_release EXIT'));
});
