import { fireEvent, screen, waitFor } from '@testing-library/react';
import { requestDataSchema, requestIssueListDataSchema, requestListDataSchema, viewingDataSchema, viewingListDataSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  AdminRequests,
  getAdminRequestsCopy,
  loadAdminOverdueRequests,
  loadAdminRequest,
  loadAdminRequestIssues,
  loadAdminRequests,
  loadAdminViewings,
  resolveAdminRequestIssue,
  transitionAdminRequest
} from '../src/features/admin_requests/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const request = requestDataSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  type: 'contact',
  source: 'seeker',
  seekerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  propertyId: 'cccccccccccccccccccccccc',
  status: 'new',
  payload: { message: 'Please contact me', propertyId: 'cccccccccccccccccccccccc', locale: 'en' },
  dueAt: '2026-08-20T10:00:00.000Z',
  version: 2,
  availableActions: ['start_review', 'contact'],
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z'
});
const viewing = viewingDataSchema.parse({
  id: 'dddddddddddddddddddddddd',
  propertyId: 'cccccccccccccccccccccccc',
  seekerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  status: 'confirmed',
  requestedAt: '2026-08-21T10:00:00.000Z',
  timezone: 'Africa/Cairo',
  version: 1,
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z'
});
const issue = {
  id: 'eeeeeeeeeeeeeeeeeeeeeeee',
  requestId: request.id,
  category: 'incorrect_data' as const,
  details: 'The request contains incorrect contact data.',
  status: 'open' as const,
  version: 1,
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z'
};
const requestList = requestListDataSchema.parse({ items: [request], page: 1, limit: 20, total: 1 });
const viewingList = viewingListDataSchema.parse({ items: [viewing], page: 1, limit: 20, total: 1 });
const issueList = requestIssueListDataSchema.parse({ items: [issue], page: 1, limit: 20, total: 1 });
const session = { status: 'authenticated' as const, role: 'admin' as const };
const authorization = { getAuthorizationHeader: () => 'Bearer admin.requests.test' };

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-requests-test', page: 1, limit: 20, total: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; query: string; authorization: string | null; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      const method = init?.method ?? 'GET';
      requests.push({ method, path: url.pathname, query: url.search, authorization: new Headers(init?.headers).get('authorization'), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown });
      if (method === 'POST' && url.pathname.includes('request-issues')) return envelope(issue);
      if (url.pathname === '/api/v1/admin/requests/overdue') return envelope({ items: [{ request, overdueBySeconds: 120 }], page: 1, limit: 20, total: 1 });
      if (url.pathname === '/api/v1/admin/viewings') return envelope(viewingList);
      if (url.pathname === '/api/v1/admin/request-issues') return envelope(issueList);
      if (url.pathname.includes('/api/v1/admin/requests/')) return envelope(request);
      return envelope(requestList);
    }
  });
}

describe('Admin request administration contracts and views', () => {
  it('uses the implemented request, overdue, viewing, and issue routes with strict schemas', async () => {
    const requests: Array<{ method: string; path: string; query: string; authorization: string | null; body: unknown }> = [];
    const client = apiClientFor(requests);
    await expect(loadAdminRequests({ apiClient: client, authorization, query: { type: 'contact', page: 2, limit: 10 } })).resolves.toEqual(requestList);
    await expect(loadAdminOverdueRequests({ apiClient: client, authorization })).resolves.toMatchObject({ items: [{ request, overdueBySeconds: 120 }] });
    await expect(loadAdminRequest(request.id, { apiClient: client, authorization })).resolves.toEqual(request);
    await expect(loadAdminViewings({ apiClient: client, authorization })).resolves.toEqual(viewingList);
    await expect(loadAdminRequestIssues({ apiClient: client, authorization })).resolves.toEqual(issueList);
    await expect(transitionAdminRequest(request.id, { transition: 'contact', expectedVersion: request.version }, { apiClient: client, authorization })).resolves.toEqual(request);
    await expect(resolveAdminRequestIssue(issue.id, { action: 'resolve', reason: 'Reviewed and corrected', expectedVersion: issue.version }, { apiClient: client, authorization })).resolves.toEqual(issue);
    expect(requests.every(item => item.authorization === 'Bearer admin.requests.test')).toBe(true);
    expect(requests.map(item => `${item.method} ${item.path}`)).toEqual([
      'GET /api/v1/admin/requests',
      'GET /api/v1/admin/requests/overdue',
      `GET /api/v1/admin/requests/${request.id}`,
      'GET /api/v1/admin/viewings',
      'GET /api/v1/admin/request-issues',
      `POST /api/v1/admin/requests/${request.id}/transitions`,
      `POST /api/v1/admin/request-issues/${issue.id}/resolve`
    ]);
    expect(requests[0]?.query).toContain('type=contact');
    expect(requests.at(-1)?.body).toEqual({ action: 'resolve', reason: 'Reviewed and corrected', expectedVersion: 1 });
  });

  it.each(['ar', 'en',] as const)('renders the request projection in the locale direction for %s', async (locale: SupportedLocale) => {
    window.history.pushState({}, '', '/admin/requests');
    const result = renderWithLocale(<AdminRequests locale={locale} session={session} initialRequests={requestList} />, { locale });
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-screen-id="ADM-18"]')).not.toBeNull();
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(screen.getByTestId(`admin-request-${request.id}`)).toBeInTheDocument();
    expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy(locale).view }));
    expect(screen.getByTestId('admin-request-detail')).toBeInTheDocument();
    result.unmount();
  });

  it('submits only server-available transitions and requires a valid reason for assignment', async () => {
    window.history.pushState({}, '', '/admin/requests');
    const nextRequest = requestDataSchema.parse({ ...request, status: 'contacted', version: 3, availableActions: [] });
    const transition = vi.fn(async () => nextRequest);
    const assign = vi.fn(async () => nextRequest);
    renderWithLocale(<AdminRequests locale="en" session={session} initialRequests={requestList} transition={transition} assign={assign} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy('en').view }));
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy('en').saveTransition }));
    await waitFor(() => expect(transition).toHaveBeenCalledWith(request.id, { transition: 'start_review', expectedVersion: 2 }, undefined));
    expect(screen.getByText(getAdminRequestsCopy('en').noActions)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('fails closed for a non-admin session without calling a loader', async () => {
    const load = vi.fn();
    renderWithLocale(<AdminRequests locale="en" session={{ status: 'anonymous' }} loadRequests={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminRequestsCopy('en').states.permission.title })).toBeInTheDocument());
    expect(load).not.toHaveBeenCalled();
  });

  it('renders and resolves an issue projection without exposing internal fields', async () => {
    window.history.pushState({}, '', '/admin/request-issues');
    const resolveIssue = vi.fn(async () => ({ ...issue, status: 'resolved' as const, resolutionReason: 'Reviewed' }));
    const result = renderWithLocale(<AdminRequests locale="en" session={session} initialIssues={issueList} resolveIssue={resolveIssue} />, { locale: 'en' });
    expect(screen.getByTestId(`admin-issue-${issue.id}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy('en').view }));
    fireEvent.change(screen.getByLabelText(getAdminRequestsCopy('en').resolutionReason), { target: { value: 'Reviewed and corrected' } });
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy('en').resolveIssue }));
    await waitFor(() => expect(resolveIssue).toHaveBeenCalledWith(issue.id, { action: 'resolve', reason: 'Reviewed and corrected', expectedVersion: 1 }, undefined));
    expect(result.container.textContent).not.toMatch(/internalNotes|auditData|storageKey|privateUrl/u);
  });
});
