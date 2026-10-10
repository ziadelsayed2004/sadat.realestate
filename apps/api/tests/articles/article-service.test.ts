import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuditRecordInput } from '../../src/modules/audit/writer.js';
import { createMemoryArticleRepository } from '../../src/modules/articles/repository.js';
import {
  ArticleServiceError,
  createArticleService,
  type ArticleAuthorization
} from '../../src/modules/articles/service.js';

const ADMIN_ID = '3123456789abcdef01234567';
const VIEWER_ID = '1123456789abcdef01234567';
const NOW = new Date('2026-08-17T08:00:00.000Z');
const PRINCIPAL = { userId: ADMIN_ID };
const CONTEXT = { requestId: 'article-test-request', traceId: 'a'.repeat(32) };

test('creates and publishes more than twenty thousand words without losing either translation', async () => {
  const { service } = fixture();
  const category = await service.createCategory(PRINCIPAL, { name: { en: 'Long guides' }, reason: 'Create guide category' }, CONTEXT);
  const body = { en: 'investment '.repeat(21000).trim(), ar: 'استثمار '.repeat(21000).trim() };
  const article = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { en: 'English guide', ar: 'دليل عربي' }, body, reason: 'Create long translated guide' }, CONTEXT);
  await service.transitionArticle(PRINCIPAL, article.id, { status: 'published', version: article.version, reason: 'Publish long translated guide' }, CONTEXT);
  assert.equal((await service.getPublicBySlug(article.slug, 'en')).body.en, body.en);
  assert.equal((await service.getPublicBySlug(article.slug, 'ar')).body.ar, body.ar);
  const longer = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { en: 'Sixty thousand words' }, body: { en: 'word '.repeat(60000).trim() }, reason: 'Create a longer article' }, CONTEXT);
  await service.transitionArticle(PRINCIPAL, longer.id, { status: 'published', version: longer.version, reason: 'Publish sixty thousand words' }, CONTEXT);
  assert.equal((await service.getPublicBySlug(longer.slug, 'en')).readingTimeMinutes, 300);
});

test('generates distinct article/category links and preserves them when titles change', async () => {
  const { service } = fixture();
  const category = await service.createCategory(PRINCIPAL, { name: { ar: 'سكن' }, displayOrder: 0, active: true, reason: 'Create category automatically' }, CONTEXT);
  assert.match(category.slug, /^category-[a-f0-9]{32}$/);
  const input = { categoryId: category.id, title: { en: 'Buying in Sadat' }, body: { en: 'Useful advice' }, reason: 'Create automatic link' };
  const first = await service.createArticle(PRINCIPAL, input, CONTEXT);
  const second = await service.createArticle(PRINCIPAL, input, CONTEXT);
  assert.match(first.slug, /^buying-in-sadat-[a-f0-9]{32}$/);
  assert.notEqual(first.slug, second.slug);
  const updated = await service.updateArticle(PRINCIPAL, first.id, { version: first.version, title: { ar: 'عنوان جديد' }, reason: 'Update title only' }, CONTEXT);
  assert.equal(updated.slug, first.slug);
  const revisedCategory = await service.updateCategory(PRINCIPAL, category.id, { version: category.version, name: { ar: 'عقارات' }, reason: 'Update category name' }, CONTEXT);
  assert.equal(revisedCategory.slug, category.slug);
});

function fixture(options: { readonly permissions?: readonly string[]; readonly superAdmin?: boolean } = {}) {
  const permissions = new Set(options.permissions ?? [
    'admin:content.view',
    'admin:content.manage',
    'admin:content.publish'
  ]);
  const auditRecords: AuditRecordInput[] = [];
  const authorization: ArticleAuthorization = {
    async authorizationFor(userId) { return { isSuperAdmin: userId === ADMIN_ID && options.superAdmin === true }; },
    async authorize(userId, permission) {
      return userId === ADMIN_ID && permissions.has(permission);
    }
  };
  const repository = createMemoryArticleRepository();
  const service = createArticleService({
    repository,
    authorization,
    audit: {
      async record(input) {
        auditRecords.push(input);
        return '9123456789abcdef01234567';
      }
    },
    now: () => NOW
  });
  return { service, repository, auditRecords };
}

