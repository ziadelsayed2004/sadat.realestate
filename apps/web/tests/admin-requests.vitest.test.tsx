import { fireEvent, screen, waitFor } from '@testing-library/react';
import { requestDataSchema, requestIssueListDataSchema, requestListDataSchema, viewingDataSchema, viewingListDataSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { RequestPropertyLinks } from '../src/features/admin_requests/property-links.tsx';
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
import { AdminAttentionContext } from '../src/features/routing/admin-attention.tsx';

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
  capabilities: { assign: true, note: true },
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
  it.each(['ar', 'en'] as const)('filters types and keeps authoritative unread badges until details open in %s', async locale => {
    window.history.replaceState({}, '', '/admin/requests');
    const loadRequests = vi.fn().mockResolvedValue({ ...requestList, total: 40 });
    const markRead = vi.fn().mockResolvedValue(undefined);
    const copy = getAdminRequestsCopy(locale);
    renderWithLocale(<AdminAttentionContext.Provider value={{ attention: { counts: { 'contact-requests': 2, 'viewing-requests': 3, 'search-requests': 4, 'customer-requests': 5 }, total: 14 }, unread: 0, ready: true, refresh: vi.fn(), markRead }}><AdminRequests locale={locale} session={session} initialRequests={requestList} loadRequests={loadRequests} /></AdminAttentionContext.Provider>, { locale });
    expect(screen.getByTestId('admin-attention-filter-requests')).toHaveTextContent(new Intl.NumberFormat(locale).format(14));
    for (const [type, queue, count] of [['contact', 'contact-requests', 2], ['property_search', 'search-requests', 4], ['provider_customer', 'customer-requests', 5]] as const) {
      fireEvent.click(screen.getByTestId(`request-type-${type}`));
      await waitFor(() => expect(loadRequests).toHaveBeenLastCalledWith({ page: 1, limit: 20, type }, expect.any(AbortSignal)));
      expect(screen.getByTestId(`request-type-${type}`)).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId(`admin-attention-filter-${queue}`)).toHaveTextContent(new Intl.NumberFormat(locale).format(count));
      fireEvent.click(screen.getByRole('button', { name: copy.next }));
      await waitFor(() => expect(loadRequests).toHaveBeenLastCalledWith({ page: 2, limit: 20, type }, expect.any(AbortSignal)));
      fireEvent.click(screen.getByRole('button', { name: copy.clear }));
      await waitFor(() => expect(loadRequests).toHaveBeenLastCalledWith({ page: 1, limit: 20, type }, expect.any(AbortSignal)));
    }
    expect(markRead).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('request-type-all'));
    await waitFor(() => expect(loadRequests).toHaveBeenLastCalledWith({ page: 1, limit: 20 }, expect.any(AbortSignal)));
    fireEvent.click(screen.getByTestId(`admin-request-${request.id}`).querySelector('button')!);
    await waitFor(() => expect(markRead).toHaveBeenCalledWith({ queueKey: 'contact-requests', itemId: request.id }));
  });

  it('uses real viewings with their own status filters inside all requests and returns to the normal list', async () => {
    window.history.replaceState({}, '', '/admin/requests');
    const loadRequests = vi.fn().mockResolvedValue(requestList);
    const loadViewings = vi.fn().mockResolvedValue(viewingList);
    renderWithLocale(<AdminRequests locale="en" session={session} initialRequests={requestList} loadRequests={loadRequests} loadViewings={loadViewings} />, { locale: 'en' });
    fireEvent.click(screen.getByTestId('request-type-viewing'));
    expect(await screen.findByTestId(`admin-viewing-${viewing.id}`)).toBeVisible();
    expect(loadViewings).toHaveBeenLastCalledWith({ page: 1, limit: 20 }, expect.any(AbortSignal));
    expect(loadRequests).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: getAdminRequestsCopy('en').viewingStatusLabel.cancelled }));
    await waitFor(() => expect(loadViewings).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: 'cancelled' }, expect.any(AbortSignal)));
    fireEvent.click(screen.getByTestId('request-type-contact'));
    expect(await screen.findByTestId(`admin-request-${request.id}`)).toBeVisible();
    expect(loadRequests).toHaveBeenLastCalledWith({ page: 1, limit: 20, type: 'contact' }, expect.any(AbortSignal));
    expect(screen.queryByTestId(`admin-viewing-${viewing.id}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('request-type-all')).toBeVisible();
  });

  it('keeps type filters available on empty or denied results and ignores stale responses after switching', async () => {
    window.history.replaceState({}, '', '/admin/requests');
    let finishOld!: (data: typeof requestList) => void;
    const loadRequests = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValue({ ...requestList, items: [], total: 0 });
    const loadViewings = vi.fn().mockRejectedValue(new ApiClientError('Denied', { code: 'HTTP_ERROR', status: 403 }));
    renderWithLocale(<AdminRequests locale="en" session={session} initialRequests={requestList} loadRequests={loadRequests} loadViewings={loadViewings} />, { locale: 'en' });
    fireEvent.click(screen.getByTestId('request-type-contact'));
    fireEvent.click(screen.getByTestId('request-type-property_search'));
    expect(await screen.findByText(getAdminRequestsCopy('en').states.empty.title)).toBeVisible();
    finishOld(requestList);
    await waitFor(() => expect(screen.queryByTestId(`admin-request-${request.id}`)).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId('request-type-viewing'));
    expect(await screen.findByText(getAdminRequestsCopy('en').states.permission.title)).toBeVisible();
    expect(screen.getByTestId('request-type-all')).toBeVisible();
  });

  it.each(['ar', 'en'] as const)('requires a customer-facing explanation when requesting information in %s', async locale => {
    window.history.replaceState({}, '', `/admin/contact-requests?lang=${locale}`);
    const reviewed = requestDataSchema.parse({ ...request, status: 'under_review', availableActions: ['needs_information'], customerUpdates: [{ status: 'under_review', authorRole: 'seeker', message: 'My budget is 2 million', createdAt: request.updatedAt }] });
    const transition = vi.fn().mockResolvedValue({ ...reviewed, status: 'needs_information', version: 3, availableActions: ['start_review'] });
    const copy = getAdminRequestsCopy(locale);
    renderWithLocale(<AdminRequests locale={locale} session={session} initialRequests={{ ...requestList, items: [reviewed] }} transition={transition} />, { locale });
    fireEvent.click(screen.getByRole('button', { name: copy.view }));
    expect(screen.getByText('My budget is 2 million')).toBeVisible();
    fireEvent.change(screen.getByLabelText(copy.transitionReason), { target: { value: 'More information needed' } });
    fireEvent.click(screen.getByRole('button', { name: copy.saveTransition }));
    expect(transition).not.toHaveBeenCalled();
    expect(screen.getByLabelText(copy.customerMessage)).toHaveFocus();
    fireEvent.change(screen.getByLabelText(copy.customerMessage), { target: { value: 'Which area do you prefer?' } });
    fireEvent.click(screen.getByRole('button', { name: copy.saveTransition }));
    await waitFor(() => expect(transition).toHaveBeenCalledWith(request.id, { transition: 'needs_information', reason: 'More information needed', customerMessage: 'Which area do you prefer?', expectedVersion: 2 }, undefined));
  });

  it.each(['ar', 'en'] as const)('accepts a reviewed contact request with a reason and updates its displayed state in %s', async locale => {
    window.history.replaceState({}, '', `/admin/contact-requests?lang=${locale}`);
    const reviewed = requestDataSchema.parse({ ...request, status: 'under_review', version: 3, availableActions: ['contact', 'start_progress'] });
    const accepted = requestDataSchema.parse({ ...reviewed, status: 'in_progress', version: 4, availableActions: ['resolve', 'needs_information', 'cancel'] });
    const transition = vi.fn().mockResolvedValue(accepted);
    const copy = getAdminRequestsCopy(locale);
    renderWithLocale(<AdminRequests locale={locale} session={session} initialRequests={{ ...requestList, items: [reviewed] }} transition={transition} />, { locale });
    fireEvent.click(screen.getByRole('button', { name: copy.view }));
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'قبول طلب التواصل وبدء المتابعة' : 'Accept contact request and start follow-up' }));
    expect(transition).not.toHaveBeenCalled();
    expect(screen.getByLabelText(copy.transitionReason)).toHaveFocus();
    expect(screen.getByLabelText(copy.transition)).toHaveValue('start_progress');
    fireEvent.change(screen.getByLabelText(copy.transitionReason), { target: { value: 'Accept customer follow-up' } });
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'قبول الطلب وبدء المتابعة' : 'Accept and start follow-up' }));
    await waitFor(() => expect(transition).toHaveBeenCalledWith(request.id, { transition: 'start_progress', expectedVersion: 3, reason: 'Accept customer follow-up' }, undefined));
    await waitFor(() => expect(screen.queryByRole('button', { name: locale === 'ar' ? 'قبول طلب التواصل وبدء المتابعة' : 'Accept contact request and start follow-up' })).not.toBeInTheDocument());
    expect(screen.getByTestId('admin-request-detail')).toHaveTextContent(copy.statusLabel.in_progress);
  });

  it.each(['ar', 'en'] as const)('links directly to the published property and its administrative record in %s', locale => {
    const property = { id: request.propertyId!, slug: 'requested-property', kind: 'property' as const, name: { ar: 'عقار العميل', en: 'Customer property' }, transactionType: 'sale' as const, sourceType: 'individual_broker' as const, publicCode: 'SDT-1234' };
    const copy = getAdminRequestsCopy(locale);
    renderWithLocale(<RequestPropertyLinks locale={locale} request={{ ...request, property }} />, { locale });
    expect(screen.getByRole('link', { name: copy.openProperty })).toHaveAttribute('href', `/properties/requested-property?lang=${locale}`);
    expect(screen.getByRole('link', { name: copy.manageProperty })).toHaveAttribute('href', `/admin/properties/${request.propertyId}?lang=${locale}`);
  });

  it('refreshes a conflicting request without losing either message field and then saves the current version', async () => {
    window.history.pushState({}, '', '/admin/contact-requests');
    const copy = getAdminRequestsCopy('en');
    const next = { ...request, status: 'under_review' as const, version: 12, availableActions: ['contact' as const] };
    const loadRequest = vi.fn().mockResolvedValue(next);
    const transition = vi.fn().mockRejectedValueOnce(new ApiClientError('Conflict', { code: 'HTTP_ERROR', status: 409 })).mockResolvedValueOnce({ ...next, status: 'contacted', version: 13, availableActions: ['resolve'] });
    renderWithLocale(<AdminRequests locale="en" session={session} initialRequests={requestList} loadRequest={loadRequest} transition={transition} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: copy.view }));
    fireEvent.change(screen.getByLabelText(copy.transitionReason), { target: { value: 'Private audit reason' } });
    fireEvent.change(screen.getByLabelText(copy.customerMessage), { target: { value: 'We will call tomorrow' } });
    fireEvent.click(screen.getByRole('button', { name: copy.saveTransition }));
    expect(await screen.findByText(copy.conflictHint)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.reloadDetails }));
    expect(await screen.findByText(copy.reloadHint)).toBeInTheDocument();
    expect(loadRequest).toHaveBeenCalledWith(request.id);
    expect(screen.getByLabelText(copy.transitionReason)).toHaveValue('Private audit reason');
    expect(screen.getByLabelText(copy.customerMessage)).toHaveValue('We will call tomorrow');
    fireEvent.click(screen.getByRole('button', { name: copy.saveTransition }));
    await waitFor(() => expect(transition).toHaveBeenLastCalledWith(request.id, { transition: 'contact', expectedVersion: 12, reason: 'Private audit reason', customerMessage: 'We will call tomorrow' }, undefined));
  });

  it('opens viewing details with the property, customer note and Egypt time', () => {
    window.history.pushState({}, '', '/admin/viewing-requests');
    const enriched = viewingDataSchema.parse({ ...viewing, customerName: 'Example Customer', note: 'Call before arrival', property: { id: viewing.propertyId, slug: 'requested-property', kind: 'property', transactionType: 'sale', name: { en: 'Requested property' }, publicCode: 'SDT-1234' } });
    renderWithLocale(<AdminRequests locale="en" session={session} initialViewings={{ ...viewingList, items: [enriched] }} />, { locale: 'en' });
    expect(screen.getByRole('link', { name: 'Requested property' })).toHaveAttribute('href', '/properties/requested-property?lang=en');
    fireEvent.click(screen.getByRole('button', { name: 'Details and action' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Call before arrival');
    expect(screen.getByRole('dialog')).toHaveTextContent('All appointments use Egypt time');
  });

  it('continues review, contact and resolution in the same dialog with current actions and version', async () => {
    window.history.pushState({}, '', '/admin/contact-requests');
    const copy = getAdminRequestsCopy('en');
    const transition = vi.fn()
      .mockResolvedValueOnce({ ...request, status: 'under_review', version: 3, availableActions: ['contact', 'needs_information', 'cancel'] })
      .mockResolvedValueOnce({ ...request, status: 'contacted', version: 4, availableActions: ['schedule', 'start_progress', 'resolve', 'cancel'] })
      .mockResolvedValueOnce({ ...request, status: 'resolved', version: 5, availableActions: ['reopen', 'close'] });
    renderWithLocale(<AdminRequests locale="en" session={session} initialRequests={requestList} transition={transition} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: copy.view }));
    expect(screen.getAllByRole('link', { name: copy.manageProperty })[0]).toHaveAttribute('href', `/admin/properties/${request.propertyId}?lang=en`);
    for (const [index, action] of ['start_review', 'contact', 'resolve'].entries()) {
      if (action === 'resolve') fireEvent.change(screen.getByLabelText(copy.transition), { target: { value: action } });
      fireEvent.change(screen.getByLabelText(copy.transitionReason), { target: { value: 'Private audit reason' } });
      fireEvent.change(screen.getByLabelText(copy.customerMessage), { target: { value: 'Your request is being followed up' } });
      fireEvent.click(screen.getByRole('button', { name: copy.saveTransition }));
      await waitFor(() => expect(transition).toHaveBeenNthCalledWith(index + 1, request.id, { transition: action, expectedVersion: index + 2, reason: 'Private audit reason', customerMessage: 'Your request is being followed up' }, undefined));
      await waitFor(() => expect(screen.getByLabelText(copy.transitionReason)).toHaveValue(''));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }
    expect(screen.getByLabelText(copy.transition)).toHaveValue('reopen');
  });

  it('renews an expired session once before saving, using the new authorization header', async () => {
    let header = 'Bearer expired.requests.token';
    const refresh = vi.fn(async () => { header = 'Bearer renewed.requests.token'; });
    const fetcher = vi.fn(async (_input, init) => new Headers(init?.headers).get('authorization') === header && header.includes('renewed')
      ? envelope(request) : new Response(JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'expired-test' } }), { status: 401 }));
    await transitionAdminRequest(request.id, { transition: 'start_review', reason: 'Begin review', expectedVersion: request.version }, { apiClient: new ApiClient({ fetcher }), authorization: { getAuthorizationHeader: () => header, refresh } });
    expect(refresh).toHaveBeenCalledTimes(1); expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])('opens overdue details in a dialog (deep link: %s)', async deepLink => {
    window.history.pushState({}, '', `/admin/overdue-requests${deepLink ? `?requestId=${request.id}` : ''}`);
    const loadRequest = vi.fn();
    const result = renderWithLocale(<AdminRequests locale="en" session={session} initialOverdue={{ items: [{ request, overdueBySeconds: 120 }], page: 1, limit: 20, total: 1 }} loadRequest={loadRequest} />, { locale: 'en' });
    const trigger = screen.getByRole('button', { name: getAdminRequestsCopy('en').view });
    if (!deepLink) { trigger.focus(); fireEvent.click(trigger); }
    expect(await screen.findByRole('dialog', { name: getAdminRequestsCopy('en').details })).toBeVisible();
    expect(screen.getByTestId('admin-request-detail')).toBeInTheDocument();
    expect(loadRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy('en').closeDetails }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('requestId');
    if (!deepLink) expect(trigger).toHaveFocus();
    result.unmount();
  });

  it('isolates detail loading failures from the overdue list and allows retry', async () => {
    window.history.pushState({}, '', `/admin/overdue-requests?requestId=${request.id}`);
    const loadRequest = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(request);
    const result = renderWithLocale(<AdminRequests locale="en" session={session} initialOverdue={{ items: [], page: 1, limit: 20, total: 0 }} loadRequest={loadRequest} />, { locale: 'en' });
    await waitFor(() => expect(loadRequest).toHaveBeenCalledTimes(1));
    await screen.findByRole('button', { name: getAdminRequestsCopy('en').retry });
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy('en').retry }));
    expect(await screen.findByTestId('admin-request-detail')).toBeInTheDocument();
    expect(loadRequest).toHaveBeenCalledTimes(2);
    result.unmount();
  });
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
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'عرض التفاصيل' : getAdminRequestsCopy(locale).view }));
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
    expect(transition).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(getAdminRequestsCopy('en').transitionReason), { target: { value: 'Begin customer review' } });
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy('en').saveTransition }));
    await waitFor(() => expect(transition).toHaveBeenCalledWith(request.id, { transition: 'start_review', expectedVersion: 2, reason: 'Begin customer review' }, undefined));
    expect(screen.getByText(getAdminRequestsCopy('en').noActions)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('fails closed for a non-admin session without calling a loader', async () => {
    const load = vi.fn();
    renderWithLocale(<AdminRequests locale="en" session={{ status: 'anonymous' }} loadRequests={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminRequestsCopy('en').states.permission.title })).toBeInTheDocument());
    expect(load).not.toHaveBeenCalled();
  });

  it('hides request mutation controls omitted by the server permission projection', () => {
    window.history.pushState({}, '', '/admin/requests');
    const viewOnlyRequest = requestDataSchema.parse({ ...request, availableActions: [], capabilities: { assign: false, note: false } });
    const viewOnlyList = requestListDataSchema.parse({ items: [viewOnlyRequest], page: 1, limit: 20, total: 1 });
    renderWithLocale(<AdminRequests locale="en" session={session} initialRequests={viewOnlyList} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: getAdminRequestsCopy('en').view }));
    expect(screen.getByText(getAdminRequestsCopy('en').noActions)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: getAdminRequestsCopy('en').saveTransition })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: getAdminRequestsCopy('en').saveAssignment })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: getAdminRequestsCopy('en').addNote })).not.toBeInTheDocument();
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
