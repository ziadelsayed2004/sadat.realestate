import assert from 'node:assert/strict';
import test from 'node:test';
import { publicHomepageProjection } from '../../src/modules/public/homepage.js';
import { publicPropertyDetailsProjection } from '../../src/modules/public/properties.js';
import { createFavoriteService } from '../../src/modules/favorites/service.js';
import { createNotificationService } from '../../src/modules/notifications/service.js';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';

const FORBIDDEN_KEYS = new Set([
  'internalNotes', 'assignment', 'assignedTo', 'providerDocuments', 'documents', 'audit', 'auditLog',
  'credential', 'credentials', 'password', 'passwordHash', 'storageKey', 'bucket', 'signedUrl', 'accessToken'
]);

function assertNoForbiddenKeys(value: unknown, path: string[] = []): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, [...path, String(index)]));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(FORBIDDEN_KEYS.has(key), false, `forbidden projection key at ${[...path, key].join('.')}`);
    assertNoForbiddenKeys(nested, [...path, key]);
  }
}

const id = '0123456789abcdef01234567';
const localized = { ar: 'عقار', en: 'Property', 'zh-CN': '房产' };
const claims = { role: 'seeker', status: 'verified', sub: id } as AccessTokenClaims;

test('public homepage and property details mask workflow, audit, credential, and storage fields', () => {
  const homepage = publicHomepageProjection({
    sections: [{ key: 'hero', title: localized, order: 1, status: 'published', visible: true, internalNotes: 'private' }],
    properties: [{ id, slug: 'published-home', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true, assignment: { userId: id }, audit: { actorId: id } }],
    developers: [{ id, slug: 'developer', name: localized, kind: 'developer_company', status: 'approved', providerDocuments: ['private'] }],
    content: [{ key: 'about', type: 'about', title: localized, order: 1, status: 'published', auditLog: { id } }],
    banners: [{ key: 'banner', title: localized, imageUrl: 'https://cdn.example/banner.png', targetUrl: 'https://example.test', order: 1, status: 'published', signedUrl: 'private' }]
  });
  assertNoForbiddenKeys(homepage);
  assert.equal(homepage.properties[0]?.slug, 'published-home');

  const details = publicPropertyDetailsProjection({
    id, slug: 'published-home', kind: 'property', name: localized, transactionType: 'sale', sourceType: 'developer_company', organizationId: id,
    status: 'published', active: true,
    project: { id, slug: 'project', name: localized, status: 'published', internalNotes: 'private' },
    media: [{ id, propertyId: id, kind: 'image', originalFilename: 'cover.png', detectedMime: 'image/png', byteSize: 100, sortOrder: 0, isCover: true, processingState: 'ready', active: true, storageKey: 'secret' }],
    relatedProperties: [], providerDocuments: ['private'], audit: { actorId: id }
  } as never);
  assertNoForbiddenKeys(details);
  assert.equal(details?.source.sourceType, 'developer_company');
  assert.equal(publicPropertyDetailsProjection({ id, slug: 'draft', kind: 'property', name: localized, transactionType: 'sale', sourceType: 'developer_company', status: 'draft', active: true, media: [], relatedProperties: [] }), null);
});

test('seeker favorites and notifications expose only explicit recipient/public fields', async () => {
  const favorites = createFavoriteService({
    repository: {
      async list() {
        return [{ favorite: { seekerId: id, propertyId: id, savedAt: new Date('2026-08-01T00:00:00.000Z') }, property: { id, slug: 'home', kind: 'property', name: localized, transactionType: 'sale', status: 'published', active: true, internalNotes: 'private', assignment: { id }, documents: ['private'] } as never }];
      },
      async save() { return { kind: 'unavailable' as const }; },
      async remove() { return false; }
    }
  });
  const favoriteData = await favorites.list(claims, { page: 1, limit: 20 });
  assertNoForbiddenKeys(favoriteData);

  const notifications = createNotificationService({
    repository: {
      async list() {
        return { items: [{ id, type: 'system', title: localized, readAt: null, createdAt: new Date('2026-08-01T00:00:00.000Z'), internalNotes: 'private', auditLog: { id }, providerDocuments: ['private'], storageKey: 'secret' } as never], total: 1, unreadCount: 1 };
      },
      async markRead() { return undefined; },
      async markAllRead() { return 0; }
    }
  });
  const notificationData = await notifications.list(claims, { page: 1, limit: 20 });
  assertNoForbiddenKeys(notificationData);
  assert.equal(notificationData.items.length, 1);
});
