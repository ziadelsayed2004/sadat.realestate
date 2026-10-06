import assert from 'node:assert/strict';
import test from 'node:test';
import { type Connection, Types } from 'mongoose';
import { requestListQuerySchema } from '@sadat-real-estate/contracts';
import { createMongooseRequestRepository } from '../../src/modules/requests/repository.js';

async function searchFilter(search: string) {
  let listFilter: Record<string, unknown> | undefined;
  let countFilter: Record<string, unknown> | undefined;
  const cursor = { sort() { return this; }, skip() { return this; }, limit() { return this; }, async toArray() { return []; } };
  const connection = { collection() { return {
    find(filter: Record<string, unknown>) { listFilter = filter; return cursor; },
    async countDocuments(filter: Record<string, unknown>) { countFilter = filter; return 0; }
  }; } } as unknown as Connection;
  const providerId = '2123456789abcdef01234567';
  await createMongooseRequestRepository(connection).list(requestListQuerySchema.parse({ search, status: 'new', type: 'provider_customer', source: 'provider', page: 2, limit: 5 }), { providerId });
  assert.deepEqual(countFilter, listFilter);
  assert.equal(String(listFilter?.providerId), providerId);
  assert.equal(listFilter?.status, 'new');
  assert.equal(listFilter?.type, 'provider_customer');
  assert.equal(listFilter?.source, 'provider');
  return listFilter?.$or as Array<Record<string, unknown>>;
}

test('searches customer identity fields using the same owned filter for rows and total', async () => {
  for (const field of ['firstName', 'lastName', 'phone', 'email']) {
    const clauses = await searchFilter('Mona+literal');
    const regex = clauses.find(clause => clause[`payload.${field}`])?.[`payload.${field}`];
    assert.ok(regex instanceof RegExp);
    assert.equal(regex.test('MONA+literal'), true);
    assert.equal(regex.test('Monaaaaaaliteral'), false);
  }
});

test('supports combined customer names without moving ownership inside the search OR', async () => {
  const clauses = await searchFilter('Mona Hassan');
  const expression = clauses.find(clause => clause.$expr)?.$expr as { $regexMatch: { input: unknown; regex: RegExp } };
  assert.deepEqual(expression.$regexMatch.input, { $concat: [{ $convert: { input: '$payload.firstName', to: 'string', onError: '', onNull: '' } }, ' ', { $convert: { input: '$payload.lastName', to: 'string', onError: '', onNull: '' } }] });
  assert.equal(expression.$regexMatch.regex.test('Mona Hassan'), true);
  assert.equal(clauses.some(clause => clause.providerId), false);
});

test('retains exact request-ID search alongside escaped customer search', async () => {
  const id = '3123456789abcdef01234567';
  const clauses = await searchFilter(id);
  assert.deepEqual(clauses[0], { _id: new Types.ObjectId(id) });
  assert.deepEqual(clauses[1], { propertyId: new Types.ObjectId(id) });
});

test('resolves public property codes into request search without bypassing ownership or status filters', async () => {
  const propertyId = new Types.ObjectId('670000000000000000000007');
  let propertyFilter: Record<string, unknown> = {}; let requestFilter: Record<string, unknown> = {};
  const cursor = { sort() { return this; }, skip() { return this; }, limit() { return this; }, async toArray() { return []; } };
  const connection = { collection(name: string) { return name === 'properties' ? {
    find(filter: Record<string, unknown>) { propertyFilter = filter; return { async toArray() { return [{ _id: propertyId }]; } }; }
  } : {
    find(filter: Record<string, unknown>) { requestFilter = filter; return cursor; }, async countDocuments() { return 0; }
  }; } } as unknown as Connection;
  await createMongooseRequestRepository(connection).list(requestListQuerySchema.parse({ search: 'SDT-1234', status: 'under_review' }), { seekerId: 'b'.repeat(24) });
  const propertyClauses = propertyFilter.$or as Array<Record<string, unknown>>;
  assert.equal((propertyClauses[0]?.publicCode as RegExp).test('SDT-1234'), true);
  assert.equal(String(requestFilter.seekerId), 'b'.repeat(24)); assert.equal(requestFilter.status, 'under_review');
  assert.deepEqual((requestFilter.$or as Array<unknown>).at(-1), { propertyId: { $in: [propertyId] } });
});
