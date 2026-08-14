import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicPropertyDetailsService, publicPropertyDetailsProjection, type PublicPropertyDetailsRepository, type PublicPropertyDetailsSource } from '../../src/modules/public/properties.js';

const id = '0123456789abcdef01234567';
const relatedId = '1123456789abcdef01234567';
const localized = { ar: 'شقة', en: 'Apartment', 'zh-CN': '公寓' };
const source = (overrides: Partial<PublicPropertyDetailsSource> = {}): PublicPropertyDetailsSource => ({ id, slug: 'apartment', kind: 'property', name: localized, transactionType: 'sale', sourceType: 'developer_company', organizationId: relatedId, status: 'published', active: true, project: { id: relatedId, slug: 'project', name: { en: 'Project' }, status: 'published' }, media: [{ id: relatedId, propertyId: id, kind: 'image', originalFilename: 'cover.png', detectedMime: 'image/png', byteSize: 100, sortOrder: 0, isCover: true, processingState: 'ready', active: true }], relatedProperties: [{ id: relatedId, slug: 'related', kind: 'unit', name: localized, transactionType: 'sale', status: 'published', active: true }], ...overrides });

test('projects published property details with SEO, source, project, media, and related public cards', () => {
  const result = publicPropertyDetailsProjection(source());
  assert.equal(result?.seo.slug, 'apartment');
  assert.equal(result?.source.sourceType, 'developer_company');
  assert.equal(result?.project?.slug, 'project');
  assert.equal(result?.media[0]?.isCover, true);
  assert.equal(result?.relatedProperties[0]?.slug, 'related');
  assert.equal('status' in (result?.media[0] ?? {}), false);
  assert.equal('sha256' in (result?.media[0] ?? {}), false);
  assert.equal('providerId' in (result ?? {}), false);
});

test('excludes draft/inactive details and non-ready media or related rows', () => {
  const result = publicPropertyDetailsProjection(source({ status: 'draft', media: [{ id: relatedId, propertyId: id, kind: 'image', originalFilename: 'draft.png', detectedMime: 'image/png', byteSize: 1, sortOrder: 1, isCover: false, processingState: 'failed', active: true }], relatedProperties: [{ id: relatedId, slug: 'hidden', kind: 'unit', name: localized, transactionType: 'sale', status: 'draft', active: true }] }));
  assert.equal(result, null);
  const published = publicPropertyDetailsProjection(source({ media: [{ id: relatedId, propertyId: id, kind: 'image', originalFilename: 'draft.png', detectedMime: 'image/png', byteSize: 1, sortOrder: 1, isCover: false, processingState: 'failed', active: true }] }));
  assert.deepEqual(published?.media, []);
});

test('details service returns null for an unknown slug without leaking an error', async () => {
  const repository: PublicPropertyDetailsRepository = { async findBySlug(slug) { return slug === 'apartment' ? source() : null; } };
  const service = createPublicPropertyDetailsService({ repository });
  assert.equal((await service.get('missing')), null);
  assert.equal((await service.get('apartment'))?.slug, 'apartment');
});
