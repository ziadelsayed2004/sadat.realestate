import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  adQuoteSchema,
  adRequestSchema,
  paymentProofDataSchema,
  providerAdRequestProjectionSchema,
  providerCommissionProjectionSchema,
  type ProviderAdRequestListData,
  type ProviderAdRequestProjection
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  createProviderAdvertisingMutationApi,
  getProviderAdvertisingCopy,
  loadProviderAdvertisingRequest,
  loadProviderAdvertisingRequests,
  loadProviderCommission,
  ProviderAdvertising,
  ProviderCommission,
  type ProviderAdvertisingMutationApi
} from '../src/features/provider/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const requestId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const quoteId = 'cccccccccccccccccccccccc';
const proofId = 'dddddddddddddddddddddddd';
const auth = { getAuthorizationHeader: () => 'Bearer provider.advertising.token' };
const session = { status: 'authenticated' as const, role: 'provider' as const };

function adRequest(overrides: Partial<ProviderAdRequestProjection> = {}): ProviderAdRequestProjection {
  return providerAdRequestProjectionSchema.parse({
    id: requestId,
    placementKey: 'homepage.hero',
    purpose: 'Promote an approved property campaign.',
    intervalStart: '2026-09-01T08:00:00.000Z',
    intervalEnd: '2026-09-30T08:00:00.000Z',
    status: 'quote_sent',
    version: 1,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    history: [{ status: 'quote_sent', version: 1, changedAt: '2026-08-18T09:00:00.000Z' }],
    quote: {
      id: quoteId,
      requestId,
      currency: 'EGP',
      lineItems: [{ description: 'Homepage hero placement', quantity: 1, unitAmountMinor: 250000 }],
      totalMinor: 250000,
      validUntil: '2026-08-28T08:00:00.000Z',
      terms: 'Administrative quote terms.',
      status: 'issued',
      version: 2,
      decisionHistory: [{ action: 'issued', version: 0, createdAt: '2026-08-18T09:00:00.000Z' }]
    },
    paymentProofs: [],
    ...overrides
  });
}

const detail = adRequest();
const data: ProviderAdRequestListData = { items: [detail], page: 1, limit: 5, total: 1 };
const quote = adQuoteSchema.parse({
  id: quoteId,
  requestId,
  providerId,
  currency: 'EGP',
  lineItems: [{ description: 'Homepage hero placement', quantity: 1, unitAmountMinor: 250000 }],
  totalMinor: 250000,
  validUntil: '2026-08-28T08:00:00.000Z',
  terms: 'Administrative quote terms.',
  status: 'accepted',
  issuerId: providerId,
  version: 3,
  decisionHistory: [{ action: 'issued', actorId: providerId, actorRole: 'admin', version: 0, createdAt: '2026-08-18T09:00:00.000Z' }],
  createdAt: '2026-08-18T09:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z'
});
const request = adRequestSchema.parse({
  id: requestId,
  providerId,
  placementKey: 'homepage.hero',
  purpose: 'Promote an approved property campaign.',
  intervalStart: '2026-09-01T08:00:00.000Z',
  intervalEnd: '2026-09-30T08:00:00.000Z',
  status: 'draft',
  version: 0,
  createdAt: '2026-08-18T08:00:00.000Z',
  updatedAt: '2026-08-18T08:00:00.000Z'
});
const proof = paymentProofDataSchema.parse({
  id: proofId,
  adRequestId: requestId,
  providerId,
  originalFilename: 'receipt.pdf',
  normalizedExtension: '.pdf',
  detectedMime: 'application/pdf',
  byteSize: 4,
  sha256: 'a'.repeat(64),
  version: 1,
  securityState: 'quarantined',
  status: 'pending_review',
  reviewHistory: [],
  uploadedAt: '2026-08-19T08:00:00.000Z',
  active: true,
  idempotentReplay: false
});
const commissionProjection = providerCommissionProjectionSchema.parse({
  accountId: providerId,
  source: 'policy',
  effectiveAt: '2026-08-19T08:00:00.000Z',
  policyVersion: 3,
  kind: 'percentage',
  percentageBps: 250,
  readOnly: true
});

