import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  featureDataSchema,
  locationDataSchema,
  taxonomyDataSchema,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  createAdminFeature,
  createAdminLocation,
  createAdminMasterDataSource,
  createAdminTaxonomy,
  deleteAdminFeature,
  deleteAdminLocation,
  loadAdminFeatures,
  loadAdminLocations,
  loadAdminTaxonomy,
  updateAdminLocation,
  updateAdminTaxonomy,
  type MasterDataList
} from '../src/features/admin_master_data/index.ts';
import { AdminMasterData, getAdminMasterDataCopy } from '../src/features/admin_master_data/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const session = { status: 'authenticated' as const, role: 'admin' as const };
const authorization = { getAuthorizationHeader: () => 'Bearer admin.master-data.test' };

const category = taxonomyDataSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa', kind: 'category', name: { ar: 'عقارات', en: 'Properties',}, slug: 'properties', order: 1, active: true, version: 2,
  createdAt: '2026-08-10T08:00:00.000Z', updatedAt: '2026-08-18T08:00:00.000Z', availableActions: ['update', 'delete']
});
const location = locationDataSchema.parse({
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb', kind: 'location', name: { ar: 'مدينة السادات', en: 'Sadat City',}, slug: 'sadat-city', order: 1, active: true, version: 1,
  createdAt: '2026-08-10T08:00:00.000Z', updatedAt: '2026-08-18T08:00:00.000Z', availableActions: ['update', 'delete']
});
const feature = featureDataSchema.parse({
  id: 'cccccccccccccccccccccccc', kind: 'feature', groupKey: 'building_amenities', name: { ar: 'مصعد', en: 'Elevator',}, slug: 'elevator', order: 1, active: true, version: 1,
  createdAt: '2026-08-10T08:00:00.000Z', updatedAt: '2026-08-18T08:00:00.000Z', availableActions: ['update', 'delete']
});

function envelope(data: unknown, total?: number): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'master-data-test', page: 1, limit: 20, ...(total === undefined ? {} : { total }) } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; authorization: string | null; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      const method = init?.method ?? 'GET';
      requests.push({ method, path: url.pathname, authorization: new Headers(init?.headers).get('authorization'), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown });
      if (url.pathname === '/api/v1/admin/locations' && method === 'GET') return envelope({ items: [location] }, 1);
      if (url.pathname === '/api/v1/admin/property-categories' && method === 'GET') return envelope({ items: [category] }, 1);
      if (url.pathname === '/api/v1/admin/features' && method === 'GET') return envelope({ items: [feature] }, 1);
      if (url.pathname === '/api/v1/admin/locations' && method === 'POST') return envelope(location);
      if (url.pathname === '/api/v1/admin/property-categories' && method === 'POST') return envelope(category);
      if (url.pathname === '/api/v1/admin/features' && method === 'POST') return envelope(feature);
      if (url.pathname.includes('/locations/') && method === 'PATCH') return envelope(location);
      if (url.pathname.includes('/property-categories/') && method === 'PATCH') return envelope(category);
      if (url.pathname.includes('/features/') && method === 'PATCH') return envelope(feature);
      if (method === 'DELETE') return envelope({ id: url.pathname.split('/').at(-1), deleted: true });
      throw new Error(`Unhandled test route ${method} ${url.pathname}`);
    }
  });
}

