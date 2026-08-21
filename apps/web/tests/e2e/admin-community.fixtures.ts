import type { Page } from '@playwright/test';

export const adminCommunityPostId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminCommunityCommentId = 'cccccccccccccccccccccccc';
export const adminCommunityReportId = 'eeeeeeeeeeeeeeeeeeeeeeee';

export function adminCommunityPostFixture() {
  return {
    id: adminCommunityPostId,
    authorId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    title: 'Community post',
    body: 'A server-approved community post.',
    status: 'published',
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T11:00:00.000Z',
    commentCount: 3
  };
}

export function adminCommunityCommentFixture() {
  return {
    id: adminCommunityCommentId,
    postId: adminCommunityPostId,
    authorId: 'dddddddddddddddddddddddd',
    body: 'A visible comment.',
    depth: 0,
    status: 'visible',
    createdAt: '2026-08-18T12:00:00.000Z'
  };
}

export function adminCommunityReportFixture(status: 'open' | 'in_review' | 'resolved' | 'dismissed' = 'open') {
  return {
    id: adminCommunityReportId,
    postId: adminCommunityPostId,
    reporterId: 'ffffffffffffffffffffffff',
    reason: 'spam',
    details: 'This post contains repeated promotional content.',
    status,
    version: status === 'open' || status === 'in_review' ? 2 : 3,
    ...(status === 'resolved' || status === 'dismissed' ? { resolutionReason: 'Moderation decision recorded.' } : {}),
    createdAt: '2026-08-18T13:00:00.000Z',
    updatedAt: '2026-08-18T13:00:00.000Z'
  };
}

export async function routeAdminCommunityApis(page: Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({
    status: allow ? 200 : 401,
    contentType: 'application/json',
    body: JSON.stringify(allow
      ? { data: { accessToken: 'admin.community.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: '999999999999999999999999', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-community-refresh' } }
      : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-community-refresh-denied' } })
  }));
  await page.route('**/api/v1/admin/community/posts**', async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { items: [adminCommunityPostFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-community-posts' } })
  }));
  await page.route('**/api/v1/admin/community/comments**', async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { items: [adminCommunityCommentFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-community-comments' } })
  }));
  await page.route('**/api/v1/admin/community/reports**', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: adminCommunityReportFixture('resolved'), meta: { requestId: 'admin-community-report-resolve' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [adminCommunityReportFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-community-reports' } }) });
  });
}
