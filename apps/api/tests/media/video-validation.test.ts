import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { PropertyVideoValidationTransform } from '../../src/modules/media/video-validation.js';
import { mediaByteRange } from '../../src/modules/media/content.js';
import { createInMemoryStorageAdapter, createLocalFilesystemStorageAdapter } from '../../src/modules/uploads/adapters.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

function box(type: string, data: Buffer) { const header = Buffer.alloc(8); header.writeUInt32BE(data.length + 8); header.write(type, 4, 'ascii'); return Buffer.concat([header, data]); }
const mp4 = Buffer.concat([box('ftyp', Buffer.from('isom\0\0\0\0isomavc1')), box('moov', Buffer.alloc(8)), box('mdat', Buffer.alloc(16))]);
async function validate(bytes: Buffer, filename = 'tour.mp4') {
  const validator = new PropertyVideoValidationTransform(filename);
  await pipeline(Readable.from(Array.from(bytes, byte => Buffer.from([byte]))), validator, new Writable({ write(_chunk, _encoding, callback) { callback(); } }));
  return validator.result();
}

test('validates MP4 structure across fragmented streams and rejects renamed, truncated, oversized and unsupported files', async () => {
  const result = await validate(mp4);
  assert.equal(result.detectedMime, 'video/mp4'); assert.equal(result.byteSize, mp4.length);
  assert.equal((await validate(mp4, 'WhatsApp Video 2026-10-07 at 3.07.03 PM.mp4')).detectedMime, 'video/mp4');
  await assert.rejects(validate(Buffer.from('this is not a video')));
  await assert.rejects(validate(mp4.subarray(0, -1)));
  await assert.rejects(validate(box('ftyp', Buffer.from('isom\0\0\0\0'))));
  await assert.rejects(validate(mp4, 'tour.exe.mp4'));
  const validator = new PropertyVideoValidationTransform('large.mp4');
  await assert.rejects(pipeline(Readable.from(Buffer.alloc(10 * 1024 * 1024 + 1)), validator, new Writable({ write(_chunk, _encoding, callback) { callback(); } })));
});

test('parses HTTP ranges and reads exact ranges from memory and filesystem storage for video seeking', async () => {
  assert.deepEqual(mediaByteRange('bytes=2-5', 10), { start: 2, end: 5 });
  assert.deepEqual(mediaByteRange('bytes=-3', 10), { start: 7, end: 9 });
  assert.deepEqual(mediaByteRange('bytes=5-', 10), { start: 5, end: 9 });
  for (const value of ['bytes=10-', 'bytes=-0', 'bytes=5-2', 'bytes=0-1,3-4']) assert.equal(mediaByteRange(value, 10), null);
  const root = await mkdtemp(path.join(tmpdir(), 'sadat-media-range-'));
  try {
    for (const storage of [createInMemoryStorageAdapter(), createLocalFilesystemStorageAdapter(root)]) {
      const key = `quarantine/${'a'.repeat(32)}`;
      await storage.putPrivateQuarantine(key, Readable.from(mp4));
      const chunks = []; for await (const chunk of await storage.openPrivate(key, { start: 2, end: 12 })) chunks.push(chunk as Buffer);
      assert.deepEqual(Buffer.concat(chunks), mp4.subarray(2, 13));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
