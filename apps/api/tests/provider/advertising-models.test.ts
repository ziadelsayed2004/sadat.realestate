import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { type Model } from 'mongoose';
import { createProviderAdvertisingModels } from '../../src/modules/provider/advertising-models.js';

function indexByName(model: Model<unknown>, name: string) {
  return model.schema.indexes().find(([, options]) => options.name === name);
}

test('declares strict persistent advertising read models and owner query indexes', async () => {
  const connection = mongoose.createConnection();
  const first = createProviderAdvertisingModels(connection);
  const second = createProviderAdvertisingModels(connection);
  assert.equal(first.AdRequest, second.AdRequest);
  assert.equal(first.AdRequest.schema.options.collection, 'ad_requests');
  assert.equal(first.AdQuote.schema.options.collection, 'ad_quotes');
  assert.equal(first.PaymentProof.schema.options.collection, 'payment_proofs');
  assert.equal(first.AdSchedule.schema.options.collection, 'ad_schedules');
  assert.ok(indexByName(first.AdRequest, 'ad_requests_provider_created'));
  assert.ok(indexByName(first.AdQuote, 'ad_quotes_request_updated'));
  assert.ok(indexByName(first.PaymentProof, 'payment_proofs_request_provider_active'));
  assert.ok(indexByName(first.AdSchedule, 'ad_schedules_request_provider_start'));
  assert.throws(() => new first.AdRequest({
    providerId: new mongoose.Types.ObjectId(),
    placementKey: 'homepage.hero',
    purpose: 'valid purpose',
    intervalStart: new Date('2026-09-01T09:00:00.000Z'),
    intervalEnd: new Date('2026-09-02T09:00:00.000Z'),
    status: 'draft',
    unexpectedInternalField: 'must reject'
  }), /strict mode/);
});
