import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { StoredArticle, StoredArticleCategory } from '../../src/modules/articles/repository.js';
import { createMemoryArticleRepository } from '../../src/modules/articles/repository.js';
import { createArticleService } from '../../src/modules/articles/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const ADMIN_ID = '3123456789abcdef01234567';
const VIEWER_ID = '1123456789abcdef01234567';
const CATEGORY_ID = '2123456789abcdef01234567';
const ARTICLE_ID = '4123456789abcdef01234567';
const DRAFT_ID = '5123456789abcdef01234567';
const NOW = new Date('2026-08-17T08:00:00.000Z');

const accessTokens: AccessTokenService = {
  issue() { return 'unused'; },
  verify(token) {
    if (token === 'invalid') throw new Error('invalid token');
    const seeker = token === 'seeker';
    return {
      iss: 'sadat-realestate-api', aud: 'sadat-realestate',
      sub: token === 'viewer' ? VIEWER_ID : ADMIN_ID,
      sid: '6123456789abcdef01234567', role: seeker ? 'seeker' : 'admin',
      status: 'verified', iat: 1, exp: 9_999_999_999, jti: token
    } as AccessTokenClaims;
  }
};

function fixture() {
  const category: StoredArticleCategory = {
    id: CATEGORY_ID, slug: 'guides', name: { ar: 'أدلة', en: 'Guides' },
    description: { en: 'Public category metadata' }, displayOrder: 1, active: true,
    version: 0, createdAt: NOW, updatedAt: NOW
  };
  const published: StoredArticle = {
    id: ARTICLE_ID, categoryId: CATEGORY_ID, slug: 'buying-in-sadat',
    title: { ar: 'الشراء في السادات', en: 'Buying in Sadat' },
    body: { ar: 'محتوى آمن', en: 'Safe public content' },
    seoDescription: { en: 'Public SEO description' }, authorId: ADMIN_ID,
    status: 'published', publishedAt: NOW, version: 2, createdAt: NOW, updatedAt: NOW
  };
  const draft: StoredArticle = {
    id: DRAFT_ID, categoryId: CATEGORY_ID, slug: 'private-draft',
    title: { en: 'Private draft' }, body: { en: 'Must never be public' },
    authorId: ADMIN_ID, status: 'draft', version: 0, createdAt: NOW, updatedAt: NOW
  };
  const repository = createMemoryArticleRepository({ categories: [category], articles: [published, draft] });
  const service = createArticleService({
    repository,
    authorization: {
      async authorize(userId, permission) {
        return userId === ADMIN_ID
          || (userId === VIEWER_ID && permission === 'admin:content.view');
      }
    },
    audit: { async record() { return '7123456789abcdef01234567'; } },
    now: () => NOW
  });
  return { service };
}

async function withServer(run: (origin: string) => Promise<void>) {
  const { service } = fixture();
  const server = createApiServer({
    database: { isReady: async () => true },
    articles: { service, accessTokens }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await stopApiServer(server); }
}

function request(origin: string, method: string, path: string, token?: string, body?: unknown) {
  return fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

test('public article HTTP routes expose only published localized projections and active category metadata', async () => withServer(async (origin) => {
  const categories = await request(origin, 'GET', '/api/v1/public/article-categories?locale=en');
  assert.equal(categories.status, 200);
  assert.match(categories.headers.get('cache-control') ?? '', /public/);
  const categoriesBody = await categories.json() as { data: Array<Record<string, unknown>> };
  assert.equal(categoriesBody.data[0]?.slug, 'guides');
  assert.equal('active' in (categoriesBody.data[0] ?? {}), false);

  const list = await request(origin, 'GET', '/api/v1/public/articles?locale=en&page=1&limit=20');
  assert.equal(list.status, 200);
  const listBody = await list.json() as { data: Array<Record<string, unknown>>; meta: { total: number } };
  assert.equal(listBody.meta.total, 1);
  assert.equal(listBody.data[0]?.slug, 'buying-in-sadat');
  assert.equal('authorId' in (listBody.data[0] ?? {}), false);
  assert.equal('status' in (listBody.data[0] ?? {}), false);

  const details = await request(origin, 'GET', '/api/v1/public/articles/buying-in-sadat?locale=ar');
  assert.equal(details.status, 200);
  const detailsBody = await details.json() as { data: { title: Record<string, string>; category: { name: Record<string, string> } } };
  assert.equal(detailsBody.data.title.ar, 'الشراء في السادات');
  assert.equal(detailsBody.data.category.name.ar, 'أدلة');
  const privateDraft = await request(origin, 'GET', '/api/v1/public/articles/private-draft?locale=en');
  assert.equal(privateDraft.status, 404);
  assert.doesNotMatch(privateDraft.headers.get('cache-control') ?? '', /^public/u);
  assert.equal((await request(origin, 'GET', '/api/v1/public/articles/Bad%20Slug?locale=en')).status, 400);
}));

test('admin article HTTP routes enforce authentication, admin role, API permissions, and strict mutation contracts', async () => withServer(async (origin) => {
  assert.equal((await request(origin, 'GET', '/api/v1/admin/article-categories')).status, 401);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/article-categories', 'seeker')).status, 403);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/article-categories', 'viewer')).status, 200);
  assert.equal((await request(origin, 'POST', '/api/v1/admin/article-categories', 'viewer', {
    slug: 'viewer-write', name: { en: 'Viewer write' }, active: true, displayOrder: 0,
    reason: 'Reject a view-only content mutation'
  })).status, 403);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/article-categories?limit=101', 'admin')).status, 400);
  assert.equal((await request(origin, 'POST', '/api/v1/admin/article-categories', 'admin', {
    slug: 'unsafe', name: { en: 'Unsafe' }, active: true, displayOrder: 0,
    reason: 'Reject unknown mass assignment', ownerId: VIEWER_ID
  })).status, 400);

  const created = await request(origin, 'POST', '/api/v1/admin/article-categories', 'admin', {
    slug: 'news', name: { ar: 'أخبار', en: 'News' }, active: true, displayOrder: 2,
    reason: 'Create a managed article category'
  });
  assert.equal(created.status, 201);
  assert.match(created.headers.get('cache-control') ?? '', /no-store/);
  const list = await request(origin, 'GET', '/api/v1/admin/articles', 'admin');
  assert.equal(list.status, 200);
  const listBody = await list.json() as { data: { items: Array<{ slug: string }> } };
  assert.deepEqual(listBody.data.items.map((item) => item.slug).sort(), ['buying-in-sadat', 'private-draft']);
}));
