import { screen, waitFor } from '@testing-library/react';
import { requestDataSchema, requestListDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { SeekerRequests, createSeekerRequestTransition, getSeekerRequestsCopy, loadSeekerRequest, loadSeekerRequests } from '../src/features/seeker/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const request = requestDataSchema.parse({
  id: '4123456789abcdef01234567',
  type: 'contact',
  source: 'seeker',
  seekerId: '0123456789abcdef01234567',
  propertyId: '2123456789abcdef01234567',
  status: 'under_review',
  payload: { message: 'Please call me', propertyTypes: ['apartment', 'duplex'], minBudget: 500000, maxBudget: 2500000, minBedrooms: 2, maxBedrooms: 4, note: 'Finished unit only' },
  version: 0,
  availableActions: ['cancel'],
  createdAt: '2026-08-13T10:00:00.000Z',
  updatedAt: '2026-08-13T10:00:00.000Z'
});

const list = requestListDataSchema.parse({ items: [request], page: 1, limit: 5, total: 1 });
const session = { status: 'authenticated' as const, role: 'seeker' as const };

describe('Seeker requests', () => {
  it('loads list and detail routes through the implemented contracts with authorization and query parameters', async () => {
    const calls: Array<{ url: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        calls.push({ url: String(input), authorization: new Headers(init?.headers).get('authorization') });
        const body = String(input).includes('/4123456789abcdef01234567')
          ? { data: request, meta: { requestId: 'request-detail-test' } }
          : { data: list, meta: { requestId: 'request-list-test' } };
        return new Response(JSON.stringify(body), { status: 200 });
      }
    });
    const authorization = { getAuthorizationHeader: () => 'Bearer seeker.access.token' };

    await expect(loadSeekerRequests({ apiClient: client, authorization, query: { page: 2, limit: 5, type: 'contact' } })).resolves.toEqual(list);
    await expect(loadSeekerRequest(request.id, { apiClient: client, authorization })).resolves.toEqual(request);
    expect(calls).toEqual([
      { url: '/api/v1/seeker/requests?type=contact&page=2&limit=5', authorization: 'Bearer seeker.access.token' },
      { url: `/api/v1/seeker/requests/${request.id}`, authorization: 'Bearer seeker.access.token' }
    ]);
  });

  it('submits an owned cancellation through the strict versioned transition contract', async () => {
    let submitted: unknown;
    const client = new ApiClient({ fetcher: async (_input, init) => { submitted = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ data: { ...request, status: 'cancelled', version: 1, availableActions: [] }, meta: { requestId: 'cancel-test' } }), { status: 200 }); } });
    const cancel = createSeekerRequestTransition({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer seeker.access.token' } });
    await expect(cancel(request.id, { transition: 'cancel', reason: 'No longer needed', expectedVersion: 0 })).resolves.toMatchObject({ status: 'cancelled', version: 1 });
    expect(submitted).toEqual({ transition: 'cancel', reason: 'No longer needed', expectedVersion: 0 });
  });

  it.each(['ar', 'en',] as const)('renders the owned request list in the approved direction for %s', async locale => {
    const copy = getSeekerRequestsCopy(locale);
    const result = renderWithLocale(<SeekerRequests locale={locale} session={session} listLoad={async () => list} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`seeker-request-${request.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.list.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByText('REQ-4567')).toBeInTheDocument();
    expect(screen.getAllByText(copy.statuses.under_review).length).toBeGreaterThan(0);
    expect(result.container.querySelector('[data-screen-id="SEK-02"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain('assignedTo');
    expect(result.container.textContent).not.toContain('internalNotes');
    result.unmount();
  });

  it('renders under-review details and fails closed for anonymous sessions', async () => {
    const copy = getSeekerRequestsCopy('en');
    const result = renderWithLocale(<SeekerRequests locale="en" session={session} requestId={request.id} detailLoad={async () => request} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: new RegExp(copy.detail.title), level: 1 })).toBeInTheDocument());
    expect(result.container.querySelector('[data-screen-id="SEK-03"]')).not.toBeNull();
    expect(screen.getByText('Please call me')).toBeInTheDocument();
    expect(screen.getByText('Finished unit only')).toBeInTheDocument();
    expect(screen.getByText('apartment · duplex')).toBeInTheDocument();
    expect(screen.getByText(/500,000/)).toBeInTheDocument();
    expect(screen.getByText('2 – 4')).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('internalNotes');
    expect(result.container.textContent).not.toContain('2123456789abcdef01234567');
    result.unmount();

    renderWithLocale(<SeekerRequests locale="en" session={{ status: 'anonymous' }} listLoad={async () => list} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
  });
});
