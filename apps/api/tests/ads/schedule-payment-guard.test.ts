import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { createMongooseAdCalendarRepository } from '../../src/modules/ads/repository.js';
import type { ProviderAdvertisingModels } from '../../src/modules/provider/advertising-models.js';
import { AdSettingsServiceError } from '../../src/modules/ads/service.js';

test('persistent scheduling rejects requests without their own clean approved payment proof before any write', async () => {
  const requestId = new Types.ObjectId();
  const providerId = new Types.ObjectId();
  let writes = 0;
  let proofFilter: unknown;
  const query = (value: unknown) => {
    const chain = { session: () => chain, select: () => chain, lean: () => chain, exec: async () => value };
    return chain;
  };
  const session = { withTransaction: async (run: () => Promise<unknown>) => run(), endSession: async () => undefined };
  const connection = { startSession: async () => session } as unknown as Connection;
  const models = {
    AdRequest: {
      findOne: () => query({ _id: requestId, providerId, status: 'waiting_payment', version: 3 }),
      findOneAndUpdate: () => { writes++; throw new Error('must not write'); }
    },
    PaymentProof: { findOne: (filter: unknown) => { proofFilter = filter; return query(null); } }
  } as unknown as ProviderAdvertisingModels;
  const repository = createMongooseAdCalendarRepository(connection, models);
  await assert.rejects(() => repository.schedule(requestId.toHexString(), 3), error => error instanceof AdSettingsServiceError && error.code === 'VERSION_CONFLICT');
  assert.deepEqual(proofFilter, { adRequestId: requestId, providerId, active: true, status: 'approved', securityState: 'clean' });
  assert.equal(writes, 0);
});
