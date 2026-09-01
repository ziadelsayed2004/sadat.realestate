import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import {
  publicHomepagePropertySchema,
  publicPropertyComparisonDataSchema
} from '@sadat-real-estate/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  PublicPropertyComparison,
  getPublicPropertyComparisonCopy,
  loadPublicPropertyComparison,
  parsePublicPropertyComparisonIds,
  publicPropertyComparisonUrl
} from '../src/features/public/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const firstId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const secondId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const firstProperty = publicHomepagePropertySchema.parse({
  id: firstId,
  slug: 'garden-villa',
  kind: 'property',
  name: { ar: 'Garden villa', en: 'Garden villa',},
  transactionType: 'sale',
  area: { value: 180, unit: 'sqm' },
  layout: { bedrooms: 4, bathrooms: 3, floor: 1 },
  price: { amount: 2_500_000, currency: 'EGP' }
});

const secondProperty = publicHomepagePropertySchema.parse({
  id: secondId,
  slug: 'city-apartment',
  kind: 'unit',
  name: { ar: 'City apartment', en: 'City apartment',},
  transactionType: 'rent',
  area: { value: 120, unit: 'sqm' },
  layout: { bedrooms: 3, bathrooms: 2, floor: 8 },
  price: { amount: 20_000, currency: 'EGP' }
});

const comparisonData = publicPropertyComparisonDataSchema.parse({
  items: [firstProperty, secondProperty],
  fields: [
    'kind',
    'transactionType',
    'sourceName',
    'sourceType',
    'project',
    'developer',
    'publicCode',
    'price',
    'installment',
    'area',
    'bedrooms',
    'bathrooms',
    'floor',
    'deliveryStatus',
    'locationName'
  ]
});

