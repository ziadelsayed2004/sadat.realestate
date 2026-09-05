import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { requestDataSchema, type RequestData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { getProviderCopy } from '../src/features/provider/copy.ts';
import {
  createProviderCustomerRequestMutationApi,
  getProviderCustomerRequestsCopy,
  loadProviderCustomerRequests,
  ProviderCustomerRequests,
  type ProviderCustomerRequestMutationApi,
  type ProviderCustomerRequestsData,
  type ProviderCustomerRequestsQuery
} from '../src/features/provider/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const requestId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function request(overrides: Partial<RequestData> = {}): RequestData {
  return requestDataSchema.parse({
    id: requestId,
    type: 'provider_customer',
    source: 'provider',
    providerId,
    payload: { firstName: 'Mona', lastName: 'Hassan', phone: '01012345678', email: 'mona@example.com', message: 'Interested in a property' },
    status: 'new',
    version: 2,
    availableActions: ['contact', 'cancel'],
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    ...overrides
  });
}

const row = request();
const data: ProviderCustomerRequestsData = { items: [row], page: 1, limit: 5, total: 1 };
const session = { status: 'authenticated' as const, role: 'provider' as const };

function success(payload: unknown, requestIdValue: string, meta: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data: payload, meta: { requestId: requestIdValue, ...meta } }), { status: 200 });
}

