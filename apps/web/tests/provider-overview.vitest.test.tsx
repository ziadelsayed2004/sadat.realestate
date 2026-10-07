import { screen, waitFor } from '@testing-library/react';
import {
  propertyDataSchema,
  providerApplicationStatusDataSchema
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { getProviderCopy } from '../src/features/provider/copy.ts';
import { loadProviderOverview, ProviderNavigation, ProviderOverview, type ProviderOverviewData } from '../src/features/provider/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const application = providerApplicationStatusDataSchema.parse({
  applicationId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  providerType: 'individual_broker',
  status: 'approved',
  version: 2,
  availableActions: ['open_dashboard']
});

const property = propertyDataSchema.parse({
  id: 'cccccccccccccccccccccccc',
  kind: 'property',
  name: { ar: 'عقار المزود', en: 'Provider property',},
  slug: 'provider-property',
  transactionType: 'sale',
  source: { providerId, sourceType: 'individual_broker' },
  status: 'published',
  active: true,
  version: 1,
  createdAt: '2026-08-18T08:00:00.000Z',
  updatedAt: '2026-08-18T09:00:00.000Z',
  availableActions: []
});

const overview: ProviderOverviewData = {
  application,
  properties: {
    total: 3,
    published: 1,
    pendingReview: 1,
    needsChanges: 0,
    drafts: 1,
    recent: [property]
  },
  activity: { customerRequests: 23, bookedViewings: 1 }
};

const session = { status: 'authenticated' as const, role: 'provider' as const };

function success(data: unknown, requestId: string, total?: number): Response {
  return new Response(JSON.stringify({ data, meta: { requestId, ...(total === undefined ? {} : { total }) } }), { status: 200 });
}