async function createCategory(service: ReturnType<typeof fixture>['service'], slug = 'guides') {
  return service.createCategory(PRINCIPAL, {
    slug,
    name: { ar: 'أدلة', en: 'Guides' },
    description: { en: 'Practical guides' },
    displayOrder: 2,
    active: true,
    reason: 'Create the article category'
  }, CONTEXT);
}

test('article-category administration enforces permissions, strict input, ordering, audit reasons, and optimistic versions', async () => {
  const { service, auditRecords } = fixture();
  const category = await createCategory(service);
  assert.equal(category.slug, 'guides');
  assert.equal(category.version, 0);
  assert.deepEqual(category.availableActions, ['update', 'delete']);
  assert.equal(auditRecords[0]?.reason, 'Create the article category');

  const updated = await service.updateCategory(PRINCIPAL, category.id, {
    version: 0,
    displayOrder: 1,
    active: false,
    reason: 'Temporarily deactivate this category'
  }, CONTEXT);
  assert.equal(updated.version, 1);
  assert.equal(updated.active, false);
  assert.deepEqual(await service.listPublicCategories({ locale: 'en' }), []);

  await assert.rejects(
    service.updateCategory(PRINCIPAL, category.id, {
      version: 0,
      active: true,
      reason: 'Replay an obsolete category update'
    }, CONTEXT),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_VERSION_CONFLICT'
  );
  await assert.rejects(
    service.createCategory(PRINCIPAL, {
      slug: 'bad', name: { en: 'Bad' }, displayOrder: 0, active: true,
      reason: 'Reject unknown input', unexpected: true
    } as never, CONTEXT)
  );
  await assert.rejects(
    service.listCategories({ userId: VIEWER_ID }, { page: 1, limit: 20, sort: 'displayOrder', direction: 'asc' }),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_FORBIDDEN'
  );
});

test('article lifecycle keeps drafts private, derives the author, supports review transitions, and exposes a safe localized projection', async () => {
  const { service, auditRecords } = fixture();
  const category = await createCategory(service, 'market-guides');
  const draft = await service.createArticle(PRINCIPAL, {
    categoryId: category.id,
    slug: 'buying-in-sadat',
    title: { ar: 'الشراء في السادات', en: 'Buying in Sadat' },
    body: { ar: 'دليل عربي', en: 'English guide' },
    seoTitle: { en: 'Sadat buying guide' },
    seoDescription: { en: 'A safe public summary' },
    reason: 'Create an editorial draft'
  }, CONTEXT);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.authorId, ADMIN_ID);
  assert.deepEqual((await service.listPublic({ locale: 'en', page: 1, limit: 20 })).data, []);

  assert.ok(draft.availableActions.includes('publish'));
  const submitted = await service.transitionArticle(PRINCIPAL, draft.id, {
    status: 'pending_review', version: 0, reason: 'Submit the article for review'
  }, CONTEXT);
  const published = await service.transitionArticle(PRINCIPAL, draft.id, {
    status: 'published', version: submitted.version, reason: 'Approve and publish reviewed content'
  }, CONTEXT);
  assert.equal(published.status, 'published');
  assert.equal(published.publishedAt, NOW.toISOString());

  const publicResult = await service.listPublic({ locale: 'ar', page: 1, limit: 20 });
  assert.equal(publicResult.total, 1);
  const publicArticle = publicResult.data[0]!;
  assert.equal(publicArticle.title.ar, 'الشراء في السادات');
  assert.equal(publicArticle.body.ar, 'دليل عربي');
  assert.equal(publicArticle.seoDescription?.ar, 'A safe public summary');
  assert.equal(publicArticle.category?.name.ar, 'أدلة');
  assert.equal(publicArticle.readingTimeMinutes, 1);
  assert.equal('authorId' in publicArticle, false);
  assert.equal('status' in publicArticle, false);
  assert.equal('availableActions' in publicArticle, false);
  assert.equal((await service.getPublicBySlug('buying-in-sadat', 'en')).body.en, 'English guide');
  assert.ok(auditRecords.some((entry) => entry.action === 'article.transition' && entry.reason.includes('publish')));
  assert.equal(JSON.stringify(auditRecords).includes('English guide'), false);

  await assert.rejects(
    service.transitionArticle(PRINCIPAL, draft.id, {
      status: 'archived', version: submitted.version, reason: 'Replay a stale transition version'
    }, CONTEXT),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_VERSION_CONFLICT'
  );
  const archived = await service.transitionArticle(PRINCIPAL, draft.id, {
    status: 'archived', version: published.version, reason: 'Archive outdated public content'
  }, CONTEXT);
  assert.equal(archived.status, 'archived');
  assert.deepEqual((await service.listPublic({ locale: 'en', page: 1, limit: 20 })).data, []);
});

