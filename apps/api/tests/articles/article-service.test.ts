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

function fixture(options: { readonly permissions?: readonly string[] } = {}) {
  const permissions = new Set(options.permissions ?? [
    'admin:content.view',
    'admin:content.manage',
    'admin:content.publish'
  ]);
  const auditRecords: AuditRecordInput[] = [];
  const authorization: ArticleAuthorization = {
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

test('article lifecycle keeps drafts private, derives the author, requires ordered review transitions, and exposes a safe localized projection', async () => {
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

  await assert.rejects(
    service.transitionArticle(PRINCIPAL, draft.id, {
      status: 'published', version: 0, reason: 'Attempt to skip editorial review'
    }, CONTEXT),
    (error) => error instanceof ArticleServiceError && error.code === 'ARTICLE_TRANSITION_INVALID'
  );
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
