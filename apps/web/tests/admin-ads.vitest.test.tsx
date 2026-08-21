import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  adAdminRequestListSuccessEnvelopeSchema,
  adAdminRequestSchema,
  adCalendarListDataSchema,
  adFinancialReviewListDataSchema,
  adLedgerListDataSchema,
  adRequestSchema,
  adQuoteSchema,
  paymentProofAdminListDataSchema,
  paymentProofDataSchema,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  AdminAds,
  getAdminAdsCopy,
  loadAdminAdCalendar,
  loadAdminAdRequest,
  loadAdminAdRequests,
  loadAdminFinancialDetail,
  loadAdminFinancialReview,
  loadAdminLedger,
  loadAdminPaymentProofs,
  reviewAdminPaymentProof
} from '../src/features/admin_ads/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const request = adRequestSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  placementKey: 'homepage.hero',
  purpose: 'Promote an approved property campaign',
  intervalStart: '2026-08-20T09:00:00.000Z',
  intervalEnd: '2026-08-27T09:00:00.000Z',
  status: 'waiting_payment',
  version: 3,
  createdAt: '2026-08-18T09:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z'
});

const quote = adQuoteSchema.parse({
  id: 'cccccccccccccccccccccccc',
  requestId: request.id,
  providerId: request.providerId,
  currency: 'EGP',
  lineItems: [{ description: 'Homepage placement', quantity: 1, unitAmountMinor: 125000 }],
  totalMinor: 125000,
  validUntil: '2026-08-19T09:00:00.000Z',
  terms: 'Manual administrative quote.',
  status: 'issued',
  issuerId: 'dddddddddddddddddddddddd',
  version: 1,
  decisionHistory: [{ action: 'issued', actorId: 'dddddddddddddddddddddddd', actorRole: 'admin', version: 1, createdAt: '2026-08-18T10:00:00.000Z' }],
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z'
});

const adminRequest = adAdminRequestSchema.parse({ request, quote });
const requestList = adAdminRequestListSuccessEnvelopeSchema.parse({ data: { items: [adminRequest], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-ads-fixture', page: 1, limit: 20, total: 1 } }).data;
const proof = paymentProofDataSchema.parse({
  id: 'eeeeeeeeeeeeeeeeeeeeeeee',
  adRequestId: request.id,
  providerId: request.providerId,
  originalFilename: 'payment-proof.pdf',
  normalizedExtension: '.pdf',
  detectedMime: 'application/pdf',
  byteSize: 128_000,
  sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  version: 2,
  securityState: 'clean',
  status: 'pending_review',
  reviewHistory: [],
  uploadedAt: '2026-08-18T11:00:00.000Z',
  active: true,
  idempotentReplay: false
});
const proofList = paymentProofAdminListDataSchema.parse({ items: [proof], page: 1, limit: 20, total: 1 });
const calendarList = adCalendarListDataSchema.parse({
  items: [{ requestId: request.id, providerId: request.providerId, placementKey: request.placementKey, status: 'scheduled', startsAt: request.intervalStart, endsAt: request.intervalEnd, timezone: 'Africa/Cairo', localStart: '2026-08-20T12:00:00', localEnd: '2026-08-27T12:00:00', version: 1 }],
  page: 1,
  limit: 50,
  total: 1
});
const financialList = adFinancialReviewListDataSchema.parse({
  items: [{ requestId: request.id, providerId: request.providerId, placementKey: request.placementKey, requestStatus: request.status, intervalStart: request.intervalStart, intervalEnd: request.intervalEnd, quoteStatus: quote.status, quotedTotalMinor: quote.totalMinor, quoteCurrency: quote.currency, paymentProofStatus: proof.status, paymentProofSecurityState: proof.securityState, paymentProofCount: 1, financialState: 'payment_proof_pending_review', scheduleStatus: undefined, createdAt: request.createdAt, updatedAt: request.updatedAt }],
  page: 1,
  limit: 20,
  total: 1
});
const ledgerList = adLedgerListDataSchema.parse({
  items: [{ id: 'ffffffffffffffffffffffff', requestId: request.id, providerId: request.providerId, placementKey: request.placementKey, kind: 'payment_proof_uploaded', source: 'payment_proof', occurredAt: proof.uploadedAt, accountingTreatment: 'not_realized' }],
  page: 1,
  limit: 20,
  total: 1
});
const session = { status: 'authenticated' as const, role: 'admin' as const };
const authorization = { getAuthorizationHeader: () => 'Bearer admin.ads.test' };

function envelope(data: unknown, meta: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-ads-test', ...meta } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; query: string; authorization: string | null; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      const method = init?.method ?? 'GET';
      requests.push({ method, path: url.pathname, query: url.search, authorization: new Headers(init?.headers).get('authorization'), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown });
      if (method === 'POST') return envelope(proof);
      if (url.pathname.endsWith('/ad-calendar')) return envelope(calendarList, { page: 1, limit: 50, total: 1 });
      if (url.pathname.endsWith('/ad-financial-review')) return envelope(financialList, { page: 1, limit: 20, total: 1 });
      if (url.pathname.includes('/ad-financial-review/')) return envelope(financialList.items[0]);
      if (url.pathname.endsWith('/ad-ledger')) return envelope(ledgerList, { page: 1, limit: 20, total: 1 });
      if (url.pathname.endsWith('/payment-proofs')) return envelope(proofList, { page: 1, limit: 20, total: 1 });
      if (url.pathname.includes('/ad-requests/')) return envelope(adminRequest);
      return envelope(requestList, { page: 1, limit: 20, total: 1 });
    }
  });
}

