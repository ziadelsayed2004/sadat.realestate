import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { createAccountModels } from '../../src/modules/accounts/models.js';

test('registers an immutable append-only transition model with query-driven indexes', async () => {
  const connection = mongoose.createConnection();
  const first = createAccountModels(connection);
  const second = createAccountModels(connection);
  assert.equal(first.AccountStateTransition, second.AccountStateTransition);
  const indexes = new Map(
    first.AccountStateTransition.schema.indexes()
      .map(([keys, options]) => [options.name, { keys, options }])
  );
  assert.deepEqual(indexes.get('account_state_transitions_target_created')?.keys, {
    targetUserId: 1,
    createdAt: -1
  });
  assert.ok(indexes.get('account_state_transitions_provider_created'));
  assert.ok(indexes.get('account_state_transitions_actor_created'));
  assert.equal(first.AccountStateTransition.schema.options.versionKey, false);
  await connection.close();
});

test('requires safe reason and trace metadata and rejects unknown fields', async () => {
  const connection = mongoose.createConnection();
  const { AccountStateTransition } = createAccountModels(connection);
  const valid = {
    targetUserId: new mongoose.Types.ObjectId(),
    actorAdminId: new mongoose.Types.ObjectId(),
    targetRoleType: 'seeker',
    action: 'suspend',
    fromAccountStatus: 'verified',
    toAccountStatus: 'suspended',
    reason: 'Confirmed abuse investigation',
    requestId: 'request-1',
    traceId: '1'.repeat(32)
  };
  await new AccountStateTransition(valid).validate();
  await assert.rejects(new AccountStateTransition({ ...valid, reason: 'no' }).validate());
  await assert.rejects(new AccountStateTransition({
    ...valid,
    toAccountStatus: 'deleted'
  }).validate());
  await assert.rejects(new AccountStateTransition({
    ...valid,
    reason: 'unsafe\nreason'
  }).validate());
  assert.throws(
    () => new AccountStateTransition({ ...valid, signedUrl: 'https://private.example' }),
    /strict mode/
  );
  await connection.close();
});
