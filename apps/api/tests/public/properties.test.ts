import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicPropertyDetailsService, publicPropertyDetailsProjection, type PublicPropertyDetailsRepository, type PublicPropertyDetailsSource } from '../../src/modules/public/properties.js';

const id = '0123456789abcdef01234567';
const relatedId = '1123456789abcdef01234567';
const localized = { ar: 'شقة', en: 'Apartment' };
const source = (overrides: Partial<PublicPropertyDetailsSource> = {}): PublicPropertyDetailsSource => ({ id, slug: 'apartment', kind: 'property', name: localized, transactionType: 'sale', sourceType: 'developer_company', organizationId: relatedId, sourceName: localized, sourceImageUrl: 'https://example.com/source.png', sourceVerified: true, status: 'published', active: true, project: { id: relatedId, slug: 'project', name: { en: 'Project' }, status: 'published' }, media: [{ id: relatedId, propertyId: id, kind: 'image', originalFilename: 'cover.png', detectedMime: 'image/png', byteSize: 100, sortOrder: 0, isCover: true, processingState: 'ready', active: true }], features:[{id:relatedId,kind:'feature',groupKey:'interior',name:localized,detail:{en:'Full finish'},slug:'air-conditioning',order:0,active:true}], services:[{id,kind:'service',groupKey:'nearby',name:localized,detail:{en:'Public school'},distanceLabel:{en:'5 minutes'},slug:'school',order:0,active:true}], relatedProperties: [{ id: relatedId, slug: 'related', kind: 'unit', name: localized, transactionType: 'sale', status: 'published', active: true }], ...overrides });

test('projects published property details with SEO, source, map link, media, and related public cards', () => {
  const result = publicPropertyDetailsProjection(source({ mapUrl: 'https://maps.google.com/?q=Sadat+City' }));
  assert.equal(result?.seo.slug, 'apartment');
  assert.equal(result?.source.sourceType, 'developer_company');
  assert.equal(result?.source.verified, true);
  assert.equal(result?.source.imageUrl, 'https://example.com/source.png');
  assert.equal(result?.mapUrl, 'https://maps.google.com/?q=Sadat+City');
  assert.equal(result?.services[0]?.distanceLabel?.en, '5 minutes');
  assert.equal(result?.project?.slug, 'project');
  assert.equal(result?.media[0]?.isCover, true);
  assert.equal(result?.relatedProperties[0]?.slug, 'related');
  assert.equal(result?.features[0]?.slug, 'air-conditioning');
  assert.equal(result?.services[0]?.slug, 'school');
  assert.equal('status' in (result?.media[0] ?? {}), false);
  assert.equal('sha256' in (result?.media[0] ?? {}), false);
  assert.equal('providerId' in (result ?? {}), false);
});

test('rejects an unsafe map URL before it reaches the public projection', () => {
  assert.throws(() => publicPropertyDetailsProjection(source({ mapUrl: 'javascript:alert(1)' })));
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
