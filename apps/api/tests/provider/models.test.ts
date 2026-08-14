import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { type Model } from 'mongoose';
import { createProviderModels } from '../../src/modules/provider/models.js';
import { providerRequirementSnapshot } from '../../src/modules/provider/requirements.js';

function indexByName(model: Model<unknown>, name: string) {
  return model.schema.indexes().find(([, options]) => options.name === name);
}

test('declares strict versioned provider applications and query indexes', async () => {
  const connection = mongoose.createConnection();
  const first = createProviderModels(connection);
  const second = createProviderModels(connection);
  assert.equal(first.ProviderApplication, second.ProviderApplication);
  const application = new first.ProviderApplication({
    userId: new mongoose.Types.ObjectId(),
    providerType: 'brokerage_office',
    requirementVersion: '2026-08-13.1'
  });
  await application.validate();
  assert.equal(application.status, 'draft');
  assert.equal(first.ProviderApplication.schema.options.versionKey, 'version');
  await assert.rejects(new first.ProviderApplication({
    userId: new mongoose.Types.ObjectId(),
    providerType: 'office',
    requirementVersion: '2026-08-13.1'
  }).validate(), /providerType/);
  assert.throws(() => new first.ProviderApplication({
    userId: new mongoose.Types.ObjectId(),
    providerType: 'individual_broker',
    requirementVersion: '2026-08-13.1',
    publicDocumentUrl: 'https://unsafe.example/file'
  }), /strict mode/);
  assert.equal(indexByName(first.ProviderApplication, 'provider_applications_user_unique')?.[1].unique, true);
  assert.ok(indexByName(first.ProviderApplication, 'provider_applications_status_updated'));
  assert.ok(indexByName(first.ProviderApplication, 'provider_applications_type_status'));
});

test('stores a bounded immutable requirement snapshot on submission records', async () => {
  const { ProviderApplication } = createProviderModels(mongoose.createConnection());
  const snapshot = providerRequirementSnapshot('developer_company', false);
  const application = new ProviderApplication({
    userId: new mongoose.Types.ObjectId(),
    providerType: 'developer_company',
    status: 'pending_review',
    requirementVersion: snapshot.version,
    requirementsSnapshot: snapshot,
    submittedAt: new Date('2026-08-13T00:00:00.000Z')
  });
  await application.validate();
  assert.equal(application.requirementsSnapshot?.version, '2026-08-13.1');
  assert.equal(
    application.requirementsSnapshot?.requirements.find((item) => item.key === 'authorization_letter')?.applies,
    true
  );
});
