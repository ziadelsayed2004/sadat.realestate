import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { type ViewingData, viewingDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { getProviderCopy } from '../src/features/provider/copy.ts';
import {
  createProviderViewingMutationApi,
  getProviderViewingsCopy,
  loadProviderViewings,
  ProviderViewings,
  type ProviderViewingMutationApi,
  type ProviderViewingsData
} from '../src/features/provider/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const seekerId = 'cccccccccccccccccccccccc';
const viewingId = 'dddddddddddddddddddddddd';

function viewing(overrides: Partial<ViewingData> = {}): ViewingData {
  return viewingDataSchema.parse({
    id: viewingId,
    propertyId,
    seekerId,
    providerId,
    status: 'requested',
    requestedAt: '2026-08-28T10:00:00.000Z',
    timezone: 'Africa/Cairo',
    note: 'Customer requested a morning appointment.',
    version: 2,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    ...overrides
  });
}

const row = viewing();
const data: ProviderViewingsData = { items: [row], page: 1, limit: 5, total: 1 };
const session = { status: 'authenticated' as const, role: 'provider' as const };

function success(payload: unknown, requestId: string): Response {
  return new Response(JSON.stringify({ data: payload, meta: { requestId } }), { status: 200 });
}

describe('Provider viewing appointments', () => {
  it('loads provider viewings with the strict status query and authorization', async () => {
    const requests: Array<{ url: string; method: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({ url: `${url.pathname}${url.search}`, method: init?.method ?? 'GET', authorization: new Headers(init?.headers).get('authorization') });
        return success(data, 'provider-viewings-list');
      }
    });

    await expect(loadProviderViewings({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider.viewings.token' }, query: { status: 'confirmed', page: 2, limit: 5 } })).resolves.toEqual(data);
    const url = new URL(requests[0]?.url ?? '', 'http://sadat-real-estate.local');
    expect(requests[0]).toMatchObject({ method: 'GET', authorization: 'Bearer provider.viewings.token' });
    expect(Object.fromEntries(url.searchParams)).toEqual({ status: 'confirmed', page: '2', limit: '5' });
  });

  it.each([{ page: 0, limit: 5 }, { page: 1, limit: 101 }])('rejects invalid viewing pagination before network access: %o', async query => {
    let calls = 0;
    const client = new ApiClient({ fetcher: async () => { calls += 1; return success(data, 'provider-viewings-invalid-pagination'); } });
    await expect(loadProviderViewings({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider.viewings.token' }, query })).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it('uses the implemented transition route with strict versioned input and provider authorization', async () => {
    const requests: Array<{ url: string; method: string; body: unknown; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        requests.push({ url: new URL(String(input), 'http://sadat-real-estate.local').pathname, method: init?.method ?? 'GET', body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown, authorization: new Headers(init?.headers).get('authorization') });
        return success(row, `provider-viewings-${requests.length}`);
      }
    });
    const api = createProviderViewingMutationApi({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider.viewings.token' } });
    await api.transition(viewingId, { action: 'confirm', expectedVersion: 2 });
    expect(requests).toEqual([{ url: `/api/v1/provider/viewings/${viewingId}/transitions`, method: 'POST', body: { action: 'confirm', expectedVersion: 2 }, authorization: 'Bearer provider.viewings.token' }]);
  });

  it.each(['ar', 'en',] as const)('renders safe provider projections and direction for %s', async locale => {
    const load = vi.fn(async () => data);
    const result = renderWithLocale(<ProviderViewings locale={locale} session={session} load={load} />, { locale });
    const copy = getProviderViewingsCopy(locale);
    await waitFor(() => expect(screen.getByTestId('provider-viewings-count')).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    const rowElement = screen.getByTestId('provider-viewing-row');
    expect(within(rowElement).getByText(copy.statuses.requested)).toBeInTheDocument();
    expect(within(rowElement).getByText(/Customer reference|مرجع العميل|客户参考/u)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-18"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain(seekerId);
    expect(result.container.textContent).not.toContain(propertyId);
    expect(result.container.textContent).not.toMatch(/assignedTo|internalNotes|auditData|storageKey|accessToken|refreshToken/u);
    result.unmount();
  });

  it('presents only contract-defined actions and submits the current version', async () => {
    const load = vi.fn(async () => data);
    const mutations: ProviderViewingMutationApi = { transition: vi.fn(async () => viewing({ status: 'confirmed', version: 3 })) };
    renderWithLocale(<ProviderViewings locale="en" session={session} load={load} mutations={mutations} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-viewing-row')).toBeInTheDocument());
    const propertyLabel = getProviderViewingsCopy('en').propertyReference;
    fireEvent.click(screen.getByRole('button', { name: `Confirm: ${propertyLabel} …${propertyId.slice(-6)}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Save change' }));
    await waitFor(() => expect(mutations.transition).toHaveBeenCalledWith(viewingId, { action: 'confirm', expectedVersion: 2 }));
    expect(screen.queryByRole('button', { name: `Mark complete: ${propertyLabel} …${propertyId.slice(-6)}` })).not.toBeInTheDocument();
  });

  it('validates reschedule and cancellation inputs before mutation', async () => {
    const load = vi.fn(async () => data);
    const mutations: ProviderViewingMutationApi = { transition: vi.fn(async () => row) };
    renderWithLocale(<ProviderViewings locale="en" session={session} load={load} mutations={mutations} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-viewing-row')).toBeInTheDocument());
    const propertyLabel = getProviderViewingsCopy('en').propertyReference;
    fireEvent.click(screen.getByRole('button', { name: `Reschedule: ${propertyLabel} …${propertyId.slice(-6)}` }));
    fireEvent.change(screen.getByLabelText('Viewing time'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save change' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Review the required fields before saving.');
    expect(mutations.transition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: `Cancel: ${propertyLabel} …${propertyId.slice(-6)}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Save change' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Review the required fields before saving.');
    expect(mutations.transition).not.toHaveBeenCalled();
  });

  it('fails closed for anonymous sessions and renders an honest empty state', async () => {
    const load = vi.fn(async () => ({ items: [], page: 1, limit: 5, total: 0 }));
    renderWithLocale(<ProviderViewings locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderCopy('en').states.permission.title })).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();

    renderWithLocale(<ProviderViewings locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getProviderViewingsCopy('en').emptyTitle, level: 3 })).toBeInTheDocument());
    expect(screen.getByText(getProviderViewingsCopy('en').emptyBody)).toBeInTheDocument();
  });
});