const singleComparisonData = publicPropertyComparisonDataSchema.parse({
  items: [secondProperty],
  fields: [
    'kind',
    'transactionType',
    'sourceName',
    'sourceType',
    'project',
    'developer',
    'publicCode',
    'price',
    'installment',
    'area',
    'bedrooms',
    'bathrooms',
    'floor',
    'deliveryStatus',
    'locationName'
  ]
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('public property comparison', () => {
  it('parses at most two unique IDs and preserves the selected locale in URLs', () => {
    expect(parsePublicPropertyComparisonIds(`/compare?lang=ar&propertyIds=${firstId}&propertyIds=${secondId}`)).toEqual([firstId, secondId]);
    expect(parsePublicPropertyComparisonIds(`/compare?propertyIds=${firstId}&propertyIds=${firstId}`)).toEqual([]);
    expect(parsePublicPropertyComparisonIds(`/compare?propertyIds=${firstId}&propertyIds=${secondId}&propertyIds=cccccccccccccccccccccccc`)).toEqual([]);
    expect(publicPropertyComparisonUrl([firstId, secondId], '/compare?lang=en')).toBe(`/compare?lang=en&propertyIds=${firstId}&propertyIds=${secondId}`);
    expect(() => publicPropertyComparisonUrl([firstId, secondId, 'cccccccccccccccccccccccc'])).toThrow();
  });

  it('posts only the validated public comparison request through the versioned API client', async () => {
    let requestInput = '';
    let requestInit: RequestInit | undefined;
    const client = new ApiClient({
      fetcher: async (input, init) => {
        requestInput = String(input);
        requestInit = init;
        return new Response(JSON.stringify({ data: comparisonData, meta: { requestId: 'comparison-request' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
    });

    await expect(loadPublicPropertyComparison({ propertyIds: [firstId, secondId], apiClient: client })).resolves.toEqual(comparisonData);
    expect(requestInput).toBe('/api/v1/public/properties/compare');
    expect(requestInit?.method).toBe('POST');
    expect(JSON.parse(String(requestInit?.body))).toEqual({ propertyIds: [firstId, secondId] });
  });

  it.each(['ar', 'en'] as const)('renders the localized contract projection and safe missing-media state for %s', locale => {
    const copy = getPublicPropertyComparisonCopy(locale);
    const result = renderWithLocale(
      <PublicPropertyComparison locale={locale} url={`/compare?lang=${locale}&propertyIds=${firstId}&propertyIds=${secondId}`} initialData={comparisonData} />,
      { locale }
    );

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: copy.remove })).toHaveLength(2);
    expect(screen.getAllByRole('table')).toHaveLength(4);
    expect(screen.getByText(copy.area)).toBeInTheDocument();
    expect(result.container.querySelector('[data-page="public-comparison"]')).toHaveAttribute('data-comparison-state', 'success');
    expect(result.container.querySelector('[data-page="public-comparison"]')).toHaveAttribute('data-comparison-count', '2');
    expect(result.container.textContent).not.toContain('providerId');
    expect(result.container.textContent).not.toContain('audit');
    expect(result.container.textContent).not.toContain('storageKey');
  });

  it('removes one property and clears the comparison through the URL state', async () => {
    window.history.replaceState({}, '', `/compare?lang=en&propertyIds=${firstId}&propertyIds=${secondId}`);
    const load = vi.fn().mockResolvedValue(singleComparisonData);
    const copy = getPublicPropertyComparisonCopy('en');
    renderWithLocale(
      <PublicPropertyComparison locale="en" url={window.location.href} initialData={comparisonData} load={load} />,
      { locale: 'en' }
    );

    fireEvent.click(screen.getAllByRole('button', { name: copy.remove })[0]!);
    await waitFor(() => expect(load).toHaveBeenCalledWith([secondId], expect.any(AbortSignal)));
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.remove })).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(`/compare?lang=en&propertyIds=${secondId}`);

    fireEvent.click(screen.getByRole('button', { name: copy.clearAll }));
    expect(screen.getByRole('heading', { name: copy.emptyTitle, level: 2 })).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe('/compare?lang=en');
  });

  it('renders loading and empty states without requiring a request', () => {
    const copy = getPublicPropertyComparisonCopy('en');
    const pendingLoad = vi.fn(() => new Promise<typeof comparisonData>(() => undefined));
    renderWithLocale(
      <PublicPropertyComparison locale="en" url={`/compare?propertyIds=${firstId}&propertyIds=${secondId}`} load={pendingLoad} />,
      { locale: 'en' }
    );
    expect(screen.getByRole('status', { name: copy.loadingTitle })).toBeInTheDocument();
    expect(pendingLoad).toHaveBeenCalledWith([firstId, secondId], expect.any(AbortSignal));

    cleanup();
    renderWithLocale(<PublicPropertyComparison locale="en" url="/compare" load={pendingLoad} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.emptyTitle, level: 2 })).toBeInTheDocument();
  });

  it('supports retry, permission, and unavailable states', async () => {
    const copy = getPublicPropertyComparisonCopy('en');
    const retryLoad = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(comparisonData);
    renderWithLocale(
      <PublicPropertyComparison locale="en" url={`/compare?propertyIds=${firstId}&propertyIds=${secondId}`} load={retryLoad} />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByRole('status', { name: copy.retryTitle })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument());

    cleanup();
    const permissionLoad = vi.fn().mockRejectedValue(new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }));
    renderWithLocale(
      <PublicPropertyComparison locale="en" url={`/compare?propertyIds=${firstId}&propertyIds=${secondId}`} load={permissionLoad} />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByRole('alert', { name: copy.permissionTitle })).toBeInTheDocument());

    cleanup();
    const unavailableLoad = vi.fn(() => new Promise<typeof comparisonData>(() => undefined));
    renderWithLocale(
      <PublicPropertyComparison locale="en" url={`/compare?propertyIds=${firstId}&propertyIds=${secondId}`} initialState="unavailable" load={unavailableLoad} />,
      { locale: 'en' }
    );
    expect(screen.getByRole('alert', { name: copy.unavailableTitle })).toBeInTheDocument();
    expect(unavailableLoad).not.toHaveBeenCalled();
  });
});