const loaders = {
  loadRequests: vi.fn(async () => requestList),
  loadRequestDetail: vi.fn(async () => adminRequest),
  loadPaymentProofs: vi.fn(async () => proofList),
  reviewPaymentProof: vi.fn(async () => proof),
  loadCalendar: vi.fn(async () => calendarList),
  loadFinancialReview: vi.fn(async () => financialList),
  loadFinancialDetail: vi.fn(async () => financialList.items[0]!),
  loadLedger: vi.fn(async () => ledgerList)
};

describe('Admin advertising, payment, calendar, and financial projections', () => {
  it('uses the implemented API routes, strict contracts, and admin authorization', async () => {
    const requests: Array<{ method: string; path: string; query: string; authorization: string | null; body: unknown }> = [];
    const client = apiClientFor(requests);
    await expect(loadAdminAdRequests({ apiClient: client, authorization, query: { status: 'waiting_payment', page: 2, limit: 10 } })).resolves.toEqual(requestList);
    await expect(loadAdminAdRequest(request.id, { apiClient: client, authorization })).resolves.toEqual(adminRequest);
    await expect(loadAdminPaymentProofs({ apiClient: client, authorization, query: { status: 'pending_review' } })).resolves.toEqual(proofList);
    await expect(reviewAdminPaymentProof(proof.id, { action: 'approve', expectedVersion: proof.version, reason: 'Reviewed against the submitted proof' }, { apiClient: client, authorization })).resolves.toEqual(proof);
    await expect(loadAdminAdCalendar({ apiClient: client, authorization })).resolves.toEqual(calendarList);
    await expect(loadAdminFinancialReview({ apiClient: client, authorization })).resolves.toEqual(financialList);
    await expect(loadAdminFinancialDetail(request.id, { apiClient: client, authorization })).resolves.toEqual(financialList.items[0]);
    await expect(loadAdminLedger({ apiClient: client, authorization })).resolves.toEqual(ledgerList);
    expect(requests.every(item => item.authorization === 'Bearer admin.ads.test')).toBe(true);
    expect(requests.map(item => `${item.method} ${item.path}`)).toEqual([
      'GET /api/v1/admin/ad-requests',
      `GET /api/v1/admin/ad-requests/${request.id}`,
      'GET /api/v1/admin/payment-proofs',
      `POST /api/v1/admin/payment-proofs/${proof.id}/review`,
      'GET /api/v1/admin/ad-calendar',
      'GET /api/v1/admin/ad-financial-review',
      `GET /api/v1/admin/ad-financial-review/${request.id}`,
      'GET /api/v1/admin/ad-ledger'
    ]);
    expect(requests[3]?.body).toEqual({ action: 'approve', expectedVersion: proof.version, reason: 'Reviewed against the submitted proof' });
    await expect(reviewAdminPaymentProof(proof.id, { action: 'approve', expectedVersion: proof.version, reason: 'x' }, { apiClient: client })).rejects.toThrow();
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders the six screen projections with the correct direction for %s', async (locale: SupportedLocale) => {
    window.history.pushState({}, '', '/admin/ads/requests');
    const result = renderWithLocale(<AdminAds locale={locale} session={session} authClient={authorization} {...loaders} />, { locale });
    await waitFor(() => expect(result.container.querySelector('[data-screen-id="ADM-33"]')).not.toBeNull());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(screen.getByTestId(`admin-ad-request-${request.id}`)).toBeInTheDocument();
    expect(result.container.textContent).not.toMatch(/storageKey|downloadUrl|bankVerified|internalNotes|assignedTo|auditData|accessToken|refreshToken/u);
    result.unmount();
  });

  it('renders the approved proof review route, requires a reason, and sends the current version', async () => {
    window.history.pushState({}, '', `/admin/ads/payments/pending-review?proofId=${proof.id}`);
    const review = vi.fn(async () => proof);
    renderWithLocale(<AdminAds locale="en" session={session} authClient={authorization} {...loaders} reviewPaymentProof={review} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`admin-payment-proof-${proof.id}`)).toBeInTheDocument());
    const copy = getAdminAdsCopy('en');
    const reasonField = screen.getByLabelText(copy.reasonLabel);
    const reviewForm = reasonField.closest('form');
    expect(reviewForm).not.toBeNull();
    fireEvent.submit(reviewForm!);
    expect(review).not.toHaveBeenCalled();
    expect(screen.getByText(copy.reasonRequired)).toBeInTheDocument();
    fireEvent.change(reasonField, { target: { value: 'Reviewed against the submitted proof' } });
    fireEvent.submit(reviewForm!);
    await waitFor(() => expect(review).toHaveBeenCalledWith(proof.id, { action: 'approve', expectedVersion: proof.version, reason: 'Reviewed against the submitted proof' }));
  });

  it('fails closed for a non-admin session without calling any loader', async () => {
    const load = vi.fn();
    renderWithLocale(<AdminAds locale="en" session={{ status: 'anonymous' }} loadRequests={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminAdsCopy('en').states.permission.title })).toBeInTheDocument());
    expect(load).not.toHaveBeenCalled();
  });
});
