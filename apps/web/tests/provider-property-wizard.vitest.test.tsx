import { fireEvent, screen, waitFor } from '@testing-library/react';
import { propertyDataSchema, publicPropertyLocationSchema, type PropertyData } from '@sadat-real-estate/contracts';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { getProviderPropertyCopy } from '../src/features/provider_property/copy.ts';
import { loadProviderProperty, loadProviderPropertyParentOptions, saveProviderPropertyStep } from '../src/features/provider_property/data.ts';
import { ProviderPropertyWizard, type ProviderPropertyAuthClient } from '../src/features/provider_property/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function property(overrides: Partial<PropertyData> = {}): PropertyData {
  return propertyDataSchema.parse({
    id: propertyId,
    kind: 'property',
    name: { ar: 'عقار المزوّد', en: 'Provider property',},
    slug: 'provider-property',
    transactionType: 'sale',
    source: { providerId, sourceType: 'individual_broker' },
    locationId: 'cccccccccccccccccccccccc',
    coordinates: { latitude: 30.62, longitude: 30.74 },
    status: 'draft',
    active: true,
    version: 2,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions: ['update', 'submit'],
    ...overrides
  });
}

const session = { status: 'authenticated' as const, role: 'provider' as const };
const authClient: ProviderPropertyAuthClient = {
  getAuthorizationHeader: () => 'Bearer provider.wizard.token',
  getSnapshot: () => ({ status: 'authenticated', user: { id: providerId, roleType: 'provider', status: 'verified' }, availableActions: [] })
};

function success(data: unknown, requestId: string): Response {
  return new Response(JSON.stringify({ data, meta: { requestId } }), { status: 200 });
}

