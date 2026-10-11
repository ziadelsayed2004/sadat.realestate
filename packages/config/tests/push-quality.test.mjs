import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assertPushSnapshot, runPushChecks } from '../../../scripts/verify-push.mjs';
import { installQualityHooks } from '../../../scripts/install-quality-hooks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('every push runs all checks regardless of the changed feature', () => {
  const seen = [];
  assert.equal(runPushChecks(script => { seen.push(script); return 0; }), 0);
  assert.deepEqual(seen, ['lint', 'typecheck', 'test']);
});

test('a failed or interrupted check stops the push instead of continuing', () => {
  for (const status of [1, 2, null]) {
    const seen = [];
    assert.equal(runPushChecks(script => { seen.push(script); return script === 'typecheck' ? status : 0; }), status ?? 1);
    assert.deepEqual(seen, ['lint', 'typecheck']);
  }
});

test('checks cannot approve uncommitted changes or a different pushed commit', () => {
  assert.throws(() => assertPushSnapshot({ head: 'checked', status: ' M apps/web/example.tsx' }, ['checked']), /pending changes/);
  assert.throws(() => assertPushSnapshot({ head: 'checked', status: '' }, ['untested']), /working tree/);
  assert.doesNotThrow(() => assertPushSnapshot({ head: 'checked', status: '' }, ['checked']));
});

test('npm installation enables the tracked hook and the full test command covers server and client', () => {
  const commands = [];
  const output = installQualityHooks(args => {
    commands.push(args);
    return args[0] === 'rev-parse' ? { status: 0, stdout: root } : { status: args.includes('--get') ? 1 : 0, stdout: '' };
  });
  assert.match(output, /QUALITY_HOOK_ENABLED/);
  assert.deepEqual(commands.at(-1), ['config', '--local', 'core.hooksPath', '.githooks']);
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts.prepare, 'node scripts/install-quality-hooks.mjs');
  assert.equal(manifest.scripts['verify:push'], 'node scripts/verify-push.mjs');
  assert.match(manifest.scripts.test, /run-tests.mjs.*test --workspace apps\/web/);
  assert.match(readFileSync(path.join(root, 'packages/config/scripts/run-tests.mjs'), 'utf8'), /'test', '--workspace', 'apps\/api'/);
  assert.match(readFileSync(path.join(root, '.githooks/pre-push'), 'utf8'), /exec npm run verify:push -- --pre-push/);
});

test('release folders skip hook installation and existing custom hooks are preserved', () => {
  assert.match(installQualityHooks(() => ({ status: 128, stdout: '' })), /SKIPPED/);
  const commands = [];
  assert.throws(() => installQualityHooks(args => {
    commands.push(args);
    return { status: 0, stdout: args[0] === 'rev-parse' ? root : 'custom-hooks' };
  }), /not be overwritten/);
  assert.equal(commands.length, 2);
});
