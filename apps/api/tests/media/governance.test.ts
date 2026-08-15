import assert from 'node:assert/strict';
import test from 'node:test';
import { mediaCleanupCandidateSchema } from '@sadat-real-estate/contracts';
import {
  MEDIA_RETENTION_WINDOWS_MS,
  MediaGovernanceError,
  assertMediaPlacement,
  evaluateMediaCleanup,
  executeMediaCleanup,
  planMediaCleanup,
  sanitizeMediaFilename
} from '../../src/modules/media/governance.js';
import type { MediaCleanupCandidate } from '@sadat-real-estate/contracts';

const now = new Date('2026-08-14T12:00:00.000Z');
const id = '0123456789abcdef01234567';
const actor = 'abcdefabcdefabcdefabcdef';

function candidate(overrides: Partial<MediaCleanupCandidate> = {}): MediaCleanupCandidate {
  return {
    id,
    storageKey: `private/${'a'.repeat(32)}`,
    visibility: 'private',
    namespace: 'private',
    lifecycle: 'ready',
    attached: true,
    referenceAt: new Date(now.getTime() - MEDIA_RETENTION_WINDOWS_MS.superseded - 1).toISOString(),
    retentionReason: 'superseded',
    ...overrides
  };
}

test('sanitizes display names and keeps storage placement independent from user filenames', () => {
  assert.equal(sanitizeMediaFilename('../folder\\photo\u0000.jpg'), 'photo.jpg');
  const long = sanitizeMediaFilename(`${'x'.repeat(140)}.png`);
  assert.equal(long.length, 120);
  assert.throws(() => sanitizeMediaFilename('..'), (error: unknown) => error instanceof MediaGovernanceError && error.code === 'MEDIA_FILENAME_INVALID');
  assert.doesNotThrow(() => assertMediaPlacement({ visibility: 'private', namespace: 'quarantine', storageKey: `quarantine/${'a'.repeat(32)}` }));
  assert.doesNotThrow(() => assertMediaPlacement({ visibility: 'public', namespace: 'public', storageKey: `public/${'b'.repeat(32)}` }));
  assert.throws(() => assertMediaPlacement({ visibility: 'public', namespace: 'private', storageKey: `private/${'c'.repeat(32)}` }), /MEDIA_NAMESPACE_MISMATCH/);
  assert.throws(() => assertMediaPlacement({ visibility: 'private', namespace: 'private', storageKey: 'private/user-file.jpg' }), /MEDIA_STORAGE_KEY_INVALID/);
});

test('applies the approved retention schedule, orphan cleanup, and legal holds deterministically', () => {
  const due = evaluateMediaCleanup(candidate({ attached: false, retentionReason: undefined }), now);
  assert.equal(due.action, 'delete');
  assert.equal(due.reason, 'eligible');
  assert.equal(due.retentionReason, 'unattached_incomplete');
  const infected = evaluateMediaCleanup(candidate({ retentionReason: 'infected', referenceAt: new Date(now.getTime() - 25 * 60 * 60 * 1_000).toISOString() }), now);
  assert.equal(infected.action, 'delete');
  assert.equal(infected.deleteAfter, new Date(now.getTime() - 60 * 60 * 1_000).toISOString());
  const pending = evaluateMediaCleanup(candidate({ retentionReason: 'abandoned_draft', referenceAt: now.toISOString() }), now);
  assert.equal(pending.reason, 'not_due');
  for (const [retentionReason, window] of Object.entries(MEDIA_RETENTION_WINDOWS_MS) as [MediaCleanupCandidate['retentionReason'] & string, number][]) {
    const expired = evaluateMediaCleanup(candidate({
      attached: retentionReason === 'unattached_incomplete' ? false : true,
      retentionReason: retentionReason as NonNullable<MediaCleanupCandidate['retentionReason']>,
      referenceAt: new Date(now.getTime() - window - 1).toISOString()
    }), now);
    assert.equal(expired.action, 'delete', retentionReason);
  }
  const held = evaluateMediaCleanup(candidate({ legalHold: { actorId: actor, reason: 'Compliance review', startedAt: now.toISOString() } }), now);
  assert.equal(held.action, 'retain');
  assert.equal(held.reason, 'legal_hold');
  const attachedWithoutReason = evaluateMediaCleanup(candidate({ retentionReason: undefined }), now);
  assert.equal(attachedWithoutReason.reason, 'missing_retention_reason');
  const sorted = planMediaCleanup([
    candidate({ id: 'ffffffffffffffffffffffff' }),
    candidate({ id: '000000000000000000000001' })
  ], now);
  assert.deepEqual(sorted.map(item => item.id), ['000000000000000000000001', 'ffffffffffffffffffffffff']);
});

test('executes eligible cleanup with tombstone-first, retry-safe ordering', async () => {
  const events: string[] = [];
  const result = await executeMediaCleanup([
    candidate({ attached: false, retentionReason: undefined }),
    candidate({ id: '111111111111111111111111', referenceAt: now.toISOString() })
  ], {
    async markDeleted(assetId, reason) { events.push(`mark:${assetId}:${reason}`); },
    async deleteObject(storageKey) { events.push(`delete:${storageKey}`); }
  }, now);
  assert.equal(result[0]?.cleaned, true);
  assert.equal(result[1]?.cleaned, false);
  assert.equal(events.length, 2);
  assert.match(events[0]!, /^mark:/);
  assert.match(events[1]!, /^delete:/);
  assert.equal(mediaCleanupCandidateSchema.safeParse({ ...candidate(), unexpected: true }).success, false);
});
