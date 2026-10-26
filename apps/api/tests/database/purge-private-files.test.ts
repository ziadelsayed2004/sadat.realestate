import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { purgeUnreferencedPrivateFiles } from '../../src/modules/database/purge-private-files.js';

test('reset removes orphan uploads while preserving configuration assets and rejects paths outside storage', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'launch-files-'));
  try {
    await mkdir(path.join(root, 'photos'));
    await writeFile(path.join(root, 'photos', 'keep.webp'), 'configuration image');
    await writeFile(path.join(root, 'photos', 'demo.webp'), 'trial image');
    await assert.rejects(purgeUnreferencedPrivateFiles(root, ['../outside']), /OUTSIDE_ROOT/);
    assert.equal(await readFile(path.join(root, 'photos', 'demo.webp'), 'utf8'), 'trial image');
    assert.deepEqual(await purgeUnreferencedPrivateFiles(root, ['photos/keep.webp']), { deleted: 1, retained: 1 });
    assert.equal(await readFile(path.join(root, 'photos', 'keep.webp'), 'utf8'), 'configuration image');
    await assert.rejects(readFile(path.join(root, 'photos', 'demo.webp')), { code: 'ENOENT' });
  } finally { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); await rm(root, { recursive: true, force: true }); }
});
