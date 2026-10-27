import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import type { AuditRecordInput } from '../../src/modules/audit/writer.js';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createCommunityService, createMemoryCommunityRepository } from '../../src/modules/community/service.js';
import { createMemoryCommunityReportService } from '../../src/modules/community/report-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { communityCategoryCreateSchema, communityCategoryDeleteSchema, communityCategoryParamsSchema, communityPostCreateSchema, homepageSectionPatchSchema, aboutBlockPatchSchema, tipPatchSchema } from '@sadat-real-estate/contracts';
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
  assert.equal(lookups, 1);
  await assert.rejects(service.validate('custom_' + 'a'.repeat(24)), /INVALID_CATEGORY/);
  await assert.rejects(service.create({ sub: 'b'.repeat(24), role: 'admin', status: 'verified' } as never, { label: { en: 'News' }, reason: 'Organize posts' }, { requestId: 'test', traceId: 'a'.repeat(32) }), /FORBIDDEN/);
  await assert.rejects(service.remove({ sub: 'b'.repeat(24), role: 'admin', status: 'verified' } as never, 'question', { reason: 'Remove unused choice', confirm: true }, { requestId: 'test', traceId: 'a'.repeat(32) }), /FORBIDDEN/);
  assert.equal(lookups, 2);
});

test('category removal requires a registered key format, a reason and explicit confirmation', () => {
  for (const input of [{}, { reason: 'ab', confirm: true }, { reason: 'Unused category' }, { reason: 'Unused category', confirm: false }, { reason: 'Unused category', confirm: true, posts: 'delete' }]) assert.equal(communityCategoryDeleteSchema.safeParse(input).success, false);
  assert.equal(communityCategoryDeleteSchema.safeParse({ reason: 'Unused category', confirm: true }).success, true);
  assert.equal(communityCategoryParamsSchema.safeParse({ categoryKey: '$ne' }).success, false);
});

const admin = { sub: 'b'.repeat(24), role: 'admin', status: 'verified' } as AccessTokenClaims;
const context = { requestId: 'category-delete', traceId: 'a'.repeat(32) };
const categoryKey = 'custom_' + 'c'.repeat(24);
const authorization = { authorize: async (userId: string) => userId === admin.sub };
function categoryFixture() {
  type Row = { _id: Types.ObjectId; key: string; label: { en: string }; nameKey: string; deletedAt?: Date };
  let rows = new Map<string, Row>([[categoryKey, { _id: new Types.ObjectId('c'.repeat(24)), key: categoryKey, label: { en: 'City news' }, nameKey: 'city news' }]]);
  const audits: AuditRecordInput[] = [];
  let failAudit = false;
  const matches = (row: Row, query: Record<string, unknown>) => {
    const key = query.key as string | { $in: string[] } | undefined;
    return (key === undefined || (typeof key === 'string' ? row.key === key : key.$in.includes(row.key))) && (query.deletedAt === undefined || ((query.deletedAt as { $exists: boolean }).$exists === (row.deletedAt !== undefined)));
  };
  const connection = { collection(name: string) {
    assert.equal(name, 'community_categories', 'category removal must never delete posts or other collections');
    return {
      createIndex: async () => 'index',
      find(query: Record<string, unknown>) {
        let limit = Infinity;
        const cursor = { sort() { return cursor; }, limit(value: number) { limit = value; return cursor; }, toArray: async () => [...rows.values()].filter(row => matches(row, query)).slice(0, limit).map(({ key, label }) => ({ key, label })) };
        return cursor;
      },
      findOne: async (query: Record<string, unknown>) => [...rows.values()].find(row => matches(row, query)) ?? null,
      countDocuments: async (query: Record<string, unknown>) => [...rows.values()].filter(row => matches(row, query)).length,
      insertOne: async (row: Row) => { rows.set(row.key, row); },
      updateOne: async ({ key }: { key: string }, update: { $set: Partial<Row>; $setOnInsert: Partial<Row> }) => {
        rows.set(key, { ...(rows.get(key) ?? update.$setOnInsert), ...update.$set, key } as Row);
      }
    };
  }, async startSession() {
    return { async withTransaction(run: () => Promise<void>) { const before = new Map(rows); try { await run(); } catch (error) { rows = before; throw error; } }, endSession: async () => undefined };
  } } as unknown as Connection;
  const service = createCommunityCategories(connection, authorization, { record: async input => { if (failAudit) throw new Error('AUDIT_FAILED'); audits.push(input); return 'audit'; } });
  return { service, audits, failAudit: () => { failAudit = true; } };
}

