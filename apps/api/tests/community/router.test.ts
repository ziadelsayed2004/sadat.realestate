import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createMemoryCommunityReportService } from '../../src/modules/community/report-service.js';
import { createCommunityService } from '../../src/modules/community/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const SEEKER_ID = '1123456789abcdef01234567';
const PROVIDER_ID = '2123456789abcdef01234567';
const ADMIN_ID = '3123456789abcdef01234567';
const LIMITED_ADMIN_ID = '5123456789abcdef01234567';
const POST_ID = '4123456789abcdef01234567';
const NOW = '2026-08-17T08:00:00.000Z';

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
  const service = createCommunityService([{
    id: POST_ID,
    authorId: ADMIN_ID,
    title: 'Published community post',
    body: 'Public body',
    status: 'published',
    createdAt: NOW,
    updatedAt: NOW
  }], undefined, authorization);
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
  assert.match(list.headers.get('cache-control') ?? '', /public/);
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

  assert.equal((await request(origin, 'POST', `/api/v1/public/community/posts/${postId}/comments`, 'seeker', { body: 'Reviewable comment' })).status, 201);
  const comments = await request(origin, 'GET', `/api/v1/admin/community/comments?postId=${postId}&status=visible&search=Reviewable`, 'admin');
  assert.equal(comments.status, 200);
  const commentsBody = await comments.json() as { data: { items: Array<Record<string, unknown>>; total: number } };
  assert.equal(commentsBody.data.total, 1);
  assert.equal(commentsBody.data.items[0]?.postId, postId);
  assert.equal(commentsBody.data.items[0]?.authorId, SEEKER_ID);
  assert.equal(commentsBody.data.items[0]?.status, 'visible');
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
  assert.equal(comment.status, 201);
  const commentBody = await comment.json() as { data: Record<string, unknown> };
  assert.equal(commentBody.data.postId, postId);
  assert.equal('authorId' in commentBody.data, false);

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
