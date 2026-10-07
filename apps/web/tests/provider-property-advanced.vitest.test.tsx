import { fireEvent, screen, waitFor } from '@testing-library/react';
import { propertyDataSchema, publicHomepageCategorySchema, type PublicPropertyAmenity, type PropertyData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { getProviderPropertyAdvancedCopy } from '../src/features/provider_property/steps-copy.ts';
import { ProviderPropertyAdvancedWizard, type ProviderPropertyAuthClient } from '../src/features/provider_property/index.ts';
import { loadProviderProperty, loadProviderPropertyAmenities, saveProviderPropertyStep } from '../src/features/provider_property/data.ts';
import { getProviderPropertyCopy } from '../src/features/provider_property/copy.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { ApiClientError } from '../src/features/contracts/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const featureId = 'cccccccccccccccccccccccc';
const serviceId = 'dddddddddddddddddddddddd';
const amenities: PublicPropertyAmenity[] = [
  { id: featureId, kind: 'feature', groupKey: 'facilities', name: { ar: 'مصعد', en: 'Elevator' }, slug: 'elevator', order: 0 },
  { id: serviceId, kind: 'service', groupKey: 'nearby', name: { ar: 'مدرسة قريبة', en: 'Nearby school' }, slug: 'school', order: 1 }
];

function property(overrides: Partial<PropertyData> = {}): PropertyData {
  return propertyDataSchema.parse({
    id: propertyId,
    kind: 'property',
    name: { ar: 'عقار المزوّد', en: 'Provider property',},
    slug: 'provider-property',
    transactionType: 'sale',
    source: { providerId, sourceType: 'individual_broker' },
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
  getAuthorizationHeader: () => 'Bearer provider.advanced.token',
  getSnapshot: () => ({ status: 'authenticated', user: { id: providerId, roleType: 'provider', status: 'verified' }, availableActions: [] })
};

function success(data: unknown, requestId: string): Response {
  return new Response(JSON.stringify({ data, meta: { requestId } }), { status: 200 });
}

describe('Provider property advanced wizard steps', () => {
  it('uses only the implemented detail, pricing, and feature step routes', async () => {
    const requests: Array<{ path: string; method: string; authorization: string | null; json?: unknown }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        const body = init?.body === undefined || typeof init.body !== 'string' ? undefined : JSON.parse(init.body) as unknown;
        requests.push({ path: url.pathname, method: init?.method ?? 'GET', authorization: new Headers(init?.headers).get('authorization'), ...(body === undefined ? {} : { json: body }) });
        return success(property(), 'advanced-property');
      }
    });

    await expect(loadProviderProperty({ apiClient: client, authorization: authClient, propertyId })).resolves.toMatchObject({ id: propertyId });
    await expect(saveProviderPropertyStep({ version: 2, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3 }, reason: 'Save property details' }, { apiClient: client, authorization: authClient, propertyId, step: 'details' })).resolves.toMatchObject({ id: propertyId });
    await expect(saveProviderPropertyStep({ version: 2, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [], reason: 'Save property price' }, { apiClient: client, authorization: authClient, propertyId, step: 'price-payment' })).resolves.toMatchObject({ id: propertyId });
    await expect(saveProviderPropertyStep({ version: 2, featureIds: [featureId], serviceIds: [serviceId], reason: 'Save property features' }, { apiClient: client, authorization: authClient, propertyId, step: 'features-services' })).resolves.toMatchObject({ id: propertyId });
    expect(requests.map(request => ({ path: request.path, method: request.method, authorization: request.authorization }))).toEqual([
      { path: `/api/v1/provider/properties/${propertyId}`, method: 'GET', authorization: 'Bearer provider.advanced.token' },
      { path: `/api/v1/provider/properties/${propertyId}/steps/details`, method: 'PATCH', authorization: 'Bearer provider.advanced.token' },
      { path: `/api/v1/provider/properties/${propertyId}/steps/price-payment`, method: 'PATCH', authorization: 'Bearer provider.advanced.token' },
      { path: `/api/v1/provider/properties/${propertyId}/steps/features-services`, method: 'PATCH', authorization: 'Bearer provider.advanced.token' }
    ]);
    expect(requests[1]?.json).toEqual({ version: 2, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3 }, reason: 'Save property details' });
    expect(requests[2]?.json).toEqual({ version: 2, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [], reason: 'Save property price' });
  });

  it.each(['ar', 'en',] as const)('renders PRV-05, PRV-06, and PRV-07 with the approved direction for %s', async locale => {
    const current = property();
    const result = renderWithLocale(<ProviderPropertyAdvancedWizard locale={locale} session={session} authClient={authClient} step="details" propertyId={propertyId} initialData={current} loadPropertyTypes={vi.fn(async () => [])} />, { locale });
    const copy = getProviderPropertyAdvancedCopy(locale);
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.titles.details, level: 2 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(copy.propertyTypeCatalogEmptyTitle)).toBeInTheDocument());
    expect(result.container.querySelector('[data-screen-id="PRV-05"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|internalNotes|assignedTo|auditData/u);
    result.unmount();
  });

  it.each(['load', 'save'] as const)('renews an expired session once for a property %s without changing the save payload', async operation => {
    let token = 'expired';
    const refresh = vi.fn(async () => { token = 'renewed'; });
    const headers: Array<string | null> = [];
    const bodies: unknown[] = [];
    const client = new ApiClient({ fetcher: async (_input, init) => {
      headers.push(new Headers(init?.headers).get('authorization'));
      if (typeof init?.body === 'string') bodies.push(JSON.parse(init.body));
      if (headers.length === 1) return new Response(JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'expired' } }), { status: 401 });
      return success(property(), 'renewed-property');
    } });
    const options = { apiClient: client, authorization: { getAuthorizationHeader: () => `Bearer ${token}`, refresh }, propertyId };
    const input = { version: 2, featureIds: [featureId], serviceIds: [], reason: 'Save optional features' };
    const result = operation === 'load' ? await loadProviderProperty(options) : await saveProviderPropertyStep(input, { ...options, step: 'features-services' });
    expect(result.id).toBe(propertyId);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(headers).toEqual(['Bearer expired', 'Bearer renewed']);
    if (operation === 'save') expect(bodies).toEqual([input, input]);
  });

  it.each([403, 503])('never retries a rejected property mutation with status %s', async status => {
    const refresh = vi.fn(async () => undefined);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'REJECTED', messageKey: 'errors.forbidden', details: [], requestId: 'rejected' } }), { status }));
    await expect(saveProviderPropertyStep({ version: 2, featureIds: [], serviceIds: [], reason: 'Save optional features' }, { apiClient: new ApiClient({ fetcher }), authorization: { getAuthorizationHeader: () => 'Bearer current', refresh }, propertyId, step: 'features-services' })).rejects.toMatchObject({ status });
    expect(refresh).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('conditionally validates and saves property details through the shared schema', async () => {
    const save = vi.fn(async () => property({ version: 3, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 8 } }));
    const apartmentType = publicHomepageCategorySchema.parse({ id: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'apartment', name: { ar: 'شقة', en: 'Apartment' }, propertyCount: 4, order: 1 });
    const copy = getProviderPropertyAdvancedCopy('en');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="details" propertyId={propertyId} initialData={property()} save={save} loadPropertyTypes={vi.fn(async () => [apartmentType])} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Apartment' })).toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox', { name: copy.labels.propertyTypeId }), { target: { value: apartmentType.id } });
    fireEvent.change(screen.getByLabelText(copy.labels.area), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText(copy.labels.bedrooms), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(copy.labels.bathrooms), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(copy.labels.floor), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(copy.labels.totalFloors), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(copy.labels.deliveryStatus), { target: { value: 'ready_to_move' } });
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('en').wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(propertyId, 'details', expect.objectContaining({ version: 2, propertyTypeId: apartmentType.id, deliveryStatus: 'ready_to_move', area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 8 } }));
  });

  it('conditionally validates payment plans and keeps plan currencies aligned with price', async () => {
    const save = vi.fn(async () => property({ version: 3, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [{ name: { en: '12 month plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'EGP' } }] }));
    const loadCommission = vi.fn(async () => ({ accountId: providerId, source: 'policy' as const, effectiveAt: '2026-08-01T00:00:00.000Z', policyVersion: 3, kind: 'percentage' as const, percentageBps: 250, readOnly: true as const }));
    const copy = getProviderPropertyAdvancedCopy('en');
    const advancedCopy = getProviderPropertyAdvancedCopy('en');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="price-payment" propertyId={propertyId} initialData={property()} save={save} loadCommission={loadCommission} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('2.5%')).toBeInTheDocument());
    expect(screen.getByText(advancedCopy.commissionSources.policy)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(copy.labels.priceAmount), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText(copy.labels.currency), { target: { value: 'EGP' } });
    fireEvent.click(screen.getByLabelText(copy.labels.paymentPlan));
    fireEvent.change(screen.getByLabelText(copy.labels.planName), { target: { value: '12 month plan' } });
    fireEvent.change(screen.getByLabelText(copy.labels.installments), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(copy.labels.installmentAmount), { target: { value: '80000' } });
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('en').wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(propertyId, 'price-payment', expect.objectContaining({ version: 2, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [{ name: { en: '12 month plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'EGP' } }] }));
  });

  it('explains the exact floor error, retains the draft, and saves once corrected', async () => {
    const save = vi.fn(async () => property({ version: 3 }));
    const copy = getProviderPropertyAdvancedCopy('ar');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="ar" session={session} authClient={authClient} step="details" propertyId={propertyId} initialData={property()} save={save} loadPropertyTypes={vi.fn(async () => [])} />, { locale: 'ar' });
    fireEvent.change(screen.getByLabelText(copy.labels.floor), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(copy.labels.totalFloors), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(copy.labels.description), { target: { value: 'وصف العقار محفوظ' } });
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('ar').wizard.saveDraft }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('الطابق أكبر من إجمالي طوابق المبنى');
    expect(screen.getByLabelText(copy.labels.floor)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(copy.labels.description)).toHaveValue('وصف العقار محفوظ');
    fireEvent.change(screen.getByLabelText(copy.labels.totalFloors), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('ar').wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(propertyId, 'details', expect.objectContaining({ layout: { floor: 3, totalFloors: 4 } })));
  });

  it('never replaces a failed property-type list with a technical ID text field', async () => {
    const copy = getProviderPropertyAdvancedCopy('en');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="details" propertyId={propertyId} initialData={property({ propertyTypeId: featureId })} loadPropertyTypes={vi.fn(async () => { throw new Error('offline'); })} />, { locale: 'en' });
    await screen.findByText(copy.propertyTypeCatalogUnavailableTitle);
    expect(screen.getByRole('combobox', { name: copy.labels.propertyTypeId })).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: copy.labels.propertyTypeId })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(featureId);
  });

  it('identifies invalid area as the area field while preserving other details', () => {
    const save = vi.fn(async () => property());
    const copy = getProviderPropertyAdvancedCopy('en');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="details" propertyId={propertyId} initialData={property()} save={save} loadPropertyTypes={vi.fn(async () => [])} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.labels.area), { target: { value: '-1' } });
    fireEvent.change(screen.getByLabelText(copy.labels.description), { target: { value: 'Retain this description' } });
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('en').wizard.saveDraft }));
    expect(screen.getByRole('alert')).toHaveTextContent('Check: Area (sqm)');
    expect(screen.getByLabelText(copy.labels.area)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(copy.labels.description)).toHaveValue('Retain this description');
    expect(save).not.toHaveBeenCalled();
  });

  it.each(['ar', 'en'] as const)('saves named optional feature and service checkboxes for %s', async locale => {
    const save = vi.fn(async () => property({ version: 3, featureIds: [featureId], serviceIds: [serviceId] }));
    renderWithLocale(<ProviderPropertyAdvancedWizard locale={locale} session={session} authClient={authClient} step="features-services" propertyId={propertyId} initialData={property()} save={save} loadAmenities={vi.fn(async () => amenities)} />, { locale });
    fireEvent.click(await screen.findByRole('checkbox', { name: amenities[0]!.name[locale]! }));
    fireEvent.click(screen.getByRole('checkbox', { name: amenities[1]!.name[locale]! }));
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy(locale).wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(propertyId, 'features-services', expect.objectContaining({ version: 2, featureIds: [featureId], serviceIds: [serviceId] })));
    expect(screen.queryByRole('textbox', { name: getProviderPropertyAdvancedCopy(locale).labels.featureIds })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(featureId);
  });

  it('allows saving no selections even when the catalog fails', async () => {
    const save = vi.fn(async () => property({ version: 3, featureIds: [], serviceIds: [] }));
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="features-services" propertyId={propertyId} initialData={property()} save={save} loadAmenities={vi.fn(async () => { throw new Error('offline'); })} />, { locale: 'en' });
    await screen.findByText(getProviderPropertyAdvancedCopy('en').featureCatalogUnavailableTitle);
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('en').wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(propertyId, 'features-services', expect.objectContaining({ featureIds: [], serviceIds: [] })));
  });

  it('loads only safe public names from the catalog and requests amenities explicitly', async () => {
    const client = new ApiClient({ fetcher: async input => {
      const url = new URL(String(input), 'http://local');
      expect(url.searchParams.get('includeAmenities')).toBe('true');
      return success({ items: [], categories: [], propertyTypes: [], amenities, page: 1, limit: 1, total: 0 }, 'amenities');
    } });
    await expect(loadProviderPropertyAmenities({ apiClient: client })).resolves.toEqual(amenities);
  });

  it('retains prior selections and permits removing them after reopening', async () => {
    const save = vi.fn(async () => property({ version: 3, featureIds: [], serviceIds: [] }));
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="features-services" propertyId={propertyId} initialData={property({ featureIds: [featureId], serviceIds: [serviceId] })} save={save} loadAmenities={vi.fn(async () => amenities)} />, { locale: 'en' });
    const checkbox = await screen.findByRole('checkbox', { name: 'Elevator' });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nearby school' }));
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('en').wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(propertyId, 'features-services', expect.objectContaining({ featureIds: [], serviceIds: [] })));
  });

  it('fails closed for anonymous and forbidden property access', async () => {
    const copy = getProviderPropertyCopy('en');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={{ status: 'anonymous' }} step="details" propertyId={propertyId} initialData={property()} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
    expect(screen.queryByLabelText(getProviderPropertyAdvancedCopy('en').labels.area)).not.toBeInTheDocument();

    const forbidden = vi.fn(async () => { throw new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }); });
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="details" propertyId={propertyId} load={forbidden} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument());
    expect(screen.queryByLabelText(getProviderPropertyAdvancedCopy('en').labels.area)).not.toBeInTheDocument();
  });
});
