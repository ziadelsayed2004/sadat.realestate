import { fireEvent, screen, waitFor } from '@testing-library/react';
import { propertyDataSchema, publicPropertyLocationSchema, type PropertyData } from '@sadat-real-estate/contracts';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { getProviderPropertyCopy } from '../src/features/provider_property/copy.ts';
import { loadProviderProperty, saveProviderPropertyStep } from '../src/features/provider_property/data.ts';
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
      mapUrl: 'https://maps.example.com/?q=30.62%2C30.74',
      reason: 'Save property location'
    };

    await expect(saveProviderPropertyStep(location, { apiClient: client, authorization: authClient, propertyId, step: 'location' })).resolves.toMatchObject({ id: propertyId });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual(location);

    for (const mapUrl of ['http://maps.example.com', '/relative-map', 'javascript:alert(1)', `https://maps.example.com/${'a'.repeat(2048)}`]) {
      await expect(saveProviderPropertyStep({ version: 2, mapUrl, reason: 'Reject unsafe map URL' }, { apiClient: client, authorization: authClient, propertyId, step: 'location' })).rejects.toThrow();
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['ar', 'en',] as const)('renders the approved wizard direction and contract boundary for %s', locale => {
    const result = renderWithLocale(<ProviderPropertyWizard locale={locale} session={session} authClient={authClient} step="basic" />, { locale });
    const copy = getProviderPropertyCopy(locale);
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.wizard.basicTitle, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(copy.wizard.labels.name)).toBeInTheDocument();
    expect(screen.getByText(copy.wizard.contractBoundaryTitle)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-03"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|internalNotes|assignedTo|auditData/u);
    result.unmount();
  });

  it('validates the real create contract, derives the provider identity from the session, and saves a draft', async () => {
    const create = vi.fn(async (input: Parameters<NonNullable<ComponentProps<typeof ProviderPropertyWizard>['create']>>[0]) => property({ id: 'dddddddddddddddddddddddd', name: input.name, slug: input.slug, source: input.source, version: 0, locationId: undefined, coordinates: undefined }));
    const copy = getProviderPropertyCopy('en');
    renderWithLocale(<ProviderPropertyWizard locale="en" session={session} authClient={authClient} step="basic" create={create} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.name), { target: { value: 'Sadat apartment' } });
    fireEvent.change(screen.getByLabelText(copy.wizard.labels.slug), { target: { value: 'sadat-apartment' } });
    fireEvent.change(screen.getByRole('combobox', { name: copy.wizard.labels.sourceType }), { target: { value: 'individual_broker' } });
    fireEvent.click(screen.getByRole('button', { name: copy.wizard.saveDraft }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: { en: 'Sadat apartment' },
      slug: 'sadat-apartment',
      source: { providerId, sourceType: 'individual_broker' }
    }));
    expect(screen.getByRole('status')).toHaveTextContent(copy.wizard.saved);
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
