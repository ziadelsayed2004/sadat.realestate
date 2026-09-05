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
  it('loads application status and owner-scoped property totals with the provider authorization header', async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({ url: `${url.pathname}${url.search}`, authorization: new Headers(init?.headers).get('authorization') });
        if (url.pathname.endsWith('/application/status')) return success(application, 'provider-application-status');
        if (url.pathname.endsWith('/customer-requests')) return success({ items: [], page: 1, limit: 1, total: 23 }, 'provider-customer-requests');
        if (url.pathname.endsWith('/viewings')) return success({ items: [], page: 1, limit: 1, total: 1 }, 'provider-viewings');
        const status = url.searchParams.get('status');
        const total = status === null ? 3 : status === 'published' ? 1 : status === 'pending_review' ? 1 : status === 'draft' ? 1 : 0;
        return success({ items: status === null ? [property] : [] }, `provider-properties-${status ?? 'all'}`, total);
      }
    });

    await expect(loadProviderOverview({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider-token' } })).resolves.toMatchObject({
      application,
      properties: { total: 3, published: 1, pendingReview: 1, needsChanges: 0, drafts: 1, recent: [property] },
      activity: { customerRequests: 23, bookedViewings: 1 }
    });
    expect(requests).toHaveLength(8);
    expect(requests.every(request => request.authorization === 'Bearer provider-token')).toBe(true);
    expect(requests.some(request => request.url === '/api/v1/provider/application/status')).toBe(true);
    expect(requests.some(request => request.url.includes('/api/v1/provider/properties?') && request.url.includes('status=published'))).toBe(true);
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
    const links = Array.from(result.container.querySelectorAll('.provider-dashboard__navigation ul a'));
    expect(links).toHaveLength(9);
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
});
