import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { propertyDataSchema, type PropertyData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { getProviderCopy } from '../src/features/provider/copy.ts';
import { loadProviderProperties, ProviderProperties, type ProviderPropertiesData, type ProviderPropertiesQuery } from '../src/features/provider/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function property(overrides: Partial<PropertyData> = {}): PropertyData {
  return propertyDataSchema.parse({
    id: 'cccccccccccccccccccccccc',
    kind: 'property',
    name: { ar: 'عقار المزود', en: 'Provider property', 'zh-CN': '提供方房产' },
    slug: 'provider-property',
    transactionType: 'sale',
    source: { providerId, sourceType: 'individual_broker' },
    status: 'published',
    price: { amount: 1500000, currency: 'EGP' },
    active: true,
    version: 3,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions: [],
    ...overrides
  });
}

const rows: readonly [PropertyData, PropertyData, PropertyData] = [
  property(),
  property({ id: 'dddddddddddddddddddddddd', slug: 'needs-changes', status: 'needs_changes', reviewReason: 'Add the missing location details.', availableActions: ['update', 'submit'] }),
  property({ id: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'draft-property', status: 'draft', availableActions: ['update', 'submit'] })
];

const session = { status: 'authenticated' as const, role: 'provider' as const };

function success(data: unknown, requestId: string, meta: { page?: number; limit?: number; total?: number } = {}): Response {
  return new Response(JSON.stringify({ data, meta: { requestId, ...meta } }), { status: 200 });
}

const pageData: ProviderPropertiesData = { items: rows, page: 1, limit: 5, total: 3 };

describe('Provider properties', () => {
  it('loads the owner-scoped property query with strict filters and authorization', async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({ url: `${url.pathname}${url.search}`, authorization: new Headers(init?.headers).get('authorization') });
        return success({ items: [rows[1]] }, 'provider-properties', { page: 2, limit: 5, total: 6 });
      }
    });

    await expect(loadProviderProperties({
      apiClient: client,
      authorization: { getAuthorizationHeader: () => 'Bearer provider-token' },
      query: { status: 'needs_changes', search: 'needs', page: 2, limit: 5 }
    })).resolves.toEqual({ items: [rows[1]], page: 2, limit: 5, total: 6 });
    const requestUrl = new URL(`http://sadat-real-estate.local${requests[0]?.url ?? ''}`);
    expect(requests[0]?.authorization).toBe('Bearer provider-token');
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({ status: 'needs_changes', search: 'needs', sort: 'updatedAt', direction: 'desc', page: '2', limit: '5' });
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders safe owned rows, state labels, and direction for %s', async locale => {
    const load = vi.fn(async (_query: ProviderPropertiesQuery) => pageData);
    const result = renderWithLocale(<ProviderProperties locale={locale} session={session} load={load} />, { locale });
    const copy = getProviderCopy(locale);
    await waitFor(() => expect(screen.getByTestId('provider-properties-count')).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.properties.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('provider-property-cccccccccccccccccccccccc')).toBeInTheDocument();
    expect(within(screen.getByTestId('provider-property-dddddddddddddddddddddddd')).getByText(copy.propertyStatuses.needs_changes)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: new RegExp(copy.properties.edit, 'u') })).toHaveLength(2);
    expect(result.container.querySelector('[data-screen-id="PRV-02"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain(providerId);
    expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken/u);
    result.unmount();
  });

  it('applies status/search filters and changes pages through the server query', async () => {
    const requests: ProviderPropertiesQuery[] = [];
    const load = vi.fn(async (query: ProviderPropertiesQuery) => {
      requests.push(query);
      return { items: [rows[0]], page: query.page ?? 1, limit: 5, total: 11 };
    });
    renderWithLocale(<ProviderProperties locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument());
    const search = screen.getByRole('searchbox', { name: 'Search' });
    fireEvent.change(search, { target: { value: 'villa' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'published' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(requests.at(-1)).toMatchObject({ search: 'villa', status: 'published', page: 1, limit: 5 }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(requests.at(-1)).toMatchObject({ search: 'villa', status: 'published', page: 2, limit: 5 }));
  });

  it('fails closed for anonymous and forbidden provider sessions without rendering rows', async () => {
    const anonymousLoad = vi.fn(async (_query: ProviderPropertiesQuery) => pageData);
    renderWithLocale(<ProviderProperties locale="en" session={{ status: 'anonymous' }} load={anonymousLoad} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderCopy('en').states.permission.title })).toBeInTheDocument();
    expect(anonymousLoad).not.toHaveBeenCalled();

    const forbiddenLoad = vi.fn(async (_query: ProviderPropertiesQuery) => { throw new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }); });
    renderWithLocale(<ProviderProperties locale="en" session={session} load={forbiddenLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getProviderCopy('en').states.permission.title })).toBeInTheDocument());
    expect(screen.queryByTestId('provider-property-cccccccccccccccccccccccc')).not.toBeInTheDocument();
  });

  it('renders an honest empty filtered state rather than fallback property data', async () => {
    const load = vi.fn(async (_query: ProviderPropertiesQuery) => ({ items: [], page: 1, limit: 5, total: 0 }));
    renderWithLocale(<ProviderProperties locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getProviderCopy('en').properties.emptyTitle, level: 3 })).toBeInTheDocument());
    expect(screen.queryByTestId('provider-property-cccccccccccccccccccccccc')).not.toBeInTheDocument();
  });
});