describe('Provider customer requests', () => {
  it.each(['ar', 'en'] as const)('renders the safe related property name in %s', async locale => {
    const property = { id: 'cccccccccccccccccccccccc', slug: 'local-apartment', kind: 'property' as const, name: { ar: 'شقة السادات', en: 'Sadat apartment' }, transactionType: 'sale' as const };
    const load = vi.fn().mockResolvedValue({ ...data, items: [request({ property })] });
    renderWithLocale(<ProviderCustomerRequests locale={locale} session={session} load={load} />, { locale });
    expect(await screen.findByText(property.name[locale])).toBeInTheDocument();
  });
  it('loads provider-owned requests with strict list scope and authorization', async () => {
    const requests: Array<{ url: string; method: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({ url: `${url.pathname}${url.search}`, method: init?.method ?? 'GET', authorization: new Headers(init?.headers).get('authorization') });
        return success(data, 'provider-requests-list');
      }
    });

    await expect(loadProviderCustomerRequests({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider.requests.token' }, query: { status: 'new', search: 'Mona', page: 2, limit: 5 } })).resolves.toEqual(data);
    const url = new URL(requests[0]?.url ?? '', 'http://sadat-real-estate.local');
    expect(requests[0]).toMatchObject({ method: 'GET', authorization: 'Bearer provider.requests.token' });
    expect(Object.fromEntries(url.searchParams)).toEqual({ source: 'provider', type: 'provider_customer', status: 'new', search: 'Mona', page: '2', limit: '5' });
  });

  it.each([{ page: 0 }, { page: 1, limit: 101 }])('rejects invalid request pagination before network access: %o', async query => {
    let calls = 0;
    const client = new ApiClient({ fetcher: async () => { calls += 1; return success(data, 'provider-requests-invalid-pagination'); } });
    await expect(loadProviderCustomerRequests({ apiClient: client, query })).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it('uses the implemented create and transition routes with contract validation', async () => {
    const requests: Array<{ url: string; method: string; body: unknown; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        requests.push({ url: new URL(String(input), 'http://sadat-real-estate.local').pathname, method: init?.method ?? 'GET', body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown, authorization: new Headers(init?.headers).get('authorization') });
        return success(row, `provider-requests-${requests.length}`);
      }
    });
    const api = createProviderCustomerRequestMutationApi({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider.requests.token' } });
    await api.create({ firstName: 'Mona', lastName: 'Hassan', phone: '01012345678', email: 'mona@example.com', message: 'Hello' });
    await api.transition(requestId, { transition: 'contact', expectedVersion: 2 });
    expect(requests.map(item => [item.method, item.url])).toEqual([
      ['POST', '/api/v1/provider/customer-requests'],
      ['POST', `/api/v1/provider/customer-requests/${requestId}/transitions`]
    ]);
    expect(requests.every(item => item.authorization === 'Bearer provider.requests.token')).toBe(true);
    expect(requests[0]?.body).toEqual({ firstName: 'Mona', lastName: 'Hassan', phone: '01012345678', email: 'mona@example.com', message: 'Hello' });
    expect(requests[1]?.body).toEqual({ transition: 'contact', expectedVersion: 2 });
  });

  it('masks customer contact details in the Provider list projection', async () => {
    const load = vi.fn(async (_query: ProviderCustomerRequestsQuery) => data);
    renderWithLocale(<ProviderCustomerRequests locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-customer-requests-count')).toBeInTheDocument());
    const rowElement = screen.getByTestId(`provider-customer-request-${requestId}`);
    expect(within(rowElement).getByText('010••••678')).toBeInTheDocument();
    expect(within(rowElement).getByText('m•••@example.com')).toBeInTheDocument();
    expect(rowElement).not.toHaveTextContent('01012345678');
    expect(rowElement).not.toHaveTextContent('mona@example.com');
  });

  it('opens the Provider create form from the canonical create deep link', async () => {
    const originalUrl = window.location.href;
    window.history.pushState({}, '', '/provider/customer-requests?create=1');
    try {
      const load = vi.fn(async (_query: ProviderCustomerRequestsQuery) => data);
      renderWithLocale(<ProviderCustomerRequests locale="en" session={session} load={load} />, { locale: 'en' });
      await waitFor(() => expect(screen.getByTestId('provider-customer-requests-count')).toBeInTheDocument());
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog').closest('[data-screen-id="PRV-17"]')).not.toBeNull();
    } finally {
      window.history.replaceState({}, '', originalUrl);
    }
  });

  it('does not fetch a draft status filter until Apply is submitted', async () => {
    const observedQueries: ProviderCustomerRequestsQuery[] = [];
    const load = vi.fn(async (query: ProviderCustomerRequestsQuery) => {
      observedQueries.push(query);
      return data;
    });
    const copy = getProviderCustomerRequestsCopy('en');
    renderWithLocale(<ProviderCustomerRequests locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-customer-requests-count')).toBeInTheDocument());
    expect(observedQueries).toHaveLength(1);

    fireEvent.change(screen.getByLabelText(copy.statusLabel), { target: { value: 'contacted' } });
    expect(observedQueries).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: copy.apply }));
    await waitFor(() => expect(observedQueries.at(-1)).toMatchObject({ status: 'contacted' }));
  });

  it.each(['ar', 'en',] as const)('renders safe provider projections and direction for %s', async locale => {
    const load = vi.fn(async (_query: ProviderCustomerRequestsQuery) => data);
    const result = renderWithLocale(<ProviderCustomerRequests locale={locale} session={session} load={load} />, { locale });
    const copy = getProviderCustomerRequestsCopy(locale);
    await waitFor(() => expect(screen.getByTestId('provider-customer-requests-count')).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    const rowElement = screen.getByTestId(`provider-customer-request-${requestId}`);
    expect(within(rowElement).getByText('Mona Hassan')).toBeInTheDocument();
    expect(within(rowElement).getByText(copy.statuses.new)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-16"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain(providerId);
    expect(result.container.textContent).not.toMatch(/assignedTo|internalNotes|auditData|storageKey|accessToken|refreshToken/u);
    result.unmount();
  });

  it('creates a customer request from the PRV-17 modal and uses only server actions for transitions', async () => {
    const load = vi.fn(async (_query: ProviderCustomerRequestsQuery) => data);
    const mutations: ProviderCustomerRequestMutationApi = {
      create: vi.fn(async () => row),
      transition: vi.fn(async () => request({ status: 'contacted', availableActions: ['schedule'] }))
    };
    renderWithLocale(<ProviderCustomerRequests locale="en" session={session} load={load} mutations={mutations} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`provider-customer-request-${requestId}`)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add customer request' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog').closest('[data-screen-id="PRV-17"]')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Customer' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '01198765432' } });
    fireEvent.change(screen.getByLabelText('Email (Optional)'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save request' }));
    await waitFor(() => expect(mutations.create).toHaveBeenCalledWith({ firstName: 'New', lastName: 'Customer', phone: '01198765432', email: 'new@example.com' }));

    await waitFor(() => expect(screen.getByTestId(`provider-customer-request-${requestId}`)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Mark contacted: Mona Hassan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm action' }));
    await waitFor(() => expect(mutations.transition).toHaveBeenCalledWith(requestId, { transition: 'contact', expectedVersion: 2 }));
  });

  it('requires a reason for a reason-bearing transition and fails closed for anonymous sessions', async () => {
    const load = vi.fn(async (_query: ProviderCustomerRequestsQuery) => data);
    const mutations: ProviderCustomerRequestMutationApi = { create: vi.fn(async () => row), transition: vi.fn(async () => row) };
    renderWithLocale(<ProviderCustomerRequests locale="en" session={session} load={load} mutations={mutations} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`provider-customer-request-${requestId}`)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request: Mona Hassan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm action' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid reason for this action.');
    expect(mutations.transition).not.toHaveBeenCalled();

    renderWithLocale(<ProviderCustomerRequests locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderCopy('en').states.permission.title })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('renders an honest empty state without inventing records', async () => {
    const load = vi.fn(async (_query: ProviderCustomerRequestsQuery) => ({ items: [], page: 1, limit: 5, total: 0 }));
    renderWithLocale(<ProviderCustomerRequests locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getProviderCustomerRequestsCopy('en').emptyTitle, level: 3 })).toBeInTheDocument());
    expect(screen.getByText(getProviderCustomerRequestsCopy('en').emptyBody)).toBeInTheDocument();
  });
});
