import assert from 'node:assert/strict';
import test from 'node:test';
import type { Connection } from 'mongoose';
import { communityCategoryCreateSchema, communityPostCreateSchema, homepageSectionPatchSchema, aboutBlockPatchSchema, tipPatchSchema } from '@sadat-real-estate/contracts';
import { createCommunityCategories } from '../../src/modules/community/categories.js';

test('accepts generated community categories and rejects arbitrary unregistered key formats', () => {
  assert.equal(communityCategoryCreateSchema.safeParse({ label: { ar: 'أخبار المدينة' }, reason: 'تنظيم المنشورات' }).success, true);
  assert.equal(communityPostCreateSchema.safeParse({ title: 'City news', body: 'A community update', category: 'custom_' + 'a'.repeat(24) }).success, true);
  assert.equal(communityPostCreateSchema.safeParse({ title: 'City news', body: 'A community update', category: 'injected' }).success, false);
});
test('validates category membership and prevents unauthorized writes before database access', async () => {
  let lookups = 0;
  const connection = { collection() { return { async findOne() { lookups += 1; return null; } }; } } as unknown as Connection;
  const service = createCommunityCategories(connection, { async authorize() { return false; } });
  await service.validate('question');
  assert.equal(lookups, 0);
  await assert.rejects(service.validate('custom_' + 'a'.repeat(24)), /INVALID_CATEGORY/);
  await assert.rejects(service.create({ sub: 'b'.repeat(24), role: 'admin', status: 'verified' } as never, { label: { en: 'News' }, reason: 'Organize posts' }, { requestId: 'test', traceId: 'a'.repeat(32) }), /FORBIDDEN/);
  assert.equal(lookups, 1);
});
test('migrates a legacy homepage placement only to a supported section and accepts removable content images', () => {
  assert.equal(homepageSectionPatchSchema.safeParse({ version: 0, key: 'tips', reason: 'Connect legacy section' }).success, true);
  assert.equal(homepageSectionPatchSchema.safeParse({ version: 0, key: 'unknown_section', reason: 'Connect legacy section' }).success, false);
  assert.equal(aboutBlockPatchSchema.safeParse({ version: 0, order: 0, imageUrl: 'https://cdn.example/about.jpg', reason: 'Update image' }).success, true);
  assert.equal(tipPatchSchema.safeParse({ version: 0, imageUrl: null, reason: 'Remove image' }).success, true);
});