test('inactive categories, in-use deletion, duplicate slugs, and publish permission are guarded at the service boundary', async () => {
  const full = fixture();
  const category = await createCategory(full.service, 'news');
  await assert.rejects(
    createCategory(full.service, 'news'),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_CATEGORY_SLUG_EXISTS'
  );
  const draft = await full.service.createArticle(PRINCIPAL, {
    categoryId: category.id,
    slug: 'market-update',
    title: { en: 'Market update' },
    body: { en: 'Verified editorial content' },
    reason: 'Create a market update draft'
  }, CONTEXT);
  await assert.rejects(
    full.service.deleteCategory(PRINCIPAL, category.id, {
      version: category.version, reason: 'Delete a category that is still referenced'
    }, CONTEXT),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_CATEGORY_IN_USE'
  );
  await assert.rejects(
    full.service.createArticle(PRINCIPAL, {
      categoryId: category.id,
      slug: 'market-update',
      title: { en: 'Duplicate' },
      body: { en: 'Duplicate slug content' },
      reason: 'Attempt a duplicate article slug'
    }, CONTEXT),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_SLUG_EXISTS'
  );

  const manageOnly = fixture({ permissions: ['admin:content.view', 'admin:content.manage'] });
  const manageCategory = await createCategory(manageOnly.service, 'manage-only');
  const manageDraft = await manageOnly.service.createArticle(PRINCIPAL, {
    categoryId: manageCategory.id,
    slug: 'permission-test',
    title: { en: 'Permission test' },
    body: { en: 'Permission boundary content' },
    reason: 'Create a permission test draft'
  }, CONTEXT);
  const manageSubmitted = await manageOnly.service.transitionArticle(PRINCIPAL, manageDraft.id, {
    status: 'pending_review', version: 0, reason: 'Submit content with manage permission'
  }, CONTEXT);
  await assert.rejects(
    manageOnly.service.transitionArticle(PRINCIPAL, manageDraft.id, {
      status: 'published', version: manageSubmitted.version, reason: 'Attempt publishing without permission'
    }, CONTEXT),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_FORBIDDEN'
  );

  const disabled = await full.service.updateCategory(PRINCIPAL, category.id, {
    version: category.version,
    active: false,
    reason: 'Disable this category before review'
  }, CONTEXT);
  assert.equal(disabled.active, false);
  const submitted = await full.service.transitionArticle(PRINCIPAL, draft.id, {
    status: 'pending_review', version: 0, reason: 'Submit content for editorial review'
  }, CONTEXT);
  await assert.rejects(
    full.service.transitionArticle(PRINCIPAL, draft.id, {
      status: 'published', version: submitted.version, reason: 'Attempt publish in inactive category'
    }, CONTEXT),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_CATEGORY_INACTIVE'
  );
});


