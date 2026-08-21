import { fireEvent, screen, waitFor } from '@testing-library/react';
import { propertyDataSchema, type PropertyData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { getProviderPropertyAdvancedCopy } from '../src/features/provider_property/steps-copy.ts';
import { ProviderPropertyAdvancedWizard, type ProviderPropertyAuthClient } from '../src/features/provider_property/index.ts';
import { loadProviderProperty, saveProviderPropertyStep } from '../src/features/provider_property/data.ts';
import { getProviderPropertyCopy } from '../src/features/provider_property/copy.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { ApiClientError } from '../src/features/contracts/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const featureId = 'cccccccccccccccccccccccc';
const serviceId = 'dddddddddddddddddddddddd';

function property(overrides: Partial<PropertyData> = {}): PropertyData {
  return propertyDataSchema.parse({
    id: propertyId,
    kind: 'property',
    name: { ar: 'عقار المزوّد', en: 'Provider property', 'zh-CN': '提供方房产' },
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

  it.each(['ar', 'en', 'zh-CN'] as const)('renders PRV-05, PRV-06, and PRV-07 with the approved direction for %s', locale => {
    const current = property();
    const result = renderWithLocale(<ProviderPropertyAdvancedWizard locale={locale} session={session} authClient={authClient} step="details" propertyId={propertyId} initialData={current} />, { locale });
    const copy = getProviderPropertyAdvancedCopy(locale);
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.titles.details, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(copy.propertyTypeCatalogUnavailableTitle)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-05"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|internalNotes|assignedTo|auditData/u);
    result.unmount();
  });

  it('conditionally validates and saves property details through the shared schema', async () => {
    const save = vi.fn(async () => property({ version: 3, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 8 } }));
    const copy = getProviderPropertyAdvancedCopy('en');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="details" propertyId={propertyId} initialData={property()} save={save} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.labels.area), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText(copy.labels.bedrooms), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(copy.labels.bathrooms), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(copy.labels.floor), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(copy.labels.totalFloors), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('en').wizard.saveDraft }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(propertyId, 'details', expect.objectContaining({ version: 2, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 8 } }));
  });

  it('conditionally validates payment plans and keeps plan currencies aligned with price', async () => {
    const save = vi.fn(async () => property({ version: 3, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [{ name: { en: '12 month plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'EGP' } }] }));
    const copy = getProviderPropertyAdvancedCopy('en');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="price-payment" propertyId={propertyId} initialData={property()} save={save} />, { locale: 'en' });
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

  it('rejects overlapping feature and service references before the API call', async () => {
    const save = vi.fn(async () => property({ version: 3 }));
    const copy = getProviderPropertyAdvancedCopy('en');
    renderWithLocale(<ProviderPropertyAdvancedWizard locale="en" session={session} authClient={authClient} step="features-services" propertyId={propertyId} initialData={property()} save={save} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.labels.featureIds), { target: { value: `${featureId}, ${serviceId}` } });
    fireEvent.change(screen.getByLabelText(copy.labels.serviceIds), { target: { value: serviceId } });
    fireEvent.click(screen.getByRole('button', { name: getProviderPropertyCopy('en').wizard.saveDraft }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.invalidReference);
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
