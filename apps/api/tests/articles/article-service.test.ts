import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createArticleService } from '../../src/modules/articles/service.js';
const admin = { iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub: '3123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
test('article categories enforce stable slugs, ordering, activation, and admin authorization', async () => { const service = createArticleService(); const category = await service.createCategory(admin, { slug: 'guides', name: { ar: 'أدلة', en: 'Guides' }, displayOrder: 2, active: true }); assert.equal((await service.listCategories(admin))[0].id, category.id); await assert.rejects(() => service.createCategory({ ...admin, role: 'seeker' } as AccessTokenClaims, { slug: 'x', name: { en: 'X' }, displayOrder: 1, active: true }), /FORBIDDEN/); await assert.rejects(() => service.createCategory(admin, { slug: 'guides', name: { en: 'Duplicate' }, displayOrder: 3, active: true }), /DUPLICATE/); });

test('article management keeps drafts private until an explicit review and publish transition', async () => {
  const service = createArticleService(); const category = await service.createCategory(admin, { slug: 'news', name: { en: 'News' }, displayOrder: 1, active: true });
  const article = await service.createArticle(admin, { categoryId: category.id, slug: 'market-update', title: { ar: 'تحديث', en: 'Update' }, body: { ar: 'محتوى', en: 'Content' }, seoTitle: { en: 'SEO Update' }, authorId: admin.sub });
  assert.equal(article.status, 'draft'); assert.equal((await service.listPublic({ locale: 'en', page: 1, limit: 20 })).length, 0);
  await assert.rejects(() => service.transitionArticle(admin, article.id, 'published'), /INVALID_STATE/);
  await service.transitionArticle(admin, article.id, 'pending_review'); const published = await service.transitionArticle(admin, article.id, 'published');
  assert.equal(published.status, 'published'); assert.ok(published.publishedAt); assert.equal('password' in published, false);
});

test('public article reads expose published content only with locale fallback and SEO metadata', async () => {
  const service = createArticleService(); const category = await service.createCategory(admin, { slug: 'living', name: { ar: 'معيشة', en: 'Living' }, displayOrder: 1, active: true });
  const article = await service.createArticle(admin, { categoryId: category.id, slug: 'living-guide', title: { ar: 'دليل', en: 'Guide' }, body: { ar: 'نص عربي', en: 'English body' }, seoDescription: { en: 'Summary' }, authorId: admin.sub });
  await service.transitionArticle(admin, article.id, 'pending_review'); await service.transitionArticle(admin, article.id, 'published');
  const list = await service.listPublic({ locale: 'zh-CN', page: 1, limit: 20 });
  assert.equal(list.length, 1); assert.equal(list[0].title['zh-CN'], 'دليل'); assert.equal(list[0].body['zh-CN'], 'نص عربي'); assert.equal(list[0].seoDescription?.['zh-CN'], 'Summary');
  assert.equal((await service.getPublicBySlug('living-guide', 'en')).body.en, 'English body'); await assert.rejects(() => service.getPublicBySlug('missing', 'en'), /NOT_FOUND/);
});
