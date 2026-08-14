import assert from 'node:assert/strict';
import test from 'node:test';
import { createInMemoryNotificationOutbox } from '../../src/modules/notifications/outbox.js';

test('outbox deduplicates lifecycle events and delivers each event once', async () => {
  const outbox = createInMemoryNotificationOutbox();
  const input = { dedupeKey: 'request-1:under_review:v1', requestId: '4123456789abcdef01234567', event: 'request.transitioned' as const, payload: { status: 'under_review' } };
  const first = await outbox.enqueue(input); const replay = await outbox.enqueue(input);
  assert.equal(replay.eventId, first.eventId); assert.equal((await outbox.pending(20)).length, 1);
  assert.equal(await outbox.markDelivered(first.eventId, new Date('2026-08-14T10:00:00.000Z')), true);
  assert.equal(await outbox.markDelivered(first.eventId, new Date()), false); assert.equal((await outbox.pending(20)).length, 0);
});
