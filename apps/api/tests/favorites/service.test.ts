import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createFavoriteService, type FavoritePropertySource } from '../../src/modules/favorites/service.js';

const id = '0123456789abcdef01234567';
const seekerId = '1123456789abcdef01234567';
const localized = { ar: 'عقار', en: 'Property', 'zh-CN': '房产' };
const claims = { role: 'seeker', status: 'verified', sub: seekerId } as AccessTokenClaims;
const property: FavoritePropertySource = { id, slug: 'saved-property', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true };
const favorite = { seekerId, propertyId: id, savedAt: new Date('2026-01-01T00:00:00.000Z') };

test('saves idempotently and returns a safe property projection', async () => {
  let calls = 0;
  const service = createFavoriteService({ now: () => favorite.savedAt, repository: { async save() { calls += 1; return { kind: calls === 1 ? 'created' : 'existing', favorite, property }; }, async remove() { return true; }, async list() { return [{ favorite, property }]; } } });
  const first = await service.save(claims, id);
  const second = await service.save(claims, id);
  assert.equal(first.alreadySaved, false);
  assert.equal(second.alreadySaved, true);
  assert.equal('status' in first.item, false);
  assert.equal('active' in first.item, false);
});

test('requires seeker ownership, rejects invalid/unavailable properties, and hides stale saves', async () => {
  const service = createFavoriteService({ repository: { async save() { return { kind: 'unavailable' }; }, async remove() { return false; }, async list() { return [{ favorite, property: { ...property, active: false } }, { favorite, property }]; } } });
  await assert.rejects(() => service.save(claims, 'BAD_ID'));
  await assert.rejects(() => service.save(claims, id), /FAVORITE_PROPERTY_UNAVAILABLE/);
  assert.deepEqual((await service.list(claims, {})).items.map(item => item.slug), ['saved-property']);
  await assert.rejects(() => service.list({ ...claims, role: 'provider' } as AccessTokenClaims, {}), /FAVORITE_FORBIDDEN/);
});