describe('Provider overview', () => {
  it('renews stale application claims once and retries using the new token', async () => {
    let token = 'old-token';
    const headers: Array<string | null> = [];
    const refresh = vi.fn(async () => { token = 'current-token'; });
    const client = new ApiClient({ fetcher: async (_input, init) => {
      headers.push(new Headers(init?.headers).get('authorization'));
      if (headers.length === 1) return new Response(JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', requestId: 'stale-status' } }), { status: 401 });
      return success(overview, 'current-status');
    } });
    await expect(loadProviderOverview({ apiClient: client, authorization: { getAuthorizationHeader: () => `Bearer ${token}`, refresh } })).resolves.toEqual(overview);
    expect(headers).toEqual(['Bearer old-token', 'Bearer current-token']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('hides business navigation before approval but retains account and guide access', async () => {
    const pending = { ...application, status: 'pending_review' as const, availableActions: ['view_status' as const] };
    const authClient = { getAuthorizationHeader: () => 'Bearer pending', getProviderApplicationStatus: vi.fn(async () => pending) };
    const result = renderWithLocale(<ProviderOverview locale="en" session={session} authClient={authClient} initialData={{ ...overview, application: pending }} />, { locale: 'en' });
    await waitFor(() => expect(result.container.querySelector('[data-provider-nav="addProperty"]')).toBeNull());
    expect(result.container.querySelector('[data-provider-nav="settings"]')).not.toBeNull();
    expect(result.container.querySelector('[data-provider-nav="userGuide"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Track application status' })).toHaveAttribute('href', '/provider-application/status?lang=en');
    expect(screen.getByRole('button', { name: 'Refresh application status' })).toBeInTheDocument();
  });
  it('loads application status and owner-scoped property totals with the provider authorization header', async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({ url: `${url.pathname}${url.search}`, authorization: new Headers(init?.headers).get('authorization') });
        return success(overview, 'provider-dashboard');
      }
    });

    await expect(loadProviderOverview({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider-token' } })).resolves.toMatchObject({
      application,
      properties: { total: 3, published: 1, pendingReview: 1, needsChanges: 0, drafts: 1, recent: [property] },
      activity: { customerRequests: 23, bookedViewings: 1 }
    });
    expect(requests).toHaveLength(1);
    expect(requests.every(request => request.authorization === 'Bearer provider-token')).toBe(true);
    expect(requests[0]?.url).toBe('/api/v1/provider/dashboard');
  });

  it.each(['ar', 'en',] as const)('renders real totals, locale direction, and safe provider projections for %s', locale => {
    const result = renderWithLocale(<ProviderOverview locale={locale} session={session} initialData={overview} />, { locale });
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByTestId('provider-summary-total')).toHaveTextContent('3');
    expect(screen.getByTestId('provider-summary-published')).toHaveTextContent('1');
    expect(screen.getByTestId('provider-summary-pending')).toHaveTextContent('1');
    expect(screen.getByTestId('provider-summary-drafts')).toHaveTextContent('1');
    expect(screen.getByTestId('provider-summary-customer-requests')).toHaveTextContent('23');
    expect(screen.getByTestId('provider-summary-booked')).toHaveTextContent('1');
    expect(screen.getByRole('heading', { name: locale === 'ar' ? 'لوحة التحكم' : 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-01"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain(providerId);
    expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken/u);
    result.unmount();
  });

  it.each(['ar', 'en'] as const)('renders the canonical Provider rail assets and maps viewings to Customer Requests for %s', locale => {
    const result = renderWithLocale(<ProviderNavigation locale={locale} activePath="/provider/viewings" />, { locale });
    const links = Array.from(result.container.querySelectorAll('.provider-dashboard__navigation [data-provider-nav] a'));
    expect(links).toHaveLength(10);
    expect(result.container.querySelector('[data-provider-nav="userGuide"] a')).toHaveAttribute('href', `/provider/user-guide?lang=${locale}`);
    expect(result.container.querySelector('.provider-dashboard__brand')).not.toHaveAttribute('href');
    expect(result.container.querySelector('.provider-dashboard__website-link')).toHaveAttribute('href', `/?lang=${locale}`);
    expect(result.container.querySelector('.provider-dashboard__navigation a[data-active="true"]')).toHaveAttribute('href', `/provider/customer-requests?lang=${locale}`);
    expect(result.container.querySelectorAll('.provider-dashboard__navigation ul a img')).toHaveLength(9);
    expect(result.container.querySelector('.provider-dashboard__mobile-logout button')).toHaveAttribute('aria-label', locale === 'ar' ? 'تسجيل الخروج' : 'Sign out');
    expect(result.container.querySelector('.provider-dashboard__mobile-logout img')).toHaveAttribute('src', '/assets/canonical/provider/navigation/logout.svg');
    for (const image of result.container.querySelectorAll('.provider-dashboard__navigation ul a img')) {
      expect(image).toHaveAttribute('width', '19');
      expect(image).toHaveAttribute('height', '19');
      expect(image.getAttribute('src')).toMatch(/^\/assets\/canonical\/provider\/navigation\/[a-z-]+(?:-active)?\.svg$/u);
    }
    expect(result.container.querySelector('.provider-dashboard__navigation a[data-active="true"] img')).toHaveAttribute('src', '/assets/canonical/provider/navigation/requests-active.svg');
    result.unmount();
  });

  it('hides project management for an approved brokerage office', async () => {
    const brokerageApplication = providerApplicationStatusDataSchema.parse({
      ...application,
      providerType: 'brokerage_office'
    });
    const result = renderWithLocale(
      <ProviderNavigation
        locale="ar"
        activePath="/provider"
        authClient={{
          getAuthorizationHeader: () => 'Bearer provider-token',
          getProviderApplicationStatus: vi.fn().mockResolvedValue(brokerageApplication)
        }}
      />,
      { locale: 'ar' }
    );

    await waitFor(() => expect(result.container.querySelector('[data-provider-nav="projects"]')).toBeNull());
    expect(result.container.querySelectorAll('.provider-dashboard__navigation [data-provider-nav] a')).toHaveLength(9);
  });

  it('fails closed for an anonymous session and exposes retry without fallback values', async () => {
    const copy = getProviderCopy('en');
    const load = vi.fn().mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }));
    renderWithLocale(<ProviderOverview locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();

    renderWithLocale(<ProviderOverview locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.states.retry.title })).toBeInTheDocument());
    expect(screen.queryByTestId('provider-summary-total')).not.toBeInTheDocument();
  });

  it.each(['ar', 'en'] as const)('shows unread advertising notifications on the dashboard and refreshes after returning for %s', async locale => {
    const loadNotifications = vi.fn().mockResolvedValueOnce({ items: [{ id: 'dddddddddddddddddddddddd', type: 'advertising.waiting_payment', title: { ar: 'مطلوب دفع قيمة إعلانك', en: 'Payment required for your advertisement' }, message: { ar: 'ارفع إثبات الدفع من تفاصيل الإعلان.', en: 'Upload payment proof in the ad details.' }, link: '/provider/ads/eeeeeeeeeeeeeeeeeeeeeeee', readAt: null, createdAt: '2026-10-08T08:00:00.000Z' }], unreadCount: 1, page: 1, limit: 3, total: 1 }).mockResolvedValue({ items: [], unreadCount: 0, page: 1, limit: 3, total: 0 });
    const result = renderWithLocale(<ProviderOverview locale={locale} session={session} initialData={overview} loadNotifications={loadNotifications} />, { locale });
    await screen.findByText(locale === 'ar' ? 'مطلوب دفع قيمة إعلانك' : 'Payment required for your advertisement');
    expect(screen.getByRole('link', { name: locale === 'ar' ? 'عرض التفاصيل' : 'View details' })).toHaveAttribute('href', `/provider/ads/eeeeeeeeeeeeeeeeeeeeeeee?lang=${locale}`);
    expect(result.container.querySelector('[data-provider-nav="notifications"] .provider-dashboard__notification-count')).toHaveTextContent(new Intl.NumberFormat(locale).format(1));
    expect(loadNotifications).toHaveBeenCalledWith({ page: 1, limit: 3, unreadOnly: true }, expect.any(AbortSignal));
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(result.container.querySelector('.provider-dashboard__notifications-preview')).toBeNull());
    expect(result.container.querySelector('.provider-dashboard__notification-count')).toBeNull();
  });

  it('never loads another account notifications for an anonymous dashboard', async () => {
    const loadNotifications = vi.fn();
    renderWithLocale(<ProviderOverview locale="en" session={{ status: 'anonymous' }} initialData={overview} loadNotifications={loadNotifications} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getProviderCopy('en').states.permission.title })).toBeInTheDocument());
    expect(loadNotifications).not.toHaveBeenCalled();
  });
});