test('admin article lists retain saved cover previews and omit computed reading time', async () => {
  const repository = createMemoryArticleRepository({ articles: [{
    id: '4123456789abcdef01234567', categoryId: '5123456789abcdef01234567',
    slug: 'display-fields', title: { en: 'Display fields' }, body: { en: 'Article body' },
    imageUrl: '/assets/article.jpg', readingTimeMinutes: 3,
    authorId: ADMIN_ID, status: 'published', version: 0, createdAt: NOW, updatedAt: NOW
  }] });
  const service = createArticleService({ repository, authorization: { authorize: async () => true }, audit: { record: async () => 'audit-id' } });
  const result = await service.listArticles(PRINCIPAL, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.equal(result.data.items.length, 1);
  assert.equal(result.data.items[0]?.imageUrl, '/assets/article.jpg');
  assert.equal('readingTimeMinutes' in result.data.items[0]!, false);
  assert.equal((await repository.findArticle('4123456789abcdef01234567'))!.imageUrl, '/assets/article.jpg');
});

test('published article edits and cover removal require both content management and publishing permission', async () => {
  const { service, repository } = fixture();
  const category = await createCategory(service, 'editable-guides');
  const draft = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { ar: 'Arabic title' }, body: { ar: 'Arabic body' }, coverAssetId: 'cccccccccccccccccccccccc', reason: 'Create article' }, CONTEXT);
  const review = await service.transitionArticle(PRINCIPAL, draft.id, { status: 'pending_review', version: draft.version, reason: 'Review article' }, CONTEXT);
  const published = await service.transitionArticle(PRINCIPAL, draft.id, { status: 'published', version: review.version, reason: 'Publish article' }, CONTEXT);
  assert.deepEqual(published.availableActions, ['update', 'archive', 'delete']);
  const limited = createArticleService({ repository, authorization: { authorize: async (_id, permission) => permission === 'admin:content.manage' }, audit: { record: async () => 'aaaaaaaaaaaaaaaaaaaaaaaa' } });
  await assert.rejects(limited.updateArticle(PRINCIPAL, draft.id, { version: published.version, title: { en: 'Unauthorized edit' }, reason: 'Attempt edit' }, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_FORBIDDEN');
  const edited = await service.updateArticle(PRINCIPAL, draft.id, { version: published.version, title: { ar: 'Updated title' }, coverAssetId: null, reason: 'Update published article' }, CONTEXT);
  assert.equal(edited.status, 'published');
  assert.equal(edited.coverAssetId, undefined);
  assert.equal(edited.imageUrl, undefined);
  assert.equal((await service.getPublicBySlug(edited.slug, 'ar')).title.ar, 'Updated title');
});

test('deleting articles checks permissions and versions, removes public access and records the reason', async () => {
  const { service, repository, auditRecords } = fixture();
  const category = await createCategory(service, 'deletion-guides');
  const draft = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { en: 'Delete this guide' }, body: { en: 'Guide body' }, reason: 'Create deletion fixture' }, CONTEXT);
  const review = await service.transitionArticle(PRINCIPAL, draft.id, { status: 'pending_review', version: draft.version, reason: 'Submit fixture for review' }, CONTEXT);
  const published = await service.transitionArticle(PRINCIPAL, draft.id, { status: 'published', version: review.version, reason: 'Publish deletion fixture' }, CONTEXT);
  const limited = createArticleService({ repository, authorization: { authorize: async (_id, permission) => permission !== 'admin:content.publish' }, audit: { record: async () => 'audit-id' } });
  const deletion = { version: published.version, reason: 'Remove obsolete guide permanently' };
  await assert.rejects(limited.deleteArticle(PRINCIPAL, published.id, deletion, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_FORBIDDEN');
  await assert.rejects(service.deleteArticle(PRINCIPAL, published.id, { ...deletion, version: 0 }, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_VERSION_CONFLICT');
  assert.equal((await service.getPublicBySlug(published.slug, 'en')).id, published.id);
  assert.deepEqual(await service.deleteArticle(PRINCIPAL, published.id, deletion, CONTEXT), { id: published.id, deleted: true });
  assert.equal(await repository.findArticle(published.id), null);
  await assert.rejects(service.getPublicBySlug(published.slug, 'en'), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_NOT_FOUND');
  assert.equal((await service.listArticles(PRINCIPAL, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' })).total, 0);
  assert.equal(auditRecords.at(-1)?.action, 'article.delete');
  assert.equal(auditRecords.at(-1)?.reason, deletion.reason);
  await assert.rejects(service.deleteArticle(PRINCIPAL, published.id, deletion, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_NOT_FOUND');
});

test('replacing a published cover validates the new image and preserves publication state', async () => {
  const { service, repository } = fixture();
  const category = await createCategory(service, 'image-guides');
  const draft = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { en: 'Image guide' }, body: { en: 'Guide body' }, reason: 'Create image fixture' }, CONTEXT);
  const review = await service.transitionArticle(PRINCIPAL, draft.id, { status: 'pending_review', version: draft.version, reason: 'Submit image fixture' }, CONTEXT);
  const published = await service.transitionArticle(PRINCIPAL, draft.id, { status: 'published', version: review.version, reason: 'Publish image fixture' }, CONTEXT);
  const validated: string[] = [];
  const images = createArticleService({ repository, authorization: { authorize: async () => true }, audit: { record: async () => 'audit-id' }, validateImage: async id => { validated.push(id); } });
  const assetId = 'dddddddddddddddddddddddd';
  const replaced = await images.updateArticle(PRINCIPAL, published.id, { version: published.version, coverAssetId: assetId, reason: 'Replace guide cover' }, CONTEXT);
  assert.deepEqual(validated, [assetId]);
  assert.equal(replaced.status, 'published');
  assert.equal((await images.getPublicBySlug(replaced.slug, 'en')).imageUrl, `/api/v1/public/article-photos/${assetId}`);
});

test('an empty draft can be completed and published in one language without requiring a second language', async () => {
  const { service } = fixture();
  const category = await createCategory(service, 'draft-publication');
  const draft = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { ar: 'مسودة عربية' }, body: { ar: '' }, reason: 'Save unfinished Arabic draft' }, CONTEXT);
  assert.equal(draft.status, 'draft');
  assert.equal((await service.listArticles(PRINCIPAL, { status: 'draft', page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' })).data.items[0]?.id, draft.id);
  await assert.rejects(service.transitionArticle(PRINCIPAL, draft.id, { status: 'pending_review', version: draft.version, reason: 'Submit unfinished draft' }, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_TRANSITION_INVALID');
  const completed = await service.updateArticle(PRINCIPAL, draft.id, { version: draft.version, body: { ar: 'محتوى المقال المكتمل\nفقرة أخرى' }, reason: 'Complete draft body' }, CONTEXT);
  const review = await service.transitionArticle(PRINCIPAL, draft.id, { status: 'pending_review', version: completed.version, reason: 'Submit completed Arabic article' }, CONTEXT);
  const published = await service.transitionArticle(PRINCIPAL, draft.id, { status: 'published', version: review.version, reason: 'Publish reviewed Arabic article' }, CONTEXT);
  assert.equal(published.status, 'published');
  assert.equal((await service.getPublicBySlug(published.slug, 'ar')).title.ar, 'مسودة عربية');
  assert.ok((await service.getPublicBySlug(published.slug, 'en')).body.en);
});

test('direct draft publication requires management and publishing permissions, complete content, an active category and the latest version', async () => {
  const { service, repository, auditRecords } = fixture();
  const category = await createCategory(service, 'direct-publication');
  const draft = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { ar: 'نشر مباشر' }, body: { ar: '' }, reason: 'Create direct publication draft' }, CONTEXT);
  const publish = { status: 'published' as const, version: draft.version, reason: 'Publish the completed article' };
  await assert.rejects(service.transitionArticle(PRINCIPAL, draft.id, publish, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_TRANSITION_INVALID');
  for (const permission of ['admin:content.manage', 'admin:content.publish']) {
    const limited = createArticleService({ repository, authorization: { authorize: async (_id, requested) => requested === permission }, audit: { record: async () => 'audit' } });
    await assert.rejects(limited.transitionArticle(PRINCIPAL, draft.id, publish, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_FORBIDDEN');
    const listed = await service.listArticles(PRINCIPAL, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
    assert.equal(listed.data.items[0]?.status, 'draft');
  }
  const body = 'فقرة أولى\n\nفقرة ثانية\tمعلومة أخرى';
  const ready = await service.updateArticle(PRINCIPAL, draft.id, { version: draft.version, body: { ar: body }, reason: 'Complete article paragraphs' }, CONTEXT);
  await assert.rejects(service.transitionArticle(PRINCIPAL, draft.id, publish, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_VERSION_CONFLICT');
  const inactive = await service.updateCategory(PRINCIPAL, category.id, { version: category.version, active: false, reason: 'Hide the article category' }, CONTEXT);
  await assert.rejects(service.transitionArticle(PRINCIPAL, draft.id, { ...publish, version: ready.version }, CONTEXT), (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_CATEGORY_INACTIVE');
  await service.updateCategory(PRINCIPAL, category.id, { version: inactive.version, active: true, reason: 'Restore the article category' }, CONTEXT);
  const published = await service.transitionArticle(PRINCIPAL, draft.id, { ...publish, version: ready.version }, CONTEXT);
  assert.equal(published.status, 'published');
  assert.equal(published.publishedAt, NOW.toISOString());
  assert.equal((await service.getPublicBySlug(published.slug, 'ar')).body.ar, body);
  assert.equal(auditRecords.at(-1)?.action, 'article.transition');
  assert.equal(auditRecords.at(-1)?.after?.status, 'published');
});

test('Super Admin drafts offer direct publishing throughout create, edit and list without a review submission', async () => {
  const { service, repository, auditRecords } = fixture({ superAdmin: true });
  const category = await createCategory(service);
  const draft = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { ar: 'مقال المدير' }, body: { ar: 'محتوى مكتمل' }, reason: 'Owner creates complete article' }, CONTEXT);
  assert.deepEqual(draft.availableActions, ['update', 'publish', 'delete']);
  const updated = await service.updateArticle(PRINCIPAL, draft.id, { version: draft.version, title: { ar: 'تعديل المدير' }, reason: 'Owner updates article title' }, CONTEXT);
  assert.deepEqual(updated.availableActions, ['update', 'publish', 'delete']);
  const listed = await service.listArticles(PRINCIPAL, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.deepEqual(listed.data.items[0]?.availableActions, ['update', 'publish', 'delete']);
  const count = auditRecords.length;
  await assert.rejects(service.transitionArticle(PRINCIPAL, draft.id, { version: updated.version, status: 'pending_review', reason: 'Owner cannot submit for review' }, CONTEXT), /ARTICLE_TRANSITION_INVALID/);
  assert.equal((await repository.findArticle(draft.id))?.status, 'draft');
  assert.equal(auditRecords.length, count);
  const published = await service.transitionArticle(PRINCIPAL, draft.id, { version: updated.version, status: 'published', reason: 'Owner publishes article directly' }, CONTEXT);
  assert.equal(published.status, 'published');
});

test('assigned article authors retain submission and receive no publisher actions after review submission', async () => {
  const { service, repository } = fixture({ permissions: ['admin:content.view', 'admin:content.manage'] });
  const category = await createCategory(service);
  const draft = await service.createArticle(PRINCIPAL, { categoryId: category.id, title: { ar: 'مقال الموظف' }, body: { ar: 'محتوى مكتمل' }, reason: 'Employee creates article' }, CONTEXT);
  assert.deepEqual(draft.availableActions, ['update', 'submit', 'delete']);
  const review = await service.transitionArticle(PRINCIPAL, draft.id, { version: draft.version, status: 'pending_review', reason: 'Employee submits article for review' }, CONTEXT);
  assert.deepEqual(review.availableActions, []);
  await assert.rejects(service.transitionArticle(PRINCIPAL, draft.id, { version: review.version, status: 'published', reason: 'Employee cannot publish article' }, CONTEXT), /ARTICLE_FORBIDDEN/);
  const owner = createArticleService({ repository, authorization: { async authorize() { return true; }, async authorizationFor() { return { isSuperAdmin: true }; } }, audit: { async record() { return 'audit'; } } });
  assert.ok((await owner.listArticles(PRINCIPAL, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' })).data.items[0]?.availableActions.includes('publish'));
  const returned = await owner.transitionArticle(PRINCIPAL, draft.id, { version: review.version, status: 'draft', reason: 'Owner returns article for correction' }, CONTEXT);
  assert.deepEqual(returned.availableActions, ['update', 'publish', 'delete']);
  const employeeView = await service.listArticles(PRINCIPAL, { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.deepEqual(employeeView.data.items[0]?.availableActions, ['update', 'submit', 'delete']);
});
