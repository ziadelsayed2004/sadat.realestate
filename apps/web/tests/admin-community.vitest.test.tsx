import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  communityAdminCommentListDataSchema,
  communityAdminPostListDataSchema,
  communityAdminReportListDataSchema,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  AdminCommunity,
  getAdminCommunityCopy,
  loadAdminCommunityComments,
  loadAdminCommunityPosts,
  loadAdminCommunityReports,
  resolveAdminCommunityReport
} from '../src/features/admin_community/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const post = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  authorId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  title: 'Community post',
  body: 'A server-approved community post.',
  status: 'published' as const,
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T11:00:00.000Z',
  commentCount: 3
};
const comment = {
  id: 'cccccccccccccccccccccccc',
  postId: post.id,
  authorId: 'dddddddddddddddddddddddd',
  body: 'A visible comment.',
  depth: 0,
  status: 'visible' as const,
  createdAt: '2026-08-18T12:00:00.000Z'
};
const report = {
  id: 'eeeeeeeeeeeeeeeeeeeeeeee',
  postId: post.id,
  reporterId: 'ffffffffffffffffffffffff',
  reason: 'spam' as const,
  details: 'This post contains repeated promotional content.',
  status: 'open' as const,
  version: 2,
  createdAt: '2026-08-18T13:00:00.000Z',
  updatedAt: '2026-08-18T13:00:00.000Z'
};
const posts = communityAdminPostListDataSchema.parse({ items: [post], page: 1, limit: 20, total: 1 });
const comments = communityAdminCommentListDataSchema.parse({ items: [comment], page: 1, limit: 20, total: 1 });
const reports = communityAdminReportListDataSchema.parse({ items: [report], page: 1, limit: 20, total: 1 });
const session = { status: 'authenticated' as const, role: 'admin' as const };

function envelope(data: unknown, meta: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-community-test', ...meta } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      const method = init?.method ?? 'GET';
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown;
      requests.push({ method, path: url.pathname, body });
      if (url.pathname.endsWith('/resolve')) return envelope({ ...report, status: body && typeof body === 'object' && 'action' in body && body.action === 'dismiss' ? 'dismissed' : 'resolved', version: 3, resolutionReason: 'Moderation decision recorded.' });
      if (url.pathname.endsWith('/comments')) return envelope(comments);
      if (url.pathname.endsWith('/reports')) return envelope(reports);
      return envelope(posts);
    }
  });
}

describe('admin community contracts and views', () => {
  it('uses the implemented list and versioned report routes', async () => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const client = apiClientFor(requests);
    await expect(loadAdminCommunityPosts({ apiClient: client })).resolves.toMatchObject({ items: [post], total: 1 });
    await expect(loadAdminCommunityComments({ apiClient: client })).resolves.toMatchObject({ items: [comment], total: 1 });
    await expect(loadAdminCommunityReports({ apiClient: client })).resolves.toMatchObject({ items: [report], total: 1 });
    await expect(resolveAdminCommunityReport(report.id, { version: 2, action: 'resolve', reason: 'Moderation decision recorded.' }, { apiClient: client })).resolves.toMatchObject({ id: report.id, status: 'resolved', version: 3 });
    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual([
      'GET /api/v1/admin/community/posts',
      'GET /api/v1/admin/community/comments',
      'GET /api/v1/admin/community/reports',
      'POST /api/v1/admin/community/reports/eeeeeeeeeeeeeeeeeeeeeeee/resolve'
    ]);
    expect(requests[3]?.body).toEqual({ version: 2, action: 'resolve', reason: 'Moderation decision recorded.' });
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders the safe projection and direction for %s', async (locale: SupportedLocale) => {
    window.history.pushState({}, '', '/admin/community');
    const result = renderWithLocale(<AdminCommunity locale={locale} session={session} initialPosts={posts} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`admin-community-post-${post.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-screen-id="ADM-27"]')).not.toBeNull();
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.container.textContent).toContain(post.title);
    expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    result.unmount();

    window.history.pushState({}, '', '/admin/community/comments');
    const commentsResult = renderWithLocale(<AdminCommunity locale={locale} session={session} initialComments={comments} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`admin-community-comment-${comment.id}`)).toBeInTheDocument());
    expect(commentsResult.container.querySelector('[data-screen-id="ADM-28"]')).not.toBeNull();
    commentsResult.unmount();

    window.history.pushState({}, '', '/admin/community/moderation');
    const reportsResult = renderWithLocale(<AdminCommunity locale={locale} session={session} initialReports={reports} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`admin-community-report-${report.id}`)).toBeInTheDocument());
    expect(reportsResult.container.querySelector('[data-screen-id="ADM-29"]')).not.toBeNull();
    reportsResult.unmount();
  });

  it('passes strict search and status filters to the post loader', async () => {
    window.history.pushState({}, '', '/admin/community');
    const loadPosts = vi.fn(async () => posts);
    renderWithLocale(<AdminCommunity locale="en" session={session} loadPosts={loadPosts} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`admin-community-post-${post.id}`)).toBeInTheDocument());
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'community' } });
    fireEvent.change(screen.getByLabelText(getAdminCommunityCopy('en').status), { target: { value: 'published' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(loadPosts).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'community', status: 'published', page: 1, limit: 20 }), expect.any(AbortSignal)));
  });

  it('requires a reason and sends the server version before resolving a report', async () => {
    window.history.pushState({}, '', '/admin/community/moderation');
    const resolveReport = vi.fn(async () => ({ ...report, status: 'resolved' as const, version: 3, resolutionReason: 'Moderation decision recorded.' }));
    renderWithLocale(<AdminCommunity locale="en" session={session} initialReports={reports} resolveReport={resolveReport} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`admin-community-report-${report.id}`)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: getAdminCommunityCopy('en').action.review }));
    fireEvent.submit(screen.getByTestId('admin-community-resolution').querySelector('form')!);
    expect(resolveReport).not.toHaveBeenCalled();
    expect(screen.getByText(getAdminCommunityCopy('en').reasonRequired)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(getAdminCommunityCopy('en').reason), { target: { value: 'Moderation decision recorded.' } });
    fireEvent.click(screen.getByRole('button', { name: getAdminCommunityCopy('en').confirm }));
    await waitFor(() => expect(resolveReport).toHaveBeenCalledWith(report.id, { version: 2, action: 'resolve', reason: 'Moderation decision recorded.' }));
  });

  it('fails closed for a non-admin session without loading', async () => {
    window.history.pushState({}, '', '/admin/community');
    const loadPosts = vi.fn();
    renderWithLocale(<AdminCommunity locale="en" session={{ status: 'anonymous' }} loadPosts={loadPosts} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminCommunityCopy('en').states.permission.title })).toBeInTheDocument());
    expect(loadPosts).not.toHaveBeenCalled();
  });
});
