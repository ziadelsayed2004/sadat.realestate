import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import type { Connection } from 'mongoose';
import sharp from 'sharp';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createTeamPhotos } from '../../src/modules/cms/team-photos.js';
import { ApiContractError } from '../../src/modules/contracts/error-boundary.js';
import { createInMemoryStorageAdapter, createDeterministicMalwareScanner } from '../../src/modules/uploads/adapters.js';

const claims: AccessTokenClaims = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: 'a'.repeat(24), sid: 'b'.repeat(24), role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'team-photo-test' };
const context = { requestId: 'team-photo-test', traceId: 'a'.repeat(32) };
const fails = (status: number) => (error: unknown) => error instanceof ApiContractError && error.statusCode === status;
function harness(options: { allowed?: boolean; infected?: boolean; auditFails?: boolean } = {}) {
  let row: Record<string, unknown> | undefined;
  let published = false;
  const storage = createInMemoryStorageAdapter();
  const audits: string[] = [];
  const connection = {
    collection(name: string) {
      return name === 'cms_team_photos' ? {
        async insertOne(value: Record<string, unknown>) { row = value; },
        async findOne(filter: Record<string, unknown>) { return row && String(filter._id) === String(row._id) && storage.has(String(row.storageKey)) ? row : null; }
      } : {
        async findOne(filter: Record<string, unknown>) {
          assert.equal(filter.status, 'published'); assert.equal(filter.active, true);
          assert.equal(String(filter.photoAssetId), String(row?._id));
          return published ? { _id: 'team' } : null;
        }
      };
    },
    async startSession() { return { async withTransaction(operation: () => Promise<void>) { await operation(); }, async endSession() {} }; }
  } as unknown as Connection;
  const service = createTeamPhotos({ connection, storage,
    scanner: createDeterministicMalwareScanner(options.infected ? 'infected' : 'clean'),
    authorization: { async authorize() { return options.allowed ?? true; } },
    audit: { async record(input) { if (options.auditFails) throw new Error('Audit failed'); audits.push(input.action); return 'audit'; } }
  });
  return { service, audits, storage, row: () => row, publish: (value: boolean) => { published = value; } };
}
async function png() { return sharp({ create: { width: 200, height: 300, channels: 3, background: '#123456' } }).png().toBuffer(); }
test('uploads a scanned portrait and allows public downloads only while attached to a published active member', async () => {
  const fixture = harness();
  const photo = await fixture.service.upload(claims, Readable.from(await png()), 'image/png', context);
  assert.match(photo.id, /^[a-f0-9]{24}$/);
  assert.equal(photo.imageUrl, `/api/v1/public/team-photos/${photo.id}`);
  await fixture.service.validateAttach(photo.id);
  await assert.rejects(fixture.service.open(photo.id), fails(404));
  const preview = await fixture.service.open(photo.id, claims);
  const chunks: Buffer[] = []; for await (const chunk of preview.stream) chunks.push(Buffer.from(chunk));
  assert.equal((await sharp(Buffer.concat(chunks)).metadata()).format, 'webp');
  fixture.publish(true);
  assert.equal((await fixture.service.open(photo.id)).mime, 'image/webp');
  fixture.publish(false);
  await assert.rejects(fixture.service.open(photo.id), fails(404));
  assert.deepEqual(fixture.audits, ['cms.team.photo.upload']);
});
test('rejects unsupported, corrupt, oversized, mismatched and infected files before storing them', async () => {
  const fixture = harness();
  for (const [bytes, mime] of [[Buffer.from('bad'), 'image/png'], [await png(), 'image/jpeg'], [await png(), 'text/plain'], [Buffer.alloc(10 * 1024 * 1024 + 1), 'image/png']] as const) {
    await assert.rejects(fixture.service.upload(claims, Readable.from(bytes), mime, context), fails(400));
  }
  assert.equal(fixture.row(), undefined);
  const infected = harness({ infected: true });
  await assert.rejects(infected.service.upload(claims, Readable.from(await png()), 'image/png', context), fails(400));
  assert.equal(infected.row(), undefined);
});
test('enforces administrator permissions and cleans up storage on audit failure', async () => {
  const fixture = harness({ allowed: false });
  await assert.rejects(fixture.service.upload(claims, Readable.from(await png()), 'image/png', context), fails(403));
  await assert.rejects(harness().service.upload({ ...claims, role: 'seeker' }, Readable.from(await png()), 'image/png', context), fails(403));
  const failed = harness({ auditFails: true });
  await assert.rejects(failed.service.upload(claims, Readable.from(await png()), 'image/png', context), /Audit failed/);
  assert.equal(failed.storage.has(String(failed.row()?.storageKey)), false);
});