describe('Provider property wizard', () => {
  it('uses the implemented detail and step routes with the provider authorization header', async () => {
    const requests: Array<{ path: string; method: string; authorization: string | null; json?: unknown }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        const body = init?.body === undefined || typeof init.body !== 'string' ? undefined : JSON.parse(init.body) as unknown;
        requests.push({ path: url.pathname, method: init?.method ?? 'GET', authorization: new Headers(init?.headers).get('authorization'), ...(body === undefined ? {} : { json: body }) });
        return success(property(), 'provider-property');
      }
    });

    await expect(loadProviderProperty({ apiClient: client, authorization: authClient, propertyId })).resolves.toMatchObject({ id: propertyId });
    await expect(saveProviderPropertyStep({ version: 2, locationId: 'cccccccccccccccccccccccc', reason: 'Save property location' }, { apiClient: client, authorization: authClient, propertyId, step: 'location' })).resolves.toMatchObject({ locationId: 'cccccccccccccccccccccccc' });
    expect(requests).toEqual([
      { path: `/api/v1/provider/properties/${propertyId}`, method: 'GET', authorization: 'Bearer provider.wizard.token' },
      { path: `/api/v1/provider/properties/${propertyId}/steps/location`, method: 'PATCH', authorization: 'Bearer provider.wizard.token', json: { version: 2, locationId: 'cccccccccccccccccccccccc', reason: 'Save property location' } }
    ]);
  });

  it('preserves approved map URLs, legacy coordinates, and location IDs while rejecting unsafe URLs before the request', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => success(property(), 'provider-location'));
    const client = new ApiClient({ fetcher });
    const location = {
      version: 2,
      locationId: 'cccccccccccccccccccccccc',
      coordinates: { latitude: 30.62, longitude: 30.74 },
      mapUrl: 'https://maps.google.com/?q=30.62%2C30.74',
      reason: 'Save property location'
    };

    await expect(saveProviderPropertyStep(location, { apiClient: client, authorization: authClient, propertyId, step: 'location' })).resolves.toMatchObject({ id: propertyId });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual(location);

    for (const mapUrl of ['https://example.com', 'https://www.google.com', 'https://maps.google.com.evil.example/?q=Sadat', 'http://maps.example.com', '/relative-map', 'javascript:alert(1)', `https://maps.example.com/${'a'.repeat(2048)}`]) {
      await expect(saveProviderPropertyStep({ version: 2, mapUrl, reason: 'Reject unsafe map URL' }, { apiClient: client, authorization: authClient, propertyId, step: 'location' })).rejects.toThrow();
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['ar', 'en'] as const)('explains an ordinary website URL and keeps the location draft in %s', async locale => {
    const copy = getProviderPropertyCopy(locale);
    const save = vi.fn(async () => property({ version: 3 }));
    renderWithLocale(<ProviderPropertyWizard locale={locale} session={session} authClient={authClient} step="location" propertyId={propertyId} initialData={property()} save={save} loadLocations={vi.fn(async () => [])} resolveMapCoordinates={async () => null} />, { locale });
    const map = screen.getByLabelText(copy.wizard.labels.mapUrl);
    fireEvent.change(map, { target: { value: 'https://example.com' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    expect(save).not.toHaveBeenCalled();
    expect(map).toHaveFocus();
    expect(map).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(copy.wizard.mapUrlError)).toBeVisible();
    expect(map).toHaveValue('https://example.com');
    fireEvent.change(map, { target: { value: 'https://maps.app.goo.gl/Abc123xyz' } });
    await waitFor(() => expect(screen.getByRole('button', { name: copy.wizard.saveDraft })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(propertyId, 'location', expect.objectContaining({ mapUrl: 'https://maps.app.goo.gl/Abc123xyz' }));
  });

  it.each(['ar', 'en'] as const)('automatically fills and saves map coordinates in %s, without mixing an old pin with a new map', async locale => {
    const copy = getProviderPropertyCopy(locale);
    const save = vi.fn(async () => property({ version: 3 }));
    const resolveMapCoordinates = vi.fn(async () => null);
    renderWithLocale(<ProviderPropertyWizard locale={locale} session={session} authClient={authClient} step="location" propertyId={propertyId} initialData={property()} save={save} loadLocations={async () => []} resolveMapCoordinates={resolveMapCoordinates} />, { locale });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.mapUrl), { target: { value: 'https://www.google.com/maps/place/Home/@31,32,15z/data=!3d30.63!4d30.75' } });
    await waitFor(() => expect(screen.getByLabelText(copy.wizard.labels.latitude)).toHaveValue('30.63'));
    expect(screen.getByLabelText(copy.wizard.labels.longitude)).toHaveValue('30.75');
    expect(resolveMapCoordinates).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(propertyId, 'location', expect.objectContaining({ coordinates: { latitude: 30.63, longitude: 30.75 } })));
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.mapUrl), { target: { value: 'https://maps.google.com/?q=New+address' } });
    await waitFor(() => expect(screen.getByRole('button', { name: copy.wizard.saveDraft })).toBeEnabled());
    expect(screen.getByLabelText(copy.wizard.labels.latitude)).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(propertyId, 'location', expect.objectContaining({ coordinates: null })));
  });

  it('ignores stale short-link responses and manual edits cancel automatic replacement', async () => {
    const copy = getProviderPropertyCopy('en');
    let finish: ((point: { latitude: number; longitude: number }) => void) | undefined;
    const resolver = vi.fn(() => new Promise<{ latitude: number; longitude: number }>(resolve => { finish = resolve; }));
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="location" propertyId={propertyId} initialData={property()} loadLocations={async () => []} resolveMapCoordinates={resolver} />, { locale: 'en' });
    const map = screen.getByLabelText(copy.wizard.labels.mapUrl);
    fireEvent.change(map, { target: { value: 'https://maps.app.goo.gl/Abc123xyz' } });
    await waitFor(() => expect(resolver).toHaveBeenCalledTimes(1));
    fireEvent.change(map, { target: { value: 'https://maps.apple.com/?ll=30.64,30.76' } });
    await waitFor(() => expect(screen.getByLabelText(copy.wizard.labels.latitude)).toHaveValue('30.64'));
    finish!({ latitude: 1, longitude: 2 });
    await waitFor(() => expect(screen.getByLabelText(copy.wizard.labels.longitude)).toHaveValue('30.76'));
    fireEvent.change(map, { target: { value: 'https://maps.app.goo.gl/Another123' } });
    await waitFor(() => expect(resolver).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.latitude), { target: { value: '30.65' } });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.longitude), { target: { value: '30.77' } });
    finish!({ latitude: 1, longitude: 2 });
    await waitFor(() => expect(screen.getByLabelText(copy.wizard.labels.latitude)).toHaveValue('30.65'));
    expect(screen.getByLabelText(copy.wizard.labels.longitude)).toHaveValue('30.77');
  });

  it('explicitly clears an old unrelated map link while preserving the selected location', async () => {
    const copy = getProviderPropertyCopy('en');
    const save = vi.fn(async () => property({ version: 3 }));
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="location" propertyId={propertyId} initialData={property({ mapUrl: 'https://example.com' })} save={save} loadLocations={vi.fn(async () => [])} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.mapUrl), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(propertyId, 'location', expect.objectContaining({ mapUrl: null }));
  });

  it.each(['ar', 'en',] as const)('renders the approved wizard direction and contract boundary for %s', locale => {
    const result = renderWithLocale(<ProviderPropertyWizard locale={locale} session={session} authClient={authClient} step="basic" />, { locale });
    const copy = getProviderPropertyCopy(locale);
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.wizard.basicTitle, level: 2 })).toBeInTheDocument();
    expect(screen.getByLabelText(copy.wizard.labels.name)).toBeInTheDocument();
    expect(screen.getByText(copy.wizard.contractBoundaryTitle)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-03"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|internalNotes|assignedTo|auditData/u);
    result.unmount();
  });

  it('validates the create contract and lets the server resolve provider identity when saving a draft', async () => {
    const create = vi.fn(async (input: Parameters<NonNullable<ComponentProps<typeof ProviderPropertyWizard>['create']>>[0]) => property({ id: 'dddddddddddddddddddddddd', name: input.name, slug: input.slug ?? 'generated-property', version: 0, locationId: undefined, coordinates: undefined }));
    const copy = getProviderPropertyCopy('en');
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="basic" create={create} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.name), { target: { value: 'Sadat apartment' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: { en: 'Sadat apartment' }
    }));
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('source');
    expect(screen.getByRole('status')).toHaveTextContent(copy.wizard.saved);
  });

  it.each(['ar', 'en'] as const)('saves an office draft without requesting source or organization codes in %s', async locale => {
    const copy = getProviderPropertyCopy(locale);
    const create = vi.fn(async (_input: Parameters<NonNullable<ComponentProps<typeof ProviderPropertyWizard>['create']>>[0]) => property({ source: { providerId, sourceType: 'brokerage_office', organizationId: 'c'.repeat(24) } }));
    renderWithLocale(<ProviderPropertyWizard locale={locale} session={session} authClient={authClient} step="basic" create={create} />, { locale });
    expect(screen.queryByRole('combobox', { name: copy.wizard.labels.sourceType })).toBeNull();
    expect(screen.queryByLabelText(copy.wizard.labels.organizationId)).toBeNull();
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.name), { target: { value: 'My apartment' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('source');
    expect(screen.getByRole('status')).toHaveTextContent(copy.wizard.saved);
    expect(screen.getByText(copy.wizard.sourceTypeLabels.brokerage_office)).toBeVisible();
  });

  it('validates the reason while accepting Arabic property names without a manual slug', () => {
    const copy = getProviderPropertyCopy('ar');
    const create = vi.fn();
    renderWithLocale(<ProviderPropertyWizard locale="ar" session={session} authClient={authClient} step="basic" create={create} />, { locale: 'ar' });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.name), { target: { value: 'شقة في السادات' } });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.reason), { target: { value: 'سبب' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    expect(screen.queryByLabelText(copy.wizard.labels.slug)).not.toBeInTheDocument();
    expect(screen.getByLabelText(copy.wizard.labels.reason)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(copy.wizard.labels.name)).toHaveValue('شقة في السادات');
    expect(create).not.toHaveBeenCalled();
  });

  it('updates the newly saved draft on a second save instead of creating another property', async () => {
    const copy = getProviderPropertyCopy('en');
    const create = vi.fn(async () => property({ version: 0 }));
    const save = vi.fn(async (_id: string, _step: string, _input: unknown) => property({ version: 1 }));
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="basic" create={create} save={save} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.name), { target: { value: 'My apartment' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await screen.findByRole('status');
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.name), { target: { value: 'Updated apartment' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[2]).not.toHaveProperty('slug');
    expect(save).toHaveBeenCalledWith(propertyId, 'basic', expect.objectContaining({ version: 0, name: { ar: 'عقار المزوّد', en: 'Updated apartment' } }));
  });

  it('retains an existing draft edit when switching the interface language', () => {
    const initial = property();
    const result = renderWithLocale(<ProviderPropertyWizard locale="ar" session={session} authClient={authClient} propertyId={propertyId} initialData={initial} step="basic" />, { locale: 'ar' });
    fireEvent.change(screen.getByLabelText(getProviderPropertyCopy('ar').wizard.labels.name), { target: { value: 'اسم معدل' } });
    result.rerender(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} propertyId={propertyId} initialData={initial} step="basic" />);
    expect(screen.getByLabelText(getProviderPropertyCopy('en').wizard.labels.name)).toHaveValue(initial.name.en);
    result.rerender(<ProviderPropertyWizard locale="ar" session={session} authClient={authClient} propertyId={propertyId} initialData={initial} step="basic" />);
    expect(screen.getByLabelText(getProviderPropertyCopy('ar').wizard.labels.name)).toHaveValue('اسم معدل');
  });

  it('clears an invisible parent reference when changing a unit into a property', async () => {
    const copy = getProviderPropertyCopy('en');
    const create = vi.fn(async (_input: Parameters<NonNullable<ComponentProps<typeof ProviderPropertyWizard>['create']>>[0]) => property());
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="basic" create={create} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.name), { target: { value: 'My apartment' } });
    const kind = screen.getByRole('combobox', { name: copy.wizard.labels.kind });
    fireEvent.change(kind, { target: { value: 'unit' } });
    expect(screen.getByRole('combobox', { name: copy.wizard.labels.parentPropertyId })).toBeInTheDocument();
    fireEvent.change(kind, { target: { value: 'property' } });
    expect(screen.queryByLabelText(copy.wizard.labels.parentPropertyId)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]![0]).not.toHaveProperty('parentPropertyId');
  });

  it('loads the provider-owned parent list with bounded pages and an authenticated name search', async () => {
    const requests: URL[] = [];
    const apiClient = new ApiClient({ fetcher: async (input, init) => {
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer provider.wizard.token');
      requests.push(new URL(String(input), 'http://sadat-real-estate.local'));
      return new Response(JSON.stringify({ data: { items: [property()] }, meta: { requestId: 'parent-list', page: 2, limit: 100, total: 101 } }), { status: 200 });
    } });
    const result = await loadProviderPropertyParentOptions({ page: 2, search: 'Building' }, { apiClient, authorization: authClient });
    expect(result).toMatchObject({ page: 2, limit: 100, total: 101 });
    expect(requests[0]!.pathname).toBe('/api/v1/provider/properties');
    expect(requests[0]!.searchParams.get('search')).toBe('Building');
    expect(requests[0]!.searchParams.get('limit')).toBe('100');
  });

  it.each(['ar', 'en'] as const)('chooses the main property by name and saves its reference without asking for a code in %s', async locale => {
    const copy = getProviderPropertyCopy(locale);
    const parent = property({ id: 'dddddddddddddddddddddddd', name: { ar: 'عمارة النخيل', en: 'Palm building' } });
    const create = vi.fn(async () => property());
    const loadParents = vi.fn(async () => ({ items: [parent, property({ kind: 'unit' }), property({ id: 'eeeeeeeeeeeeeeeeeeeeeeee', status: 'archived' })], page: 1, limit: 100, total: 3 }));
    renderWithLocale(<ProviderPropertyWizard locale={locale} session={session} authClient={authClient} step="basic" create={create} loadParents={loadParents} load={async () => parent} />, { locale });
    expect(screen.queryByLabelText(copy.wizard.labels.parentPropertyId)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.name), { target: { value: 'Apartment listing' } });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.kind), { target: { value: 'unit' } });
    await screen.findByRole('option', { name: parent.name[locale]! });
    const picker = screen.getByRole('combobox', { name: copy.wizard.labels.parentPropertyId });
    expect(picker.querySelectorAll('option')).toHaveLength(2);
    expect(screen.getByText(copy.wizard.parentPicker.help)).toBeVisible();
    fireEvent.change(picker, { target: { value: parent.id } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'unit', parentPropertyId: parent.id })));
  });

  it('keeps a saved parent visible across paging, search and a failed retry, and excludes the current property', async () => {
    const copy = getProviderPropertyCopy('en');
    const parent = property({ id: 'dddddddddddddddddddddddd', name: { en: 'Existing building' } });
    const initial = property({ kind: 'unit', parentPropertyId: parent.id });
    const loadParents = vi.fn(async () => ({ items: [property()], page: 1, limit: 100, total: 101 }));
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="basic" propertyId={propertyId} initialData={initial} loadParents={loadParents} load={async () => parent} />, { locale: 'en' });
    const picker = screen.getByRole('combobox', { name: copy.wizard.labels.parentPropertyId });
    await screen.findByRole('option', { name: 'Existing building' });
    await waitFor(() => expect(loadParents).toHaveBeenCalledTimes(1));
    expect(picker).toHaveValue(parent.id);
    expect(picker.querySelector(`option[value="${propertyId}"]`)).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: copy.wizard.parentPicker.next }));
    await waitFor(() => expect(loadParents).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal)));
    loadParents.mockRejectedValueOnce(new Error('Network failure'));
    fireEvent.change(screen.getByRole('searchbox', { name: copy.wizard.parentPicker.search }), { target: { value: 'Absent' } });
    await screen.findByText(copy.wizard.parentPicker.error);
    expect(picker).toHaveValue(parent.id);
    fireEvent.click(screen.getByRole('button', { name: copy.retry }));
    await waitFor(() => expect(loadParents).toHaveBeenLastCalledWith({ page: 1, search: 'Absent' }, expect.any(AbortSignal)));
    expect(picker).toHaveValue(parent.id);
  });

  it('clears saved project and parent references explicitly when updating an existing draft', async () => {
    const copy = getProviderPropertyCopy('en');
    const initial = property({ kind: 'unit', projectId: 'cccccccccccccccccccccccc', parentPropertyId: 'dddddddddddddddddddddddd' });
    const save = vi.fn(async () => property({ version: 3 }));
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="basic" propertyId={propertyId} initialData={initial} save={save} load={async () => property({ id: initial.parentPropertyId! })} loadParents={async () => ({ items: [], page: 1, limit: 100, total: 0 })} />, { locale: 'en' });
    fireEvent.change(screen.getByRole('combobox', { name: copy.wizard.labels.kind }), { target: { value: 'property' } });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.projectId), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(propertyId, 'basic', expect.objectContaining({ kind: 'property', projectId: null, parentPropertyId: null }));
  });

  it('loads admin-managed locations through the safe catalog, filters by localized name, and submits the selected id', async () => {
    const current = property();
    const save = vi.fn(async () => property({ version: current.version + 1 }));
    const catalog = [
      publicPropertyLocationSchema.parse({ id: 'dddddddddddddddddddddddd', kind: 'location', name: { ar: 'مدينة السادات', en: 'Sadat City' }, slug: 'sadat-city', order: 1 }),
      publicPropertyLocationSchema.parse({ id: 'eeeeeeeeeeeeeeeeeeeeeeee', kind: 'neighborhood', name: { ar: 'المنطقة الأولى', en: 'First District' }, slug: 'first-district', parentLocationId: 'dddddddddddddddddddddddd', order: 2 })
    ];
    const copy = getProviderPropertyCopy('en');
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="location" propertyId={propertyId} initialData={current} save={save} loadLocations={vi.fn(async () => catalog)} />, { locale: 'en' });
    expect(screen.getByDisplayValue('30.62')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sadat City' })).toBeInTheDocument());
    fireEvent.change(screen.getByRole('searchbox', { name: copy.wizard.locationSearchLabel }), { target: { value: 'First' } });
    expect(screen.queryByRole('option', { name: 'Sadat City' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: copy.wizard.labels.locationId }), { target: { value: 'eeeeeeeeeeeeeeeeeeeeeeee' } });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.latitude), { target: { value: '30.63' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(propertyId, 'location', expect.objectContaining({ version: 2, locationId: 'eeeeeeeeeeeeeeeeeeeeeeee', coordinates: { latitude: 30.63, longitude: 30.74 } }));
  });

  it.each(['ar', 'en'] as const)('recovers from an unmatched region search without clearing the saved selection in %s', async locale => {
    const catalog = [
      publicPropertyLocationSchema.parse({ id: 'dddddddddddddddddddddddd', kind: 'neighborhood', name: { ar: 'الحي الأول', en: 'First District' }, slug: 'first-district', order: 1 }),
      publicPropertyLocationSchema.parse({ id: 'eeeeeeeeeeeeeeeeeeeeeeee', kind: 'neighborhood', name: { ar: 'الحي السابع', en: 'Seventh District' }, slug: 'seventh-district', order: 2 })
    ];
    const current = property({ locationId: catalog[1]!.id });
    const save = vi.fn(async () => current);
    const copy = getProviderPropertyCopy(locale).wizard;
    renderWithLocale(<ProviderPropertyWizard locale={locale} session={session} authClient={authClient} step="location" propertyId={propertyId} initialData={current} save={save} loadLocations={async () => catalog} />, { locale });
    const picker = screen.getByRole('combobox', { name: copy.labels.locationId });
    await waitFor(() => expect(picker).toBeEnabled());
    fireEvent.change(screen.getByRole('searchbox', { name: copy.locationSearchLabel }), { target: { value: 'السباعه' } });
    const clearSearch = screen.getByRole('button', { name: copy.clearLocationSearch });
    expect(clearSearch.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(locale === 'ar' ? 'نتائج البحث: 1 من 2 مناطق. امسح البحث لعرض الكل.' : 'Search results: 1 of 2 areas. Clear the search to show all.')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: locale === 'ar' ? 'الحي السابع' : 'Seventh District' })).toBeInTheDocument();
    expect(screen.queryByText(copy.locationSearchEmpty)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: copy.locationSearchLabel }), { target: { value: 'منطقة غير مسجلة' } });
    expect(screen.getByText(copy.locationSearchEmpty)).toBeInTheDocument();
    expect(picker).toHaveValue(current.locationId);
    fireEvent.click(screen.getByRole('button', { name: copy.clearLocationSearch }));
    expect(screen.getByRole('option', { name: locale === 'ar' ? 'الحي الأول' : 'First District' })).toBeInTheDocument();
    expect(picker).toHaveValue(current.locationId);
    fireEvent.click(screen.getByRole('button', { name: copy.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(propertyId, 'location', expect.objectContaining({ locationId: current.locationId })));
  });

  it('fails closed for anonymous and forbidden property access without fallback data', async () => {
    const copy = getProviderPropertyCopy('en');
    renderWithLocale(<ProviderPropertyWizard locale="en" session={{ status: 'anonymous' }} step="location" propertyId={propertyId} load={vi.fn()} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();

    const forbidden = vi.fn(async () => { throw new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }); });
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} step="location" propertyId={propertyId} authClient={authClient} load={forbidden} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument());
    expect(screen.queryByDisplayValue('30.62')).not.toBeInTheDocument();
  });
});