describe('Admin master-data contracts and views', () => {
  it('uses the implemented list and CRUD routes with authorization and strict request schemas', async () => {
    const requests: Array<{ method: string; path: string; authorization: string | null; body: unknown }> = [];
    const client = apiClientFor(requests);
    const source = createAdminMasterDataSource({ apiClient: client, authorization });
    await expect(loadAdminLocations({ apiClient: client, authorization, query: { kind: 'location', page: 2, limit: 10 } })).resolves.toMatchObject({ items: [location], total: 1 });
    await expect(loadAdminTaxonomy({ apiClient: client, authorization })).resolves.toMatchObject({ items: [category] });
    await expect(loadAdminFeatures({ apiClient: client, authorization })).resolves.toMatchObject({ items: [feature] });
    await expect(createAdminLocation({ kind: 'location', name: { en: 'New City' }, slug: 'new-city', reason: 'Approved master data' }, { apiClient: client, authorization })).resolves.toEqual(location);
    await expect(updateAdminTaxonomy(category.id, { version: category.version, name: { en: 'Updated properties' }, reason: 'Corrected label' }, { apiClient: client, authorization })).resolves.toEqual(category);
    await expect(deleteAdminFeature(feature.id, { version: feature.version, reason: 'Retired duplicate' }, { apiClient: client, authorization })).resolves.toEqual({ id: feature.id, deleted: true });
    await expect(source.load('locations')).resolves.toMatchObject({ items: [location] });
    await expect(updateAdminLocation(location.id, { version: location.version, active: false, order: 2, reason: 'Temporarily hidden' }, { apiClient: client, authorization })).resolves.toEqual(location);
    await expect(createAdminTaxonomy({ kind: 'category', name: { en: 'Projects' }, slug: 'projects', reason: 'Approved category' }, { apiClient: client, authorization })).resolves.toEqual(category);
    await expect(createAdminFeature({ kind: 'feature', groupKey: 'building_amenities', name: { en: 'Parking' }, slug: 'parking', reason: 'Approved feature' }, { apiClient: client, authorization })).resolves.toEqual(feature);
    await expect(deleteAdminLocation(location.id, { version: location.version, reason: 'Retired location' }, { apiClient: client, authorization })).resolves.toEqual({ id: location.id, deleted: true });
    expect(requests.every(request => request.authorization === 'Bearer admin.master-data.test')).toBe(true);
    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual([
      'GET /api/v1/admin/locations', 'GET /api/v1/admin/property-categories', 'GET /api/v1/admin/features',
      'POST /api/v1/admin/locations', 'PATCH /api/v1/admin/property-categories/aaaaaaaaaaaaaaaaaaaaaaaa', 'DELETE /api/v1/admin/features/cccccccccccccccccccccccc',
      'GET /api/v1/admin/locations', 'PATCH /api/v1/admin/locations/bbbbbbbbbbbbbbbbbbbbbbbb', 'POST /api/v1/admin/property-categories', 'POST /api/v1/admin/features', 'DELETE /api/v1/admin/locations/bbbbbbbbbbbbbbbbbbbbbbbb'
    ]);
    expect(requests.find(request => request.method === 'DELETE')?.body).toMatchObject({ version: 1, reason: expect.any(String) });
  });

  it.each(['ar', 'en',] as const)('renders every master-data screen with the locale direction and safe projection for %s', async (locale: SupportedLocale) => {
    const tabs: Array<{ tab: 'categories' | 'locations' | 'features'; path: string; data: MasterDataList; screen: string }> = [
      { tab: 'categories', path: '/admin/property-categories', data: { items: [category], page: 1, limit: 20, total: 1 }, screen: 'ADM-09' },
      { tab: 'locations', path: '/admin/locations', data: { items: [location], page: 1, limit: 20, total: 1 }, screen: 'ADM-10' },
      { tab: 'features', path: '/admin/features', data: { items: [feature], page: 1, limit: 20, total: 1 }, screen: 'ADM-11' }
    ];
    for (const entry of tabs) {
      window.history.pushState({}, '', entry.path);
      const result = renderWithLocale(<AdminMasterData locale={locale} session={session} initialData={entry.data} />, { locale });
      await waitFor(() => expect(screen.getByTestId(`admin-master-data-item-${entry.data.items[0]!.id}`)).toBeInTheDocument());
      expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
      expect(result.container.querySelector(`[data-screen-id="${entry.screen}"]`)).not.toBeNull();
      expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
      expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
      result.unmount();
    }
  });

  it('creates an item through the modal and fails closed for a non-admin session', async () => {
    const requests: Array<{ method: string; path: string; authorization: string | null; body: unknown }> = [];
    const client = apiClientFor(requests);
    window.history.pushState({}, '', '/admin/property-categories');
    const result = renderWithLocale(<AdminMasterData locale="en" session={session} apiClient={client} authClient={authorization} initialData={{ items: [], page: 1, limit: 20, total: 0 }} />, { locale: 'en' });
    fireEvent.click(screen.getAllByRole('button', { name: getAdminMasterDataCopy('en').add })[0]!);
    fireEvent.change(screen.getByLabelText(getAdminMasterDataCopy('en').labels.nameEn), { target: { value: 'Projects' } });
    fireEvent.change(screen.getByLabelText(`${getAdminMasterDataCopy('en').labels.reason} *`), { target: { value: 'Approved category' } });
    fireEvent.click(screen.getByRole('button', { name: getAdminMasterDataCopy('en').save }));
    await waitFor(() => expect(screen.getByText(getAdminMasterDataCopy('en').mutation.created)).toBeInTheDocument());
    expect(screen.getByTestId(`admin-master-data-item-${category.id}`)).toBeInTheDocument();
    expect(requests.some(request => request.method === 'POST' && request.path === '/api/v1/admin/property-categories')).toBe(true);
    result.unmount();
    const load = vi.fn();
    renderWithLocale(<AdminMasterData locale="en" session={{ status: 'anonymous' }} initialData={{ items: [category], page: 1, limit: 20, total: 1 }} apiClient={new ApiClient({ fetcher: async () => { load(); return envelope({ items: [category] }, 1); } })} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminMasterDataCopy('en').states.permission.title })).toBeInTheDocument());
    expect(load).not.toHaveBeenCalled();
  });

  it('loads later taxonomy pages so every parent is selectable', async () => {
    const pages: number[] = [];
    const client = new ApiClient({ fetcher: async input => {
      const page = Number(new URL(String(input), 'http://localhost').searchParams.get('page')); pages.push(page);
      const items = page === 1 ? Array.from({ length: 100 }, (_, index) => ({ ...category, id: index.toString(16).padStart(24, '0'), kind: 'type', categoryId: category.id })) : [category];
      return new Response(JSON.stringify({ data: { items }, meta: { requestId: 'all-parents', page, limit: 100, total: 101 } }), { headers: { 'content-type': 'application/json' } });
    } });
    const result = await createAdminMasterDataSource({ apiClient: client, authorization }).load('categories');
    expect(pages).toEqual([1, 2]);
    expect(result.items).toHaveLength(101);
    expect(result.items.at(-1)).toEqual(category);
  });

  it('loads all feature pages including the final display order', async () => {
    const pages: number[] = [];
    const client = new ApiClient({ fetcher: async input => {
      const page = Number(new URL(String(input), 'http://localhost').searchParams.get('page')); pages.push(page);
      const items = page === 1 ? Array.from({ length: 100 }, (_, index) => ({ ...feature, id: index.toString(16).padStart(24, '0'), order: index })) : [{ ...feature, order: 500 }];
      return new Response(JSON.stringify({ data: { items }, meta: { requestId: 'feature-pages', page, limit: 100, total: 101 } }), { headers: { 'content-type': 'application/json' } });
    } });
    const result = await createAdminMasterDataSource({ apiClient: client, authorization }).load('features');
    expect(pages).toEqual([1, 2]);
    expect(result.items).toHaveLength(101);
    expect(result.items.at(-1)?.order).toBe(500);
  });

  it.each(['feature', 'service'] as const)('creates a %s without asking for a group code or order', async kind => {
    window.history.pushState({}, '', '/admin/features');
    const inputs: unknown[] = [];
    const client = new ApiClient({ fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body)); inputs.push(body);
      return envelope({ ...feature, kind: body.kind, name: body.name, groupKey: body.groupKey, order: body.order, id: 'd'.repeat(24), slug: 'new-option', version: 0 });
    } });
    const result = renderWithLocale(<AdminMasterData locale="en" session={session} apiClient={client} initialData={{ items: [feature, { ...feature, id: 'e'.repeat(24), order: 12 }], page: 1, limit: 100, total: 2 }} />, { locale: 'en' });
    const copy = getAdminMasterDataCopy('en');
    fireEvent.click(screen.getByRole('button', { name: copy.add }));
    fireEvent.change(screen.getByLabelText(copy.labels.kind), { target: { value: kind } });
    expect(result.container.querySelector('#admin-master-data-group')).toBeNull();
    expect(result.container.querySelector('details')).not.toHaveAttribute('open');
    fireEvent.change(screen.getByLabelText(copy.labels.nameEn), { target: { value: 'New option' } });
    fireEvent.change(screen.getByLabelText(`${copy.labels.reason} *`), { target: { value: 'Add property option' } });
    fireEvent.click(screen.getByRole('button', { name: copy.save }));
    await waitFor(() => expect(screen.getByText(copy.mutation.created)).toBeInTheDocument());
    expect(inputs).toEqual([{ kind, name: { en: 'New option' }, groupKey: kind === 'service' ? 'nearby' : 'property_feature', order: 13, active: true, reason: 'Add property option' }]);
  });

  it('preserves a specialized existing feature group and display order while editing its name', async () => {
    window.history.pushState({}, '', '/admin/features');
    const inputs: unknown[] = [];
    const existing = { ...feature, groupKey: 'finishing', order: 7 };
    const client = new ApiClient({ fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body)); inputs.push(body);
      return envelope({ ...existing, name: body.name, version: 2 });
    } });
    renderWithLocale(<AdminMasterData locale="en" session={session} apiClient={client} initialData={{ items: [existing], page: 1, limit: 100, total: 1 }} />, { locale: 'en' });
    const copy = getAdminMasterDataCopy('en');
    fireEvent.click(screen.getByRole('button', { name: /Edit:/ }));
    fireEvent.change(screen.getByLabelText(copy.labels.nameEn), { target: { value: 'Full finishing' } });
    fireEvent.change(screen.getByLabelText(`${copy.labels.reason} *`), { target: { value: 'Clarify feature name' } });
    fireEvent.click(screen.getByRole('button', { name: copy.save }));
    await waitFor(() => expect(screen.getByText(copy.mutation.updated)).toBeInTheDocument());
    expect(inputs).toEqual([{ version: 1, name: { ar: 'مصعد', en: 'Full finishing' }, groupKey: 'finishing', order: 7, active: true, reason: 'Clarify feature name' }]);
  });

  it('explains and focuses the required parent instead of submitting an invalid type', () => {
    window.history.pushState({}, '', '/admin/property-categories');
    const fetcher = vi.fn();
    const result = renderWithLocale(<AdminMasterData locale="en" session={session} apiClient={new ApiClient({ fetcher })} initialData={{ items: [], page: 1, limit: 100, total: 0 }} />, { locale: 'en' });
    fireEvent.click(screen.getAllByRole('button', { name: getAdminMasterDataCopy('en').add })[0]!);
    fireEvent.change(screen.getByLabelText(getAdminMasterDataCopy('en').labels.kind), { target: { value: 'type' } });
    fireEvent.submit(result.container.querySelector('.admin-master-data__form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Select a category for this property type first.');
    expect(screen.getByLabelText('Category for this property type *')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Add a category first' })).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('creates a type with its category and automatic order, and keeps inputs on failure', async () => {
    window.history.pushState({}, '', '/admin/property-categories');
    const inputs: unknown[] = [];
    let fail = true;
    const client = new ApiClient({ fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body)); inputs.push(body);
      if (fail) throw new Error('internal database secret');
      return envelope({ ...category, kind: body.kind, categoryId: body.categoryId, name: body.name, order: body.order, slug: 'new-type', id: 'd'.repeat(24), version: 0 });
    } });
    renderWithLocale(<AdminMasterData locale="en" session={session} apiClient={client} initialData={{ items: [category], page: 1, limit: 100, total: 1 }} />, { locale: 'en' });
    const copy = getAdminMasterDataCopy('en');
    fireEvent.click(screen.getByRole('button', { name: copy.add }));
    fireEvent.change(screen.getByLabelText(copy.labels.kind), { target: { value: 'type' } });
    expect(screen.getByLabelText('Category for this property type *')).toHaveValue(category.id);
    expect(screen.getByLabelText(`${copy.labels.order} *`)).toHaveValue(2);
    fireEvent.change(screen.getByLabelText(copy.labels.nameEn), { target: { value: 'New property type' } });
    fireEvent.change(screen.getByLabelText(`${copy.labels.reason} *`), { target: { value: 'Add new type' } });
    fireEvent.click(screen.getByRole('button', { name: copy.save }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(copy.mutation.failed));
    expect(screen.getByLabelText(copy.labels.nameEn)).toHaveValue('New property type');
    expect(screen.queryByText(/internal database secret/)).not.toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: copy.save }));
    await waitFor(() => expect(screen.getByText(copy.mutation.created)).toBeInTheDocument());
    expect(inputs).toEqual(Array(2).fill({ kind: 'type', imageUrl: '/assets/canonical/public/sadat-city-entrance.jpg', categoryId: category.id, name: { en: 'New property type' }, order: 2, active: true, reason: 'Add new type' }));
  });
});