test('removes custom and built-in categories from choices while retaining names, preserving posts and auditing once', async () => {
  const { service, audits } = categoryFixture();
  for (const key of [categoryKey, 'question']) {
    assert((await service.list()).some(item => item.key === key));
    await service.remove(admin, key, { reason: 'Remove unused choice', confirm: true }, context);
    assert.equal((await service.list()).some(item => item.key === key), false);
    await assert.rejects(service.validate(key), /INVALID_CATEGORY/);
    assert((await service.labels([key])).some(item => item.key === key));
    await service.remove(admin, key, { reason: 'Retry removal', confirm: true }, context);
  }
  assert.equal(audits.length, 2);
  assert.equal(audits[0]?.action, 'community_category.delete');
  assert.equal(audits[0]?.reason, 'Remove unused choice');
  assert.equal(audits[0]?.requestId, context.requestId);
  assert.deepEqual((await service.labels([categoryKey]))[0]?.label, { en: 'City news' });
  const recreated = await service.create(admin, { label: { en: 'City news' }, reason: 'Reintroduce a fresh category' }, context);
  assert.notEqual(recreated.key, categoryKey);
  assert((await service.list()).some(item => item.key === recreated.key));
});

test('category deletion rolls back when auditing fails and rejects missing categories and invalid confirmation', async () => {
  const fixture = categoryFixture();
  await assert.rejects(fixture.service.remove(admin, 'custom_' + 'd'.repeat(24), { reason: 'Remove choice', confirm: true }, context), /NOT_FOUND/);
  await assert.rejects(fixture.service.remove(admin, categoryKey, { reason: 'Remove choice', confirm: false }, context));
  fixture.failAudit();
  await assert.rejects(fixture.service.remove(admin, categoryKey, { reason: 'Remove choice', confirm: true }, context), /AUDIT_FAILED/);
  await fixture.service.validate(categoryKey);
  assert((await fixture.service.list()).some(item => item.key === categoryKey));
});

test('category deletion API enforces auth, permissions and confirmation, with published post labels preserved', async () => {
  const { service: categories } = categoryFixture();
  const tokens: AccessTokenService = { issue: () => '', verify(token) { return { ...admin, sub: token === 'limited' ? 'd'.repeat(24) : admin.sub, role: token === 'provider' ? 'provider' : 'admin' } as AccessTokenClaims; } };
  const postId = 'e'.repeat(24), now = new Date().toISOString();
  const service = createCommunityService([], createMemoryCommunityRepository([{ id: postId, authorId: admin.sub, title: 'Existing post', body: 'Preserve this post', category: categoryKey, status: 'published', version: 0, createdAt: now, updatedAt: now }]), authorization, undefined, undefined, categories);
  const server = createApiServer({ database: { isReady: async () => true }, community: { categories, service, reports: createMemoryCommunityReportService(authorization), accessTokens: tokens } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 }), origin = `http://127.0.0.1:${address.port}`;
  const remove = (key: string, token?: string, body: unknown = { reason: 'Remove old choice', confirm: true }) => fetch(`${origin}/api/v1/admin/community/categories/${key}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await remove(categoryKey)).status, 401);
    assert.equal((await remove(categoryKey, 'provider')).status, 403);
    assert.equal((await remove(categoryKey, 'limited')).status, 403);
    assert.equal((await remove(categoryKey, 'admin', { reason: 'Remove choice' })).status, 400);
    assert.equal((await remove('invalid-key', 'admin')).status, 400);
    assert.equal((await remove('custom_' + 'f'.repeat(24), 'admin')).status, 404);
    const response = await remove(categoryKey, 'admin');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json() as { data: { items: { key: string }[] } }).data.items.some(item => item.key === categoryKey), false);
    const detail = await fetch(`${origin}/api/v1/public/community/posts/${postId}`);
    assert.equal(detail.status, 200);
    assert.deepEqual((await detail.json() as { data: { post: { categoryName: unknown } } }).data.post.categoryName, { en: 'City news' });
    assert.deepEqual((await service.publicPage({ page: 1, limit: 20 })).items[0]?.categoryName, { en: 'City news' });
  } finally { await stopApiServer(server); }
});
test('migrates a legacy homepage placement only to a supported section and accepts removable content images', () => {
  assert.equal(homepageSectionPatchSchema.safeParse({ version: 0, key: 'tips', reason: 'Connect legacy section' }).success, true);
  assert.equal(homepageSectionPatchSchema.safeParse({ version: 0, key: 'unknown_section', reason: 'Connect legacy section' }).success, false);
  assert.equal(aboutBlockPatchSchema.safeParse({ version: 0, order: 0, imageUrl: 'https://cdn.example/about.jpg', reason: 'Update image' }).success, true);
  assert.equal(tipPatchSchema.safeParse({ version: 0, imageUrl: null, reason: 'Remove image' }).success, true);
});
