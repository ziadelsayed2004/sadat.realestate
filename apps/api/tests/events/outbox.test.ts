import assert from 'node:assert/strict';
import test from 'node:test';
import { outboxEventCreateSchema, outboxEventSchema } from '@sadat-real-estate/contracts';
import {
  OutboxRepositoryError,
  createInMemoryOutboxRepository
} from '../../src/modules/events/repository.js';
import {
  OutboxJobError,
  calculateRetryDelayMs,
  createOutboxWorker
} from '../../src/modules/events/worker.js';

const now = new Date('2026-08-15T10:00:00.000Z');
const aggregateId = '0123456789abcdef01234567';

function input(overrides: Record<string, unknown> = {}) {
  return {
    domain: 'notifications' as const,
    type: 'request.created',
    dedupeKey: 'request:0123456789abcdef01234567:created:v1',
    aggregateType: 'request',
    aggregateId,
    payload: { requestId: aggregateId, locale: 'ar' },
    ...overrides
  };
}

test('outbox contracts are strict, bounded, and reject secrets or unknown fields', () => {
  assert.equal(outboxEventCreateSchema.safeParse({ ...input(), unknown: true }).success, false);
  assert.equal(outboxEventCreateSchema.safeParse({ ...input(), payload: { token: 'never-store-this' } }).success, false);
  assert.equal(outboxEventCreateSchema.safeParse({ ...input(), payload: { nested: { value: true } } }).success, true);
  assert.equal(outboxEventSchema.safeParse({ ...input(), id: aggregateId, status: 'pending', attempts: 0, maxAttempts: 5, availableAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() }).success, true);
});

test('deduplicates identical enqueue replays and rejects conflicting payloads', async () => {
  const repository = createInMemoryOutboxRepository();
  const first = await repository.enqueue(input(), now);
  const replay = await repository.enqueue(input(), new Date(now.getTime() + 1_000));
  assert.equal(replay.id, first.id);
  await assert.rejects(
    () => repository.enqueue(input({ payload: { requestId: aggregateId, locale: 'en' } }), now),
    error => error instanceof OutboxRepositoryError && error.code === 'OUTBOX_DEDUPE_CONFLICT'
  );
});

test('claims with an atomic lease, prevents cross-worker acknowledgement, and reclaims expired work', async () => {
  const repository = createInMemoryOutboxRepository();
  const event = await repository.enqueue(input(), now);
  const claimed = await repository.claimAvailable({ workerId: 'worker-a', leaseMs: 100, limit: 10 }, now);
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0]?.attempts, 1);
  assert.equal(await repository.markDelivered(event.id, 'worker-b', now), false);
  const reclaimed = await repository.claimAvailable({ workerId: 'worker-b', leaseMs: 100, limit: 10 }, new Date(now.getTime() + 101));
  assert.equal(reclaimed[0]?.id, event.id);
  assert.equal(reclaimed[0]?.attempts, 2);
  assert.equal(await repository.markDelivered(event.id, 'worker-a', new Date(now.getTime() + 101)), false);
  assert.equal(await repository.markDelivered(event.id, 'worker-b', new Date(now.getTime() + 102)), true);
  assert.equal((await repository.findById(event.id))?.status, 'delivered');
});

test('retries with deterministic exponential backoff and dead-letters after max attempts', async () => {
  assert.equal(calculateRetryDelayMs(1, 1_000, 10_000), 1_000);
  assert.equal(calculateRetryDelayMs(4, 1_000, 10_000), 8_000);
  assert.equal(calculateRetryDelayMs(8, 1_000, 10_000), 10_000);
  const repository = createInMemoryOutboxRepository();
  const event = await repository.enqueue(input({ maxAttempts: 2 }), now);
  await repository.claimAvailable({ workerId: 'worker-a', leaseMs: 10_000, limit: 1 }, now);
  const retryAt = new Date(now.getTime() + 1_000);
  assert.equal(await repository.retry(event.id, 'worker-a', { code: 'TEMPORARY', message: 'retry later', availableAt: retryAt.toISOString() }, now), 'retry_scheduled');
  await repository.claimAvailable({ workerId: 'worker-a', leaseMs: 10_000, limit: 1 }, retryAt);
  assert.equal(await repository.retry(event.id, 'worker-a', { code: 'UPSTREAM_FAILED', message: 'permanent after retry' }, retryAt), 'dead_lettered');
  const dead = await repository.findById(event.id);
  assert.equal(dead?.status, 'dead_letter');
  assert.equal(dead?.attempts, 2);
  assert.equal(dead?.lastErrorCode, 'UPSTREAM_FAILED');
});

test('worker dispatches notification, SLA, and ads events and fails missing handlers closed', async () => {
  let clock = now;
  const repository = createInMemoryOutboxRepository();
  const delivered: string[] = [];
  await repository.enqueue(input({ type: 'notification.send' }), now);
  await repository.enqueue(input({ domain: 'sla', type: 'request.overdue', dedupeKey: 'request:overdue:v1' }), now);
  await repository.enqueue(input({ domain: 'ads', type: 'banner.activate', dedupeKey: 'banner:activate:v1', aggregateType: 'banner', aggregateId: 'banner-1' }), now);
  await repository.enqueue(input({ domain: 'ads', type: 'unknown', dedupeKey: 'ads:unknown:v1' }), now);
  const worker = createOutboxWorker({
    repository,
    workerId: 'worker-main',
    now: () => clock,
    handlers: {
      'notifications:notification.send': async event => { delivered.push(event.type); },
      'sla:request.overdue': async event => { delivered.push(event.domain); },
      'ads:banner.activate': async event => { delivered.push(event.type); }
    }
  });
  const result = await worker.runOnce();
  assert.equal(result.claimed, 4);
  assert.equal(result.delivered, 3);
  assert.equal(result.deadLettered, 1);
  assert.deepEqual(delivered.sort(), ['banner.activate', 'notification.send', 'sla']);
  clock = new Date(clock.getTime() + 1_000);
  assert.equal((await repository.list()).filter(event => event.status === 'dead_letter').length, 1);
});

test('worker schedules retryable failures and dead-letters permanent failures', async () => {
  let clock = now;
  const repository = createInMemoryOutboxRepository();
  const event = await repository.enqueue(input({ type: 'sla.retry', maxAttempts: 2 }), now);
  const worker = createOutboxWorker({
    repository,
    workerId: 'worker-retry',
    retryBaseMs: 100,
    now: () => clock,
    handlers: {
      'notifications:sla.retry': async () => { throw new OutboxJobError('UPSTREAM_TIMEOUT', 'temporary timeout', true); }
    }
  });
  const first = await worker.runOnce();
  assert.equal(first.retried, 1);
  const waiting = await repository.findById(event.id);
  assert.equal(waiting?.status, 'retry_wait');
  clock = new Date(waiting!.availableAt);
  const second = await worker.runOnce();
  assert.equal(second.deadLettered, 1);
  assert.equal((await repository.findById(event.id))?.status, 'dead_letter');
});