function envelope(payload: unknown, requestIdValue = 'provider-advertising-test'): Response {
  return new Response(JSON.stringify({ data: payload, meta: { requestId: requestIdValue } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('Provider advertising requests and commission', () => {
  it('uses the implemented owner-scoped routes, strict query, and private upload headers', async () => {
    const calls: Array<{ path: string; method: string; query: string; authorization: string | null; body?: unknown; contentType: string | null; filename: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        const headers = new Headers(init?.headers);
        const entry = { path: url.pathname, method: init?.method ?? 'GET', query: url.search, authorization: headers.get('authorization'), body: init?.body instanceof Blob ? init.body : init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown, contentType: headers.get('content-type'), filename: headers.get('x-file-name') };
        calls.push(entry);
        if (url.pathname === '/api/v1/provider/ads' && entry.method === 'GET') return envelope(data);
        if (url.pathname === `/api/v1/provider/ads/${requestId}` && entry.method === 'GET') return envelope(detail);
        if (url.pathname === '/api/v1/provider/commission') return envelope(commissionProjection);
        if (url.pathname === '/api/v1/provider/ads' && entry.method === 'POST') return envelope(request);
        if (url.pathname.endsWith('/accept-quote')) return envelope(quote);
        return envelope(proof);
      }
    });

    await expect(loadProviderAdvertisingRequests({ apiClient: client, authorization: auth, query: { status: 'quote_sent', page: 2, limit: 5 } })).resolves.toEqual(data);
    await expect(loadProviderAdvertisingRequest(requestId, { apiClient: client, authorization: auth })).resolves.toEqual(detail);
    await expect(loadProviderCommission({ apiClient: client, authorization: auth })).resolves.toEqual(commissionProjection);
    const mutations = createProviderAdvertisingMutationApi({ apiClient: client, authorization: auth });
    await expect(mutations.createRequest({ placementKey: 'homepage.hero', purpose: 'Promote an approved property campaign.', intervalStart: '2026-09-01T08:00:00.000Z', intervalEnd: '2026-09-30T08:00:00.000Z' })).resolves.toEqual(request);
    await expect(mutations.acceptQuote(requestId, { action: 'accept', expectedVersion: 2 })).resolves.toEqual(quote);
    await expect(mutations.uploadPaymentProof(requestId, new Blob(['test'], { type: 'application/pdf' }), 'receipt.pdf')).resolves.toEqual(proof);

    expect(calls[0]).toMatchObject({ path: '/api/v1/provider/ads', method: 'GET', query: '?status=quote_sent&page=2&limit=5', authorization: 'Bearer provider.advertising.token' });
    expect(calls.some(call => call.path === `/api/v1/provider/ads/${requestId}` && call.method === 'GET')).toBe(true);
    expect(calls.some(call => call.path === '/api/v1/provider/commission')).toBe(true);
    const upload = calls.at(-1);
    expect(upload).toMatchObject({ path: `/api/v1/provider/ads/${requestId}/payment-proof`, method: 'POST', authorization: 'Bearer provider.advertising.token', contentType: 'application/pdf', filename: 'receipt.pdf' });
    expect(upload?.body).toBeInstanceOf(Blob);
  });

  it.each([{ page: 0 }, { page: 1, limit: 101 }])('rejects invalid advertising pagination before network access: %o', async query => {
    let calls = 0;
    const client = new ApiClient({ fetcher: async () => { calls += 1; return envelope(data); } });
    await expect(loadProviderAdvertisingRequests({ apiClient: client, authorization: auth, query })).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it('rejects unsafe or MIME-mismatched payment-proof filenames before upload', async () => {
    let calls = 0;
    const client = new ApiClient({
      fetcher: async () => {
        calls += 1;
        return envelope(proof);
      }
    });
    const api = createProviderAdvertisingMutationApi({ apiClient: client, authorization: auth });
    const pdf = new Blob(['test'], { type: 'application/pdf' });

    await expect(api.uploadPaymentProof(requestId, pdf, '../receipt.pdf')).rejects.toThrow('unsafe characters');
    await expect(api.uploadPaymentProof(requestId, pdf, 'receipt.png')).rejects.toThrow('does not match content type');
    expect(calls).toBe(0);
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders the safe projection and approved direction for %s', async locale => {
    const result = renderWithLocale(<ProviderAdvertising locale={locale} session={session} initialData={data} />, { locale });
    const copy = getProviderAdvertisingCopy(locale);
    await waitFor(() => expect(screen.getByTestId('provider-advertising-row')).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(within(screen.getByTestId('provider-advertising-row')).getByText(copy.statuses.quote_sent)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-19"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain(providerId);
    expect(result.container.textContent).not.toMatch(/storageKey|accessToken|refreshToken|bank verification/u);
    result.unmount();
  });

  it('shows empty and permission states without calling protected data for anonymous sessions', async () => {
    const load = vi.fn(async () => ({ items: [], page: 1, limit: 5, total: 0 }));
    renderWithLocale(<ProviderAdvertising locale="en" session={{ status: 'anonymous' }} initialData={data} load={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderAdvertisingCopy('en').states.permission.title })).toBeInTheDocument();
    expect(screen.queryByTestId('provider-advertising-row')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: getProviderAdvertisingCopy('en').create })).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
    renderWithLocale(<ProviderAdvertising locale="en" session={session} initialData={{ items: [], page: 1, limit: 5, total: 0 }} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderAdvertisingCopy('en').states.empty.title })).toBeInTheDocument();
  });

  it('hides seeded advertising details from anonymous sessions and restores them after provider authentication', async () => {
    const loadDetail = vi.fn(async () => detail);
    const view = renderWithLocale(<ProviderAdvertising locale="en" session={{ status: 'anonymous' }} requestId={requestId} initialDetail={detail} loadDetail={loadDetail} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderAdvertisingCopy('en').states.permission.title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: getProviderAdvertisingCopy('en').requestDetails, level: 1 })).not.toBeInTheDocument();
    expect(loadDetail).not.toHaveBeenCalled();

    view.rerender(<ProviderAdvertising locale="en" session={session} requestId={requestId} initialDetail={detail} loadDetail={loadDetail} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: getProviderAdvertisingCopy('en').requestDetails, level: 1 })).toBeInTheDocument());
    expect(screen.getByText(detail.placementKey)).toBeInTheDocument();
    expect(loadDetail).not.toHaveBeenCalled();
  });

  it('fails closed for anonymous commission sessions even when initial data is supplied', () => {
    const load = vi.fn(async () => commissionProjection);
    renderWithLocale(<ProviderCommission locale="en" session={{ status: 'anonymous' }} initialData={commissionProjection} load={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderAdvertisingCopy('en').states.permission.title })).toBeInTheDocument();
    expect(screen.queryByText('2.5%')).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it('requires the quote version and sends payment proof only in the waiting-payment state', async () => {
    const loadDetail = vi.fn(async () => adRequest({ status: 'waiting_payment', quote: { ...detail.quote!, status: 'accepted' }, paymentProofs: [] }));
    const mutations: ProviderAdvertisingMutationApi = {
      createRequest: vi.fn(async () => request),
      acceptQuote: vi.fn(async () => quote),
      uploadPaymentProof: vi.fn(async () => proof)
    };
    renderWithLocale(<ProviderAdvertising locale="en" session={session} requestId={requestId} initialDetail={detail} loadDetail={loadDetail} mutations={mutations} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: getProviderAdvertisingCopy('en').acceptQuote })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: getProviderAdvertisingCopy('en').acceptQuote }));
    await waitFor(() => expect(mutations.acceptQuote).toHaveBeenCalledWith(requestId, { action: 'accept', expectedVersion: 2 }));
    expect(screen.queryByLabelText(getProviderAdvertisingCopy('en').uploadPaymentProof)).not.toBeInTheDocument();
  });

  it('renders commission as a read-only server projection and supports an unavailable source', () => {
    const result = renderWithLocale(<ProviderCommission locale="en" session={session} initialData={commissionProjection} />, { locale: 'en' });
    expect(result.container.querySelector('[data-screen-id="PRV-20"]')).not.toBeNull();
    expect(screen.getByText('2.5%')).toBeInTheDocument();
    expect(screen.getByText(getProviderAdvertisingCopy('en').commission.readOnly)).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('sourceRecordId');
    result.unmount();
    const unavailable = providerCommissionProjectionSchema.parse({ accountId: providerId, source: 'none', effectiveAt: '2026-08-19T08:00:00.000Z', readOnly: true });
    renderWithLocale(<ProviderCommission locale="en" session={session} initialData={unavailable} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderAdvertisingCopy('en').commission.noneTitle, level: 3 })).toBeInTheDocument();
  });

  it('keeps Arabic commission metadata localized', () => {
    const result = renderWithLocale(<ProviderCommission locale="ar" session={session} initialData={commissionProjection} />, { locale: 'ar' });
    expect(result.direction).toBe('rtl');
    expect(result.container.textContent).toContain('سياسة إدارية');
    expect(result.container.textContent).toContain('نشطة');
    expect(result.container.textContent).not.toContain('Administrative policy');
    expect(result.container.textContent).not.toContain('Active');
  });
});
