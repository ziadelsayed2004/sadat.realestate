import { fireEvent, screen, waitFor } from '@testing-library/react';
import { propertyDataSchema, propertyMediaDataSchema, type PropertyData, type PropertyMediaData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { getProviderPropertyCompletionCopy } from '../src/features/provider_property/completion-copy.ts';
import { getProviderPropertyCopy } from '../src/features/provider_property/copy.ts';
import { ProviderPropertyCompletionWizard, type ProviderPropertyAuthClient } from '../src/features/provider_property/index.ts';
import { deleteProviderPropertyMedia, loadProviderProperty, reorderProviderPropertyMedia, saveProviderPropertyStep, submitProviderProperty, uploadProviderPropertyMedia } from '../src/features/provider_property/data.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const mediaId = 'cccccccccccccccccccccccc';

function property(overrides: Partial<PropertyData> = {}): PropertyData {
  return propertyDataSchema.parse({
    id: propertyId,
    kind: 'property',
    name: { ar: 'عقار المزود', en: 'Provider property', 'zh-CN': '提供方房产' },
    slug: 'provider-property',
    transactionType: 'sale',
    source: { providerId, sourceType: 'individual_broker' },
    locationId: 'dddddddddddddddddddddddd',
    price: { amount: 1_000_000, currency: 'EGP' },
    contact: { contactName: 'Mona Hassan', phone: '+201000000000', preferredLocale: 'en' },
    status: 'draft',
    active: true,
    version: 2,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions: ['update', 'submit'],
    ...overrides
  });
}

function media(): PropertyMediaData {
  return propertyMediaDataSchema.parse({
    id: mediaId,
    propertyId,
    kind: 'image',
    originalFilename: 'front.jpg',
    detectedMime: 'image/jpeg',
    byteSize: 128,
    sha256: 'd'.repeat(64),
    sortOrder: 0,
    isCover: true,
    processingState: 'ready',
    active: true,
    version: 1,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T08:00:00.000Z'
  });
}

const session = { status: 'authenticated' as const, role: 'provider' as const };
const authClient: ProviderPropertyAuthClient = {
  getAuthorizationHeader: () => 'Bearer provider.completion.token',
  getSnapshot: () => ({ status: 'authenticated', user: { id: providerId, roleType: 'provider', status: 'verified' }, availableActions: [] })
};

function success(data: unknown, requestId: string): Response {
  return new Response(JSON.stringify({ data, meta: { requestId } }), { status: 200 });
}

describe('provider property media, contact, and review completion', () => {
  it('uses the implemented media, contact, and submit routes with authorization and strict payloads', async () => {
    const requests: Array<{ path: string; method: string; authorization: string | null; body?: unknown }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        const body = init?.body === undefined || typeof init.body !== 'string' ? undefined : JSON.parse(init.body) as unknown;
        requests.push({ path: url.pathname, method: init?.method ?? 'GET', authorization: new Headers(init?.headers).get('authorization'), ...(body === undefined ? {} : { body }) });
        if (url.pathname.endsWith('/media/order')) return success({ items: [media()] }, 'media-order');
        if (url.pathname.includes('/media/')) return success(media(), 'media-delete');
        if (url.pathname.endsWith('/media')) return success(media(), 'media-upload');
        if (url.pathname.includes('/steps/contact')) return success(property({ version: 3 }), 'contact-save');
        if (url.pathname.endsWith('/submit')) return success(property({ status: 'pending_review', version: 3, availableActions: [] }), 'property-submit');
        return success(property(), 'property-load');
      }
    });
    const file = new Blob(['jpeg'], { type: 'image/jpeg' });
    await expect(loadProviderProperty({ apiClient: client, authorization: authClient, propertyId })).resolves.toMatchObject({ id: propertyId });
    await expect(uploadProviderPropertyMedia({ apiClient: client, authorization: authClient, propertyId, file, filename: 'front.jpg', kind: 'image', contentType: 'image/jpeg' })).resolves.toMatchObject({ id: mediaId });
    await expect(reorderProviderPropertyMedia({ apiClient: client, authorization: authClient, propertyId, input: { version: 1, items: [{ mediaId, sortOrder: 0, isCover: true }], reason: 'Move cover media' } })).resolves.toHaveLength(1);
    await expect(deleteProviderPropertyMedia({ apiClient: client, authorization: authClient, propertyId, mediaId })).resolves.toMatchObject({ id: mediaId });
    await expect(saveProviderPropertyStep({ version: 2, contact: { phone: '+201000000000', preferredLocale: 'en' }, reason: 'Save contact details' }, { apiClient: client, authorization: authClient, propertyId, step: 'contact' })).resolves.toMatchObject({ id: propertyId });
    await expect(submitProviderProperty({ version: 2, reason: 'Submit property review' }, { apiClient: client, authorization: authClient, propertyId })).resolves.toMatchObject({ status: 'pending_review' });
    expect(requests.map(request => ({ path: request.path, method: request.method, authorization: request.authorization }))).toEqual([
      { path: `/api/v1/provider/properties/${propertyId}`, method: 'GET', authorization: 'Bearer provider.completion.token' },
      { path: `/api/v1/provider/properties/${propertyId}/media`, method: 'POST', authorization: 'Bearer provider.completion.token' },
      { path: `/api/v1/provider/properties/${propertyId}/media/order`, method: 'PATCH', authorization: 'Bearer provider.completion.token' },
      { path: `/api/v1/provider/properties/${propertyId}/media/${mediaId}`, method: 'DELETE', authorization: 'Bearer provider.completion.token' },
      { path: `/api/v1/provider/properties/${propertyId}/steps/contact`, method: 'PATCH', authorization: 'Bearer provider.completion.token' },
      { path: `/api/v1/provider/properties/${propertyId}/submit`, method: 'POST', authorization: 'Bearer provider.completion.token' }
    ]);
    expect(requests[4]?.body).toEqual({ version: 2, contact: { phone: '+201000000000', preferredLocale: 'en' }, reason: 'Save contact details' });
    expect(requests[5]?.body).toEqual({ version: 2, reason: 'Submit property review' });
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders PRV-08 through PRV-10 with safe projections and direction for %s', locale => {
    const result = renderWithLocale(<ProviderPropertyCompletionWizard locale={locale} session={session} authClient={authClient} step="contact" propertyId={propertyId} initialData={property()} />, { locale });
    const copy = getProviderPropertyCompletionCopy(locale);
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.titles.contact, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(copy.contact.internalNotesTitle)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-09"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|internalNotes|assignedTo|auditData/u);
    result.unmount();
  });

  it('validates media locally, uploads accepted files, and never renders private URL fields', async () => {
    const uploaded = vi.fn(async () => media());
    const copy = getProviderPropertyCompletionCopy('en');
    renderWithLocale(<ProviderPropertyCompletionWizard locale="en" session={session} authClient={authClient} step="media" propertyId={propertyId} initialData={property()} upload={uploaded} />, { locale: 'en' });
    const input = screen.getByLabelText(copy.media.chooseImage) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['jpeg'], 'front.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(uploaded).toHaveBeenCalledTimes(1));
    expect(uploaded).toHaveBeenCalledWith(expect.objectContaining({ propertyId, kind: 'image', contentType: 'image/jpeg', filename: 'front.jpg' }));
    expect(screen.getByText('front.jpg')).toBeInTheDocument();
    expect(screen.queryByText(/storageKey|https?:\/\//u)).not.toBeInTheDocument();
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'plan.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(screen.getByText(copy.media.invalidFileBody)).toBeInTheDocument());
  });

  it('requires server permission and all review confirmations before submit', async () => {
    const submit = vi.fn(async () => property({ status: 'pending_review', availableActions: [] }));
    const copy = getProviderPropertyCompletionCopy('en');
    renderWithLocale(<ProviderPropertyCompletionWizard locale="en" session={session} authClient={authClient} step="review" propertyId={propertyId} initialData={property()} submit={submit} />, { locale: 'en' });
    const submitButton = screen.getByRole('button', { name: copy.review.submit });
    expect(submitButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText(copy.review.accurateData));
    fireEvent.click(screen.getByLabelText(copy.review.authority));
    fireEvent.click(screen.getByLabelText(copy.review.reviewProcess));
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ version: 2, reason: 'Provider submitted property for review' }, expect.objectContaining({ propertyId })));
    expect(screen.getByText(copy.review.submittedTitle)).toBeInTheDocument();
  });

  it('fails closed for an anonymous session and provider permission errors', async () => {
    const copy = getProviderPropertyCompletionCopy('en');
    renderWithLocale(<ProviderPropertyCompletionWizard locale="en" session={{ status: 'anonymous' }} step="media" propertyId={propertyId} initialData={property()} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderPropertyCopy('en').states.permission.title })).toBeInTheDocument();

    const forbidden = vi.fn(async () => { throw new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }); });
    renderWithLocale(<ProviderPropertyCompletionWizard locale="en" session={session} authClient={authClient} step="media" propertyId={propertyId} load={forbidden} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getProviderPropertyCopy('en').states.permission.title, level: 3 })).toBeInTheDocument());
    expect(screen.queryByLabelText(copy.media.chooseImage)).not.toBeInTheDocument();
  });
});
