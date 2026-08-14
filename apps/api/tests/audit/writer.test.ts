import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { type ClientSession } from 'mongoose';
import type { AuditModels } from '../../src/modules/audit/models.js';
import { createMongooseAuditWriter } from '../../src/modules/audit/writer.js';

test('validates, redacts, and appends one audit record using the supplied transaction session', async () => {
  let captured: Record<string, unknown> | undefined;
  let capturedSession: ClientSession | undefined;
  const models = {
    AuditLog: {
      async create(rows: Record<string, unknown>[], options: { session?: ClientSession }) {
        captured = rows[0];
        capturedSession = options.session;
        return [{ _id: new mongoose.Types.ObjectId('0123456789abcdef01234567') }];
      }
    }
  } as unknown as AuditModels;
  const writer = createMongooseAuditWriter(models);
  const session = { id: 'session-1' } as unknown as ClientSession;
  const id = await writer.record({
    actorType: 'admin',
    actorId: '1123456789abcdef01234567',
    targetType: 'user',
    targetId: '2123456789abcdef01234567',
    action: 'account.restrict',
    reason: 'Restriction requested by admin@example.com',
    before: { status: 'verified', refreshToken: 'secret' },
    after: { status: 'restricted' },
    requestId: 'audit-writer-1',
    traceId: 'b'.repeat(32),
    occurredAt: new Date('2026-08-14T00:00:00.000Z')
  }, session);
  assert.equal(id, '0123456789abcdef01234567');
  assert.equal(capturedSession, session);
  assert.equal((captured?.before as Record<string, unknown>).refreshToken, '[REDACTED]');
  assert.equal(String(captured?.reason).includes('admin@example.com'), false);
});

test('rejects malformed write metadata before persistence', async () => {
  let writes = 0;
  const writer = createMongooseAuditWriter({
    AuditLog: { async create() { writes += 1; return []; } }
  } as unknown as AuditModels);
  await assert.rejects(writer.record({
    actorType: 'admin',
    actorId: 'not-an-id',
    targetType: 'user',
    targetId: 'target',
    action: 'account.restrict',
    reason: 'Confirmed policy breach',
    before: {},
    after: {},
    requestId: 'audit-writer-2',
    traceId: 'c'.repeat(32),
    occurredAt: new Date()
  }));
  assert.equal(writes, 0);
});
