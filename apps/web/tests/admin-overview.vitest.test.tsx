import { screen, waitFor } from '@testing-library/react';
import { adminOverviewDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { getAdminCopy } from '../src/features/admin/copy.ts';
import { AdminOverview, loadAdminOverview } from '../src/features/admin/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const session = { status: 'authenticated' as const, role: 'admin' as const };
const overview = adminOverviewDataSchema.parse({
  range: { from: '2026-07-20T00:00:00.000Z', to: '2026-08-19T00:00:00.000Z' },
  metrics: {
    users: 2847,
    seekers: 2104,
    providers: 318,
    verifiedProviders: 318,
    publishedProperties: 1089,
    openRequests: 28,
    pendingReviews: 23
  },
  generatedAt: '2026-08-19T09:00:00.000Z'
});

function success(data: unknown): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-overview-test' } }), { status: 200 });
}

describe('Admin overview', () => {
  it('shows approved payment amounts in EGP and real advertisement counts', () => {
    renderWithLocale(<AdminOverview locale="en" session={session} initialData={{ ...overview, metrics: { ...overview.metrics, adRequests: 3, paymentProofs: 2, activeAds: 1, approvedAdPaymentsMinor: 50000, publishedArticles: 4 } }} />, { locale: 'en' });
    expect(screen.getByTestId('admin-metric-approvedAdPaymentsMinor')).toHaveTextContent('500.00');
    expect(screen.getByTestId('admin-metric-adRequests')).toHaveTextContent('3');
    expect(screen.getByTestId('admin-metric-paymentProofs')).toHaveTextContent('2');
    expect(screen.getByTestId('admin-metric-publishedArticles')).toHaveTextContent('4');
  });
  it('requests the implemented overview contract with a bounded date range and admin authorization', async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({ url: `${url.pathname}${url.search}`, authorization: new Headers(init?.headers).get('authorization') });
        return success(overview);
      }
    });

    await expect(loadAdminOverview({
      apiClient: client,
      authorization: { getAuthorizationHeader: () => 'Bearer admin-token' },
      clock: () => new Date('2026-08-19T00:00:00.000Z')
    })).resolves.toEqual(overview);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.authorization).toBe('Bearer admin-token');
    const url = new URL(`http://sadat-real-estate.local${requests[0]?.url ?? ''}`);
    expect(url.pathname).toBe('/api/v1/admin/overview');
    expect(url.searchParams.get('from')).toBe('2026-07-20T00:00:00.000Z');
    expect(url.searchParams.get('to')).toBe('2026-08-19T00:00:00.000Z');
  });

  it.each(['ar', 'en',] as const)('renders real metrics and the correct direction for %s', locale => {
    const result = renderWithLocale(<AdminOverview locale={locale} session={session} initialData={overview} />, { locale });
    const copy = getAdminCopy(locale);
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.overview.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('admin-metric-users')).toHaveTextContent('2,847');
    expect(screen.getByTestId('admin-metric-publishedProperties')).toHaveTextContent('1,089');
    expect(screen.getByTestId('admin-metric-pendingReviews')).toHaveTextContent('23');
    expect(screen.getByTestId('admin-overview-extended')).toBeInTheDocument();
    expect(screen.queryByText(copy.unavailable)).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-metric-users')).toHaveAttribute('href', `/admin/users?lang=${locale}`);
    expect(result.container.querySelector('[data-screen-id="ADM-01"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken/u);
    result.unmount();
  });

  it.each(['ar', 'en'] as const)('makes the extended metrics and administrative shortcuts navigable in %s', locale => {
    const data = { ...overview, metrics: { ...overview.metrics, publishedArticles: 4, communityPosts: 5, communityComments: 6, contentReports: 0, adRequests: 3, paymentProofs: 2, activeAds: 1, approvedAdPaymentsMinor: 50000 } };
    const result = renderWithLocale(<AdminOverview locale={locale} session={session} initialData={data} />, { locale });
    const paths = { publishedArticles: '/admin/articles', communityPosts: '/admin/community', communityComments: '/admin/community/comments', contentReports: '/admin/community/moderation', adRequests: '/admin/ads/requests', paymentProofs: '/admin/ads/payment-proofs/pending', activeAds: '/admin/ads/calendar', approvedAdPaymentsMinor: '/admin/ads/financial-review' };
    for (const [metric, path] of Object.entries(paths)) expect(screen.getByTestId(`admin-metric-${metric}`)).toHaveAttribute('href', `${path}?lang=${locale}`);
    expect(screen.getByTestId('admin-metric-contentReports')).toHaveTextContent('0');
    expect(screen.getByTestId('admin-metric-approvedAdPaymentsMinor').querySelector('strong')?.textContent).toBe(new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP' }).format(500));
    expect(result.container.querySelectorAll('.admin-dashboard__metric:not(a)')).toHaveLength(0);
    expect(result.container.querySelector('[data-state="unavailable"]')).toBeNull();
    for (const path of ['/admin/settings', '/admin/audit-logs', '/admin/notifications']) {
      expect(result.container.querySelector(`.admin-dashboard__extended a[href="${path}?lang=${locale}"]`)).not.toBeNull();
    }
  });

  it('offers a list link without inventing a zero when an optional metric is absent', () => {
    renderWithLocale(<AdminOverview locale="en" session={session} initialData={overview} />, { locale: 'en' });
    const card = screen.getByTestId('admin-metric-approvedAdPaymentsMinor');
    expect(card).toHaveTextContent('Open page');
    expect(card.querySelector('strong')).toBeNull();
  });

  it('renders a truthful empty state without fallback counters', () => {
    const emptyData = adminOverviewDataSchema.parse({
      ...overview,
      metrics: { users: 0, seekers: 0, providers: 0, verifiedProviders: 0, publishedProperties: 0, openRequests: 0, pendingReviews: 0 }
    });
    const copy = getAdminCopy('en');
    renderWithLocale(<AdminOverview locale="en" session={session} initialData={emptyData} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.overview.emptyTitle, level: 1 })).toBeInTheDocument();
    expect(screen.queryByTestId('admin-metric-users')).not.toBeInTheDocument();
  });

  it('fails closed for non-admin sessions and exposes retry for a network failure', async () => {
    const copy = getAdminCopy('en');
    const load = vi.fn().mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' })).mockResolvedValueOnce(overview);
    renderWithLocale(<AdminOverview locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();

    renderWithLocale(<AdminOverview locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.states.retry.title })).toBeInTheDocument());
    await screen.findByRole('button', { name: copy.retry }).then(button => button.click());
    await waitFor(() => expect(screen.getByTestId('admin-metric-users')).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);
  });
});
