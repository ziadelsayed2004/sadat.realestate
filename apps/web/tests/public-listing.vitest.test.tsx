import { fireEvent, screen, waitFor } from '@testing-library/react';
import { publicPropertyListDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../src/features/contracts/index.ts';
import {
  PublicPropertyListing,
  defaultPublicPropertySearchQuery,
  getPublicPropertyListingCopy,
  parsePublicPropertySearchQuery,
  publicPropertySearchUrl
} from '../src/features/public/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const listingData = publicPropertyListDataSchema.parse({
  items: [{
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    slug: 'published-home',
    kind: 'property',
    name: { en: 'Published home', ar: 'منزل منشور',},
    transactionType: 'sale',
    area: { value: 120, unit: 'sqm' },
    layout: { bedrooms: 3, bathrooms: 2 },
    price: { amount: 1_250_000, currency: 'EGP' }
  }],
  categories: [{ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'apartments', name: { ar: 'شقق', en: 'Apartments',}, propertyCount: 1, order: 0 }],
  propertyTypes: [{ id: 'cccccccccccccccccccccccc', slug: 'apartments', name: { ar: 'شقة', en: 'Apartment',}, propertyCount: 1, order: 0 }],
  page: 1,
  limit: 20,
  total: 1
});

describe('public property listing', () => {
  it('parses only the implemented allowlisted query and synchronizes it to the route', () => {
    const query = parsePublicPropertySearchQuery('/properties?search=home&transactionType=rent&sort=price&direction=asc&page=2&limit=10&%24where=true');

    expect(query).toMatchObject({ search: 'home', transactionType: 'rent', sort: 'price', direction: 'asc', page: 2, limit: 10 });
    expect(publicPropertySearchUrl(query)).toBe('/properties?transactionType=rent&search=home&sort=price&direction=asc&page=2&limit=10');
  });

  it.each(['ar', 'en'] as const)('renders the public projection and direction for %s', (locale) => {
    const copy = getPublicPropertyListingCopy(locale);
    const result = renderWithLocale(
      <PublicPropertyListing locale={locale} initialData={listingData} initialQuery={defaultPublicPropertySearchQuery()} />,
      { locale }
    );

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    const localizedName = listingData.items[0]?.name[locale] ?? listingData.items[0]?.slug ?? 'published-home';
    expect(screen.getByRole('link', { name: localizedName })).toHaveAttribute('href', '/properties/published-home');
    expect(screen.getByText(copy.resultCount(1))).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('providerId');
    expect(result.container.textContent).not.toContain('audit');
  });

  it('updates filters, sort, and browser query state through the implemented route', async () => {
    window.history.replaceState({}, '', '/properties');
    const load = vi.fn().mockResolvedValue(listingData);
    const copy = getPublicPropertyListingCopy('en');
    renderWithLocale(
      <PublicPropertyListing locale="en" initialData={listingData} initialQuery={defaultPublicPropertySearchQuery()} load={load} />,
      { locale: 'en' }
    );

    fireEvent.change(screen.getByLabelText(copy.sortLabel), { target: { value: 'price' } });
    fireEvent.click(screen.getByRole('button', { name: copy.applyFilters }));

    await waitFor(() => expect(load).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price', page: 1 }), expect.any(AbortSignal)));
    expect(window.location.pathname).toBe('/properties');
    expect(window.location.search).toContain('sort=price');
  });

  it('supports pagination and kind navigation without inventing query fields', async () => {
    window.history.replaceState({}, '', '/properties');
    const load = vi.fn().mockResolvedValue({ ...listingData, page: 2, total: 41 });
    renderWithLocale(
      <PublicPropertyListing locale="en" initialData={{ ...listingData, page: 1, total: 41 }} initialQuery={defaultPublicPropertySearchQuery()} load={load} />,
      { locale: 'en' }
    );

    fireEvent.click(screen.getByRole('button', { name: /Apartments|شقق|公寓/ }));
    await waitFor(() => expect(load).toHaveBeenCalledWith(expect.objectContaining({ propertyCategoryId: expect.any(String), page: 1 }), expect.any(AbortSignal)));
    expect(window.location.search).toContain('propertyCategoryId=');
  });

  it('renders empty and loading-to-success states with retry', async () => {
    const load = vi.fn().mockResolvedValue(listingData);
    const copy = getPublicPropertyListingCopy('en');
    const empty = publicPropertyListDataSchema.parse({ items: [], categories: [], propertyTypes: [], page: 1, limit: 20, total: 0 });
    renderWithLocale(<PublicPropertyListing locale="en" initialData={empty} load={load} />, { locale: 'en' });

    expect(screen.getByRole('status', { name: copy.emptyTitle })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Published home' })).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('renders retry and permission-safe API states', async () => {
    const retryLoad = vi.fn().mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' })).mockResolvedValueOnce(listingData);
    const copy = getPublicPropertyListingCopy('en');
    renderWithLocale(<PublicPropertyListing locale="en" load={retryLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('status', { name: copy.retryTitle })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Published home' })).toBeInTheDocument());

    const permissionLoad = vi.fn().mockRejectedValue(new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }));
    renderWithLocale(<PublicPropertyListing locale="en" load={permissionLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('alert', { name: copy.permissionTitle })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: copy.permissionLink })).toHaveAttribute('href', '/');
  });
});
