import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createMemoryCommunityReportService } from '../../src/modules/community/report-service.js';
import { createCommunityService, createMemoryCommunityRepository } from '../../src/modules/community/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { createMongooseCommunityReportService } from '../../src/modules/community/report-service.js';
import type { Connection } from 'mongoose';

const SEEKER_ID = '1123456789abcdef01234567';
const PROVIDER_ID = '2123456789abcdef01234567';
const ADMIN_ID = '3123456789abcdef01234567';
const LIMITED_ADMIN_ID = '5123456789abcdef01234567';
const POST_ID = '4123456789abcdef01234567';
const NOW = '2026-08-17T08:00:00.000Z';

test('report totals include closed reports even with an empty status filter and across pages', async () => withServer(async (origin, postId) => {
  for (const action of ['resolve', 'dismiss']) {
    const created = await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/reports`, 'seeker', { reason: 'spam', details: `Report to ${action}` });
    assert.equal(created.status, 201);
    const { data } = await created.json() as { data: { id: string } };
    assert.equal((await request(origin, 'POST', `/api/v1/admin/community/reports/${data.id}/resolve`, 'admin', { version: 0, action, reason: 'Reviewed the reported content' })).status, 200);
  }
  const summary = { total: 2, open: 0, in_review: 0, resolved: 1, dismissed: 1 };
  for (const query of ['status=open', 'status=in_review', 'status=resolved', 'status=dismissed', 'page=2&limit=1']) {
    const response = await request(origin, 'GET', `/api/v1/admin/community/reports?${query}`, 'admin');
    assert.equal(response.status, 200);
    const { data } = await response.json() as { data: { total: number; items: unknown[]; summary: unknown } };
    assert.deepEqual(data.summary, summary);
    if (query === 'status=open' || query === 'status=in_review') { assert.equal(data.total, 0); assert.deepEqual(data.items, []); }
    if (query === 'page=2&limit=1') { assert.equal(data.total, 2); assert.equal(data.items.length, 1); }
  }
  const emptyPost = await request(origin, 'GET', '/api/v1/admin/community/reports?postId=aaaaaaaaaaaaaaaaaaaaaaaa', 'admin');
  assert.deepEqual((await emptyPost.json() as { data: { summary: unknown } }).data.summary, { total: 0, open: 0, in_review: 0, resolved: 0, dismissed: 0 });
}));

test('MongoDB report summary groups every status before pagination and preserves the selected post scope', async () => {
  let pipeline: unknown;
  const cursor = { sort: () => cursor, skip: () => cursor, limit: () => cursor, toArray: async () => [] };
  const collection = {
    createIndex: async () => 'index',
    find: (filter: unknown) => { assert.deepEqual(filter, { status: 'open', postId: POST_ID }); return cursor; },
    countDocuments: async () => 0,
    aggregate: (value: unknown) => { pipeline = value; return { toArray: async () => [{ _id: 'resolved', count: 25 }, { _id: 'dismissed', count: 1 }] }; }
  };
  const service = createMongooseCommunityReportService({ collection: () => collection } as unknown as Connection, { authorize: async () => true });
  const data = await service.adminList(accessTokens.verify('admin'), { status: 'open', postId: POST_ID, page: 2, limit: 1 });
  assert.equal(data.total, 0);
  assert.deepEqual(data.summary, { total: 26, open: 0, in_review: 0, resolved: 25, dismissed: 1 });
  assert.deepEqual(pipeline, [{ $match: { postId: POST_ID } }, { $group: { _id: { $ifNull: ['$status', 'open'] }, count: { $sum: 1 } } }]);
});

const accessTokens: AccessTokenService = {
  issue() { return 'unused'; },
  verify(token) {
    const role = token === 'provider' || token === 'limited-admin' ? token === 'provider' ? 'provider' : 'admin' : token === 'admin' ? 'admin' : 'seeker';
    const sub = role === 'provider' ? PROVIDER_ID : role === 'admin' ? token === 'limited-admin' ? LIMITED_ADMIN_ID : ADMIN_ID : SEEKER_ID;
    return {
      iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub,
      sid: '6123456789abcdef01234567', role, status: 'verified', iat: 1, exp: 9_999_999_999, jti: token
    } as AccessTokenClaims;
  }
};

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

async function withServer(run: (origin: string, postId: string) => Promise<void>) {
  const authorization = {
    async authorize(userId: string, permission: 'admin:community.view' | 'admin:community.moderate') {
      return userId === ADMIN_ID && (permission === 'admin:community.view' || permission === 'admin:community.moderate');
    }
  };
  const seed = [{
    id: POST_ID,
    authorId: ADMIN_ID,
    title: 'Published community post',
    body: 'Public body',
    status: 'published' as const,
    version: 0,
    createdAt: NOW,
    updatedAt: NOW
  }];
  const service = createCommunityService([], createMemoryCommunityRepository(seed, { record: async () => 'audit-id' }), authorization);
  const server = createApiServer({
    database: { isReady: async () => true },
    community: { service, reports: createMemoryCommunityReportService(authorization), accessTokens }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`, POST_ID); }
  finally { await stopApiServer(server); }
}

test('public community routes expose paginated safe projections and visible comments only', async () => withServer(async (origin, postId) => {
  const list = await request(origin, 'GET', '/api/v1/public/community/posts?page=1&limit=20');
  assert.equal(list.status, 200);
  assert.equal(list.headers.get('cache-control'), 'no-store');
  const listBody = await list.json() as { data: { items: Array<Record<string, unknown>>; total: number } };
  assert.equal(listBody.data.total, 1);
  assert.equal(listBody.data.items[0]?.id, postId);
  assert.equal('authorId' in (listBody.data.items[0] ?? {}), false);
  assert.equal('status' in (listBody.data.items[0] ?? {}), false);

  const detail = await request(origin, 'GET', `/api/v1/public/community/posts/${postId}`);
  assert.equal(detail.status, 200);
  const detailBody = await detail.json() as { data: { post: Record<string, unknown>; comments: unknown[] } };
  assert.equal(detailBody.data.post.id, postId);
  assert.equal(detailBody.data.comments.length, 0);
  assert.equal('authorId' in detailBody.data.post, false);

  assert.equal((await request(origin, 'GET', '/api/v1/public/community/posts/not-an-id')).status, 400);
  assert.equal((await request(origin, 'GET', '/api/v1/public/community/posts/5123456789abcdef01234567')).status, 404);
}));

test('admin community post listing enforces RBAC, strict filters, pagination, and explicit internal admin projection', async () => withServer(async (origin, postId) => {
  assert.equal((await request(origin, 'GET', '/api/v1/admin/community/posts')).status, 401);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/community/posts', 'seeker')).status, 403);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/community/posts', 'limited-admin')).status, 403);

  const response = await request(origin, 'GET', `/api/v1/admin/community/posts?status=published&search=Published&page=1&limit=1`, 'admin');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json() as { data: { items: Array<Record<string, unknown>>; total: number; page: number; limit: number } };
  assert.equal(body.data.total, 1);
  assert.equal(body.data.page, 1);
  assert.equal(body.data.limit, 1);
  assert.equal(body.data.items[0]?.id, postId);
  assert.equal(body.data.items[0]?.authorId, ADMIN_ID);
  assert.equal(body.data.items[0]?.status, 'published');
  assert.equal(body.data.items[0]?.commentCount, 0);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/community/posts?unexpected=true', 'admin')).status, 400);

  assert.equal((await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/comments`, 'seeker', { body: 'Reviewable comment' })).status, 403);
  const comments = await request(origin, 'GET', `/api/v1/admin/community/comments?postId=${postId}&status=visible&search=Reviewable`, 'admin');
  assert.equal(comments.status, 200);
  const commentsBody = await comments.json() as { data: { items: Array<Record<string, unknown>>; total: number } };
  assert.equal(commentsBody.data.total, 0);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/community/comments?postId=not-an-id', 'admin')).status, 400);
}));

test('community mutations require verified authentication and keep strict safe responses', async () => withServer(async (origin, postId) => {
  assert.equal((await request(origin, 'POST', '/api/v1/public/community/posts', undefined, { title: 'No auth', body: 'Blocked' })).status, 401);
  assert.equal((await request(origin, 'POST', '/api/v1/public/community/posts', 'seeker', { title: 'Valid', body: 'Draft', internalNotes: 'no' })).status, 400);

  const created = await request(origin, 'POST', '/api/v1/public/community/posts', 'seeker', { title: 'Valid', body: 'Draft' });
  assert.equal(created.status, 201);
  const createdBody = await created.json() as { data: Record<string, unknown> };
  assert.equal(createdBody.data.status, 'draft');
  assert.equal('authorId' in createdBody.data, false);

  const comment = await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/comments`, 'provider', { body: 'A visible comment' });
  assert.equal(comment.status, 403);
  const commentBody = await comment.json() as { error: { code: string } };
  assert.equal(commentBody.error.code, 'COMMENTS_DISABLED');

  const liked = await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/reactions`, 'seeker', { reaction: 'like' });
  assert.equal(liked.status, 200);
  const likedBody = await liked.json() as { data: { postId: string; reaction: string | null; likeCount: number; dislikeCount: number } };
  assert.deepEqual(likedBody.data, { postId, reaction: 'like', likeCount: 1, dislikeCount: 0 });
  const switched = await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/reactions`, 'seeker', { reaction: 'dislike' });
  assert.equal(switched.status, 200);
  assert.deepEqual((await switched.json() as { data: unknown }).data, { postId, reaction: 'dislike', likeCount: 0, dislikeCount: 1 });
  assert.equal((await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/reactions`, undefined, { reaction: 'like' })).status, 401);
  assert.equal((await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/reactions`, 'seeker', { reaction: 'love' })).status, 400);

  const report = await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/reports`, 'seeker', { reason: 'spam', details: 'Repeated promotional content' });
  assert.equal(report.status, 201);
  const reportBody = await report.json() as { data: { id: string; status: string } };
  assert.equal(reportBody.data.status, 'open');

  assert.equal((await request(origin, 'GET', '/api/v1/admin/community/reports', 'seeker')).status, 403);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/community/reports', 'limited-admin')).status, 403);
  const reports = await request(origin, 'GET', `/api/v1/admin/community/reports?status=open&postId=${postId}&page=1&limit=20`, 'admin');
  assert.equal(reports.status, 200);
  const reportsBody = await reports.json() as { data: { items: Array<Record<string, unknown>>; total: number } };
  assert.equal(reportsBody.data.total, 1);
  assert.equal(reportsBody.data.items[0]?.id, reportBody.data.id);
  assert.equal(reportsBody.data.items[0]?.postId, postId);
  assert.equal(reportsBody.data.items[0]?.reporterId, SEEKER_ID);
  assert.equal(reportsBody.data.items[0]?.details, 'Repeated promotional content');
  assert.equal(reportsBody.data.items[0]?.version, 0);
  assert.equal((await request(origin, 'GET', '/api/v1/admin/community/reports?unexpected=true', 'admin')).status, 400);

  const resolved = await request(origin, 'POST', `/api/v1/admin/community/reports/${reportBody.data.id}/resolve`, 'admin', { version: 0, action: 'resolve', reason: 'Reviewed and resolved safely' });
  assert.equal(resolved.status, 200);
  const resolvedBody = await resolved.json() as { data: Record<string, unknown> };
  assert.equal(resolvedBody.data.status, 'resolved');
  assert.equal(resolvedBody.data.version, 1);
  assert.equal(resolvedBody.data.resolutionReason, 'Reviewed and resolved safely');
  assert.equal((await request(origin, 'POST', `/api/v1/admin/community/reports/${reportBody.data.id}/resolve`, 'admin', { version: 0, action: 'dismiss', reason: 'Stale version' })).status, 409);
  assert.equal((await request(origin, 'POST', '/api/v1/admin/community/reports/not-an-id/resolve', 'admin', { version: 0, action: 'resolve', reason: 'Invalid identifier' })).status, 400);

  assert.equal((await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/reports`, 'seeker', { reason: 'unsafe', details: 'bad' })).status, 400);
  assert.equal((await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/comments`, 'seeker', { body: 'bad', extra: true })).status, 400);
}));


test('community HTTP lifecycle creates a private draft, moderates it, rejects stale decisions, and hides it publicly', async () => withServer(async origin => {
  const created = await request(origin, 'POST', '/api/v1/public/community/posts', 'seeker', { title: 'Lifecycle test', body: 'Reviewed test content' });
  assert.equal(created.status, 201);
  const { data: draft } = await created.json() as { data: { id: string; version: number } };
  const path = `/api/v1/admin/community/posts/${draft.id}/moderate`;
  const input = { action: 'publish', reason: 'Approved after content review', expectedVersion: draft.version };
  assert.equal((await request(origin, 'GET', `/api/v1/public/community/posts/${draft.id}`)).status, 404);
  assert.equal((await request(origin, 'POST', path, undefined, input)).status, 401);
  assert.equal((await request(origin, 'POST', path, 'seeker', input)).status, 403);
  assert.equal((await request(origin, 'POST', path, 'limited-admin', input)).status, 403);
  assert.equal((await request(origin, 'POST', path, 'admin', { ...input, reason: ' ' })).status, 400);
  const published = await request(origin, 'POST', path, 'admin', input);
  assert.equal(published.status, 200);
  const { data } = await published.json() as { data: { version: number } };
  assert.equal((await request(origin, 'GET', `/api/v1/public/community/posts/${draft.id}`)).status, 200);
  assert.equal((await request(origin, 'POST', path, 'admin', input)).status, 409);
  const hidden = await request(origin, 'POST', path, 'admin', { ...input, action: 'hide', expectedVersion: data.version });
  assert.equal(hidden.status, 200);
  assert.equal((await request(origin, 'GET', `/api/v1/public/community/posts/${draft.id}`)).status, 404);
  const { data: hiddenData } = await hidden.json() as { data: { version: number } };
  assert.equal((await request(origin, 'POST', path, 'admin', { ...input, action: 'reject', expectedVersion: hiddenData.version })).status, 200);
}));
