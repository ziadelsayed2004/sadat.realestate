import assert from 'node:assert/strict';
import test from 'node:test';
import { account, profile, application, database } from '../helpers/provider-identity-db.js';
import { createPropertySourceNamesReader } from '../../src/modules/properties/source-names.js';
import type { StoredProperty } from '../../src/modules/properties/repository.js';

test('administrative source names resolve account, application and profile aliases without returning identity fields', async () => {
  for (const providerId of [account, profile, application]) {
    const db = database('brokerage_office');
    db.rows.provider_applications![0]!.brandName = 'Actual office';
    db.rows.provider_applications![0]!.email = 'private@example.invalid';
    const row = { id: 'a'.repeat(24), providerId: String(providerId), source: { providerId: String(providerId), sourceType: 'brokerage_office', organizationId: 'b'.repeat(24) } } as StoredProperty;
    const result = await createPropertySourceNamesReader(db.connection)([row]);
    assert.equal(result.get(row.id), 'Actual office');
    assert.equal(JSON.stringify([...result]).includes('private@example.invalid'), false);
  }
});
