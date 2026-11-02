import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { account, profile, database } from '../helpers/provider-identity-db.js';
import { createMongoosePublicHomepageRepository } from '../../src/modules/public/homepage.js';
import { createMongoosePublicPropertySearchRepository } from '../../src/modules/search/properties.js';
import { createMongoosePublicPropertyDetailsRepository } from '../../src/modules/public/properties.js';
import { createMongoosePublicPropertyComparisonRepository } from '../../src/modules/compare/properties.js';
import { publicPropertySearchQuerySchema } from '@sadat-real-estate/contracts';

for (const hasLogo of [true, false]) test(`property identity uses the dedicated company logo across public surfaces (logo=${hasLogo})`, async () => {
  const db = database();
  const propertyId = new Types.ObjectId('5'.repeat(24)), organizationId = new Types.ObjectId('6'.repeat(24));
  const logo = '/api/v1/public/organization-photos/' + '7'.repeat(24);
  const cover = '/api/v1/public/organization-photos/' + '8'.repeat(24);
  db.rows.provider_identity_subscriptions!.push({ _id: account, status: 'active', paymentConfirmed: true, startAt: new Date('2020-01-01'), endAt: new Date('2100-01-01') });
  db.rows.organizations = [{ _id: organizationId, providerId: profile, kind: 'brokerage_office', name: { en: 'Office' }, slug: 'office-example', status: 'approved', imageUrl: cover, ...(hasLogo ? { logoUrl: logo } : {}) }];
  const property = { _id: propertyId, providerId: account, organizationId, sourceType: 'brokerage_office', slug: 'public-property', name: { en: 'Property' }, kind: 'property', transactionType: 'sale', status: 'published', active: true };
  db.rows.properties = [property];
  const connection = { collection(name: string) {
    const collection = db.connection.collection(name);
    return {
      findOne: collection.findOne.bind(collection),
      find(query: Record<string, unknown>, options?: { projection?: Record<string, number> }) {
        if (name === 'organizations' && query.kind !== 'developer_company') {
          assert.equal(options?.projection?.logoUrl, 1);
          assert.equal(options?.projection?.imageUrl, undefined);
        }
        if (name !== 'properties') return collection.find(query);
        return { sort() { return this; }, skip() { return this; }, limit() { return this; }, async toArray() { return [property]; } };
      },
      async countDocuments() { return name === 'properties' ? 1 : 0; },
      aggregate() { return { async toArray() { return []; } }; }
    };
  } } as unknown as Connection;
  const home = await createMongoosePublicHomepageRepository(connection).read();
  const listing = await createMongoosePublicPropertySearchRepository(connection).list(publicPropertySearchQuerySchema.parse({}));
  const details = await createMongoosePublicPropertyDetailsRepository(connection).findBySlug(property.slug);
  const comparison = await createMongoosePublicPropertyComparisonRepository(connection).findPublished([String(propertyId)]);
  for (const value of [home.properties[0], listing.items[0], details, comparison[0]]) {
    assert.ok(value);
    assert.equal(value.sourceImageUrl, hasLogo ? logo : undefined);
    assert.notEqual(value.sourceImageUrl, cover);
    assert.deepEqual(value.sourceName, { en: 'Office' });
  }
});
