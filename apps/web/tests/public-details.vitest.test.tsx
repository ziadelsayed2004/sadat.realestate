import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  publicPropertyDetailsSchema,
  requestDataSchema,
  viewingDataSchema
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  PublicPropertyDetails,
  createPublicPropertyDetailsActions,
  getPublicPropertyDetailsCopy,
  loadPublicPropertyDetails,
  propertyDetailsSlugFromUrl,
  publicPropertyDetailsUrl,
  type PublicPropertyDetailsActions
} from '../src/features/public/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const propertyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const projectId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const mediaId = 'cccccccccccccccccccccccc';
const relatedId = 'dddddddddddddddddddddddd';

const detailsData = publicPropertyDetailsSchema.parse({
  id: propertyId,
  slug: 'published-home',
  kind: 'property',
  name: { ar: 'منزل منشور', en: 'Published home',},
  transactionType: 'sale',
  mapUrl: 'https://maps.google.com/?q=Sadat+City',
  description: { ar: 'وصف المنزل المنشور', en: 'A published home description',},
  area: { value: 120, unit: 'sqm' },
  layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
  price: { amount: 1_250_000, currency: 'EGP' },
  source: { sourceType: 'developer_company', organizationId: projectId },
  seo: {
    title: { ar: 'تفاصيل منزل منشور', en: 'Published home details',},
    description: { ar: 'وصف محرك البحث', en: 'Search description',},
    slug: 'published-home'
  },
  project: {
    id: projectId,
    slug: 'central-project',
    name: { ar: 'المشروع المركزي', en: 'Central project',},
    description: { ar: 'نبذة المشروع', en: 'Project description',}
  },
  media: [{
    id: mediaId,
    propertyId,
    kind: 'image',
    originalFilename: 'front.jpg',
    detectedMime: 'image/jpeg',
    byteSize: 12_345,
    sortOrder: 0,
    isCover: true
  }],
  features: [],
  services: [],
  relatedProperties: [{
    id: relatedId,
    slug: 'related-home',
    kind: 'unit',
    name: { ar: 'منزل مشابه', en: 'Related home',},
    transactionType: 'rent',
    price: { amount: 20_000, currency: 'EGP' }
  }]
});

const contactResponse = requestDataSchema.parse({
  id: 'eeeeeeeeeeeeeeeeeeeeeeee',
  type: 'contact',
  source: 'seeker',
  seekerId: 'ffffffffffffffffffffffff',
  propertyId,
  status: 'new',
  payload: { message: 'Please share the details.' },
  version: 0,
  availableActions: [],
  createdAt: '2026-08-16T08:00:00.000Z',
  updatedAt: '2026-08-16T08:00:00.000Z'
});

const viewingResponse = viewingDataSchema.parse({
  id: '111111111111111111111111',
  propertyId,
  seekerId: 'ffffffffffffffffffffffff',
  status: 'requested',
  requestedAt: '2026-08-17T08:00:00.000Z',
  timezone: 'Africa/Cairo',
  version: 0,
  createdAt: '2026-08-16T08:00:00.000Z',
  updatedAt: '2026-08-16T08:00:00.000Z'
});

describe('public property details', () => {
  it('saves the property through the authenticated API and exposes the saved-properties destination', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('PUT');
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer seeker-token');
      return new Response(JSON.stringify({ data: { saved: true, alreadySaved: false, item: { id: detailsData.id, slug: detailsData.slug, kind: detailsData.kind, name: detailsData.name, transactionType: detailsData.transactionType, savedAt: '2026-09-09T00:00:00.000Z' } }, meta: { requestId: 'favorite-save' } }), { headers: { 'content-type': 'application/json' } });
    });
    const actions = createPublicPropertyDetailsActions({ apiClient: new ApiClient({ fetcher }), authorizationHeader: 'Bearer seeker-token' });
    renderWithLocale(<PublicPropertyDetails locale="en" initialData={detailsData} url="/properties/published-home" actions={actions} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));
    await screen.findByRole('link', { name: 'View saved properties' });
    expect(fetcher).toHaveBeenCalledWith(`/api/v1/seeker/favorites/${propertyId}`, expect.any(Object));
    expect(screen.getByRole('button', { name: 'Property saved' })).toBeDisabled();
  });

  it('uses the implemented details contract with one API prefix and a validated slug', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    const client = new ApiClient({
      fetcher: async (input, init) => {
        seenUrl = String(input);
        seenInit = init;
        return new Response(JSON.stringify({ data: detailsData, meta: { requestId: 'details-request' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
    });

    await expect(loadPublicPropertyDetails({ slug: detailsData.slug, apiClient: client, authorizationHeader: 'Bearer seeker-token' })).resolves.toEqual(detailsData);
    expect(seenUrl).toBe('/api/v1/public/properties/published-home');
    expect(new Headers(seenInit?.headers).get('authorization')).toBe('Bearer seeker-token');
    expect(propertyDetailsSlugFromUrl('/properties/published-home?lang=en')).toBe('published-home');
    expect(propertyDetailsSlugFromUrl('/properties/published-home?%24where=true')).toBe('published-home');
    expect(propertyDetailsSlugFromUrl('/properties/invalid slug')).toBeUndefined();
    expect(publicPropertyDetailsUrl(detailsData.slug)).toBe('/properties/published-home');
  });

  it('does not render private provider contact details even if a cached API response includes them', () => {
    const authorized = publicPropertyDetailsSchema.parse({
      ...detailsData,
      contact: { contactName: 'Sales desk', phone: '+201234567890', email: 'sales@example.com' }
    });
    const result = renderWithLocale(
      <PublicPropertyDetails locale="en" url="/properties/published-home" initialData={authorized} />,
      { locale: 'en' }
    );
    expect(result.container.querySelector('[data-contact-revealed="true"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '+201234567890' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'sales@example.com' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sales desk')).not.toBeInTheDocument();
  });

  it('removes authorized contacts immediately on logout and reloads the guest projection', async () => {
    const authorized = publicPropertyDetailsSchema.parse({
      ...detailsData,
      contact: { phone: '+201234567890' }
    });
    let token: string | undefined = 'Bearer seeker';
    const authClient = { getAuthorizationHeader: () => token };
    let finishGuest: ((value: typeof detailsData) => void) | undefined;
    const load = vi.fn()
      .mockResolvedValueOnce(authorized)
      .mockImplementationOnce(() => new Promise<typeof detailsData>(resolve => { finishGuest = resolve; }));
    const page = () => <PublicPropertyDetails locale="en" url="/properties/published-home" initialData={detailsData} authClient={authClient} load={load} />;
    const result = renderWithLocale(page(), { locale: 'en' });
    await waitFor(() => expect(screen.queryByRole('link', { name: '+201234567890' })).not.toBeInTheDocument());

    token = undefined;
    result.rerender(page());
    expect(screen.queryByRole('link', { name: '+201234567890' })).not.toBeInTheDocument();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    finishGuest?.(detailsData);
    await screen.findByRole('heading', { name: 'Published home', level: 1 });
    expect(result.container.querySelector('[data-contact-revealed="true"]')).not.toBeInTheDocument();
  });

  it.each(['ar', 'en'] as const)('renders the localized public projection and safe media state for %s', locale => {
    const copy = getPublicPropertyDetailsCopy(locale);
    const result = renderWithLocale(
      <PublicPropertyDetails locale={locale} url={`/properties/${detailsData.slug}?lang=${locale}`} initialData={detailsData} />,
      { locale }
    );

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: detailsData.name[locale] ?? detailsData.slug, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(copy.sourceTypes.developer_company)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: copy.sourceTitle, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: copy.relatedTitle, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.openMap })).toHaveAttribute('href', detailsData.mapUrl);
    expect(screen.getByRole('link', { name: copy.openMap })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: copy.openMap })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getAllByRole('status', { name: copy.imageUnavailable }).length).toBeGreaterThan(0);
    expect(result.container.querySelector('[data-page="public-property-details"]')).toHaveAttribute('data-details-state', 'success');
    expect(result.container.textContent).not.toContain('providerId');
    expect(result.container.textContent).not.toContain('storageKey');
    expect(result.container.textContent).not.toContain('sha256');
    expect(screen.queryByRole('link', { name: locale === 'ar' ? 'تواصل عبر واتساب' : 'Contact on WhatsApp' })).toBeNull();
  });

  it('keeps an entered draft mounted while the session token changes and its read fails', async () => {
    const credentials = { token: undefined as string | undefined };
    let failRead: ((error: Error) => void) | undefined;
    const load = vi.fn(() => new Promise<typeof detailsData>((_resolve, reject) => { failRead = reject; }));
    const authClient = { getAuthorizationHeader: () => credentials.token };
    const page = () => <PublicPropertyDetails locale="en" url="/properties/published-home" initialData={detailsData} authClient={authClient} load={load} />;
    const result = renderWithLocale(page(), { locale: 'en' });
    const input = screen.getByLabelText('Full name');
    fireEvent.change(input, { target: { value: 'Keep this draft' } });
    credentials.token = 'Bearer restored-token';
    result.rerender(page());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Full name')).toBe(input);
    expect(input).toHaveValue('Keep this draft');
    failRead?.(new Error('Temporary network error'));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Full name')).toBe(input);
    expect(input).toHaveValue('Keep this draft');
  });

  it('removes protected contacts when a retained page read loses permission', async () => {
    const authorized = publicPropertyDetailsSchema.parse({ ...detailsData, contact: { phone: '+201234567890' } });
    const authClient = { getAuthorizationHeader: () => 'Bearer seeker' };
    const load = vi.fn().mockResolvedValue(authorized);
    const result = renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/published-home" initialData={detailsData} authClient={authClient} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.queryByRole('link', { name: '+201234567890' })).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Keep this draft' } });
    const revokedLoad = vi.fn().mockRejectedValue(new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }));
    result.rerender(<PublicPropertyDetails locale="en" url="/properties/published-home" initialData={detailsData} authClient={authClient} load={revokedLoad} />);
    await screen.findByRole('alert');
    expect(screen.queryByRole('link', { name: '+201234567890' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Keep this draft');
  });

  it('uses a published property cover as the gallery when no ready media rows exist', () => {
    const fallbackImage = '/assets/canonical/public/listing-property-duplex.png';
    const fallbackData = publicPropertyDetailsSchema.parse({
      ...detailsData,
      imageUrl: fallbackImage,
      media: []
    });

    const result = renderWithLocale(
      <PublicPropertyDetails locale="en" url="/properties/published-home" initialData={fallbackData} />,
      { locale: 'en' }
    );

    expect(result.container.querySelector('[data-gallery] img')).toHaveAttribute('src', fallbackImage);
    expect(result.container.querySelector('[data-gallery] [data-state="missing_image"]')).not.toBeInTheDocument();
    expect(result.container.querySelector('.public-property-details__media-note')).not.toBeInTheDocument();
  });

  it('matches the canonical details composition by rendering one related property card', () => {
    const result = renderWithLocale(
      <PublicPropertyDetails locale="en" url="/properties/published-home" initialData={detailsData} />,
      { locale: 'en' }
    );

    expect(result.container.querySelectorAll('.public-property-details__related-card')).toHaveLength(1);
  });

  it.each(['javascript:alert(1)', 'http://maps.example.com/sadat', 'data:text/plain,sadat'])('fails closed when an unsafe map URL reaches the view: %s', mapUrl => {
    const unsafeData = { ...detailsData, mapUrl } as typeof detailsData;
    const copy = getPublicPropertyDetailsCopy('en');
    renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/published-home" initialData={unsafeData} />, { locale: 'en' });

    expect(screen.queryByRole('link', { name: copy.openMap })).not.toBeInTheDocument();
  });

  it('submits contact and viewing requests through injected implemented actions', async () => {
    const submitContact = vi.fn().mockResolvedValue(contactResponse);
    const submitViewing = vi.fn().mockResolvedValue(viewingResponse);
    const actions: PublicPropertyDetailsActions = { submitContact, submitViewing };
    const copy = getPublicPropertyDetailsCopy('en');
    renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/published-home" initialData={detailsData} actions={actions} />, { locale: 'en' });

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Example Seeker' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '01001234567' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Contact time' }), { target: { value: 'morning' } });
    fireEvent.change(screen.getByLabelText(copy.messageLabel), { target: { value: 'Please share the details.' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitContact }));
    await waitFor(() => expect(submitContact).toHaveBeenCalledWith({
      message: 'Please share the details.',
      fullName: 'Example Seeker',
      phone: '01001234567',
      contactChannel: 'platform',
      organizationId: projectId,
      preferredContactTime: 'morning',
      propertyId,
      projectId,
      locale: 'en'
    }));

    fireEvent.click(screen.getByRole('button', { name: copy.requestViewing }));
    const requestedAt = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    fireEvent.change(screen.getByLabelText(copy.requestedAt), { target: { value: requestedAt } });
    expect(screen.getByLabelText(copy.timezone)).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: copy.submitViewing }));
    await waitFor(() => expect(submitViewing).toHaveBeenCalledWith({
      propertyId,
      requestedAt: expect.any(String),
      timezone: 'Africa/Cairo'
    }));
    expect(screen.getByRole('dialog')).toHaveTextContent(copy.actionSuccessTitle);
    expect(screen.getByLabelText(copy.requestedAt)).toHaveValue(requestedAt);
    expect(screen.getByRole('button', { name: copy.submitViewing })).toBeDisabled();
  });

  it.each([
    [409, 'REQUEST_DUPLICATE', 'This request has already been sent. Check your requests in your account.'],
    [429, 'REQUEST_RATE_LIMITED', 'You have sent several requests recently. Wait a minute, then try again.'],
    [404, 'REQUEST_NOT_FOUND', 'The property or contact destination is no longer available. Refresh the page or choose the platform team.'],
    [400, 'VALIDATION_ERROR', 'Check your name, phone number and contact time. The message must be no longer than 2,000 characters.'],
    [500, 'INTERNAL_ERROR', 'The request could not be recorded right now. Please try again shortly.']
  ] as const)('explains contact failure %s and retains the lead fields', async (status, code, body) => {
    const copy = getPublicPropertyDetailsCopy('en');
    const submitContact = vi.fn().mockRejectedValue(new ApiClientError('Request failed', { code: 'HTTP_ERROR', status, apiError: { code, messageKey: 'errors.requestFailed', details: [], requestId: 'contact-failure' } }));
    renderWithLocale(<PublicPropertyDetails locale="en" initialData={detailsData} url="/properties/published-home" actions={{ submitContact, submitViewing: vi.fn() }} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.fullName), { target: { value: 'Example Seeker' } });
    fireEvent.change(screen.getByLabelText(copy.phoneNumber), { target: { value: '01039938831' } });
    fireEvent.change(screen.getByLabelText(copy.contactTime, { selector: 'select' }), { target: { value: 'morning' } });
    fireEvent.change(screen.getByLabelText(copy.messageLabel), { target: { value: 'Please call me' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitContact }));
    expect(await screen.findByText(body)).toBeVisible();
    expect(screen.getByLabelText(copy.phoneNumber)).toHaveValue('01039938831');
    expect(screen.getByLabelText(copy.messageLabel)).toHaveValue('Please call me');
    expect(submitContact).toHaveBeenCalledTimes(1);
  });

  it('validates a malformed phone before making the contact request', async () => {
    const copy = getPublicPropertyDetailsCopy('en');
    const submitContact = vi.fn();
    renderWithLocale(<PublicPropertyDetails locale="en" initialData={detailsData} url="/properties/published-home" actions={{ submitContact, submitViewing: vi.fn() }} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText(copy.fullName), { target: { value: 'Example Seeker' } });
    fireEvent.change(screen.getByLabelText(copy.phoneNumber), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText(copy.contactTime, { selector: 'select' }), { target: { value: 'morning' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitContact }));
    expect(screen.getByText(copy.contactValidation)).toBeVisible();
    expect(submitContact).not.toHaveBeenCalled();
  });

  it.each(['2000-01-01T10:00', '2099-01-01T10:00', ''])('rejects an out-of-range viewing date %s without losing the note', async requestedAt => {
    const submitViewing = vi.fn();
    const copy = getPublicPropertyDetailsCopy('en');
    renderWithLocale(<PublicPropertyDetails locale="en" initialData={detailsData} url="/properties/published-home" actions={{ submitContact: vi.fn(), submitViewing }} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: copy.requestViewing }));
    fireEvent.change(screen.getByLabelText(copy.requestedAt), { target: { value: requestedAt } });
    fireEvent.change(screen.getByLabelText(copy.note), { target: { value: 'Keep my note' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitViewing }));
    expect(screen.getByRole('alert')).toHaveTextContent(copy.viewingValidation);
    expect(screen.getByLabelText(copy.note)).toHaveValue('Keep my note');
    expect(submitViewing).not.toHaveBeenCalled();
  });

  it('sends the current authenticated session and complete lead fields to the contact API', async () => {
    let requestInit: RequestInit | undefined;
    const client = new ApiClient({
      fetcher: async (_input, init) => {
        requestInit = init;
        return new Response(JSON.stringify({ data: contactResponse, meta: { requestId: 'contact-request' } }), {
          status: 201,
          headers: { 'content-type': 'application/json' }
        });
      }
    });
    const actions = createPublicPropertyDetailsActions({
      apiClient: client,
      authorizationHeader: () => 'Bearer current-session-token'
    });

    await expect(actions.submitContact({
      message: 'Please share the details.',
      fullName: 'Example Seeker',
      phone: '+201001234567',
      preferredContactTime: 'evening',
      propertyId,
      projectId,
      locale: 'en'
    })).resolves.toEqual(contactResponse);

    expect(new Headers(requestInit?.headers).get('authorization')).toBe('Bearer current-session-token');
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      message: 'Please share the details.',
      fullName: 'Example Seeker',
      phone: '+201001234567',
      preferredContactTime: 'evening',
      propertyId,
      projectId,
      locale: 'en'
    });
  });

  it.each(['ar', 'en'] as const)('keeps the form and success message mounted during the authorized contact refresh for %s', async locale => {
    const copy = getPublicPropertyDetailsCopy(locale);
    let finishRefresh: ((value: typeof detailsData) => void) | undefined;
    const load = vi.fn().mockResolvedValueOnce(detailsData).mockImplementationOnce(() => new Promise<typeof detailsData>(resolve => { finishRefresh = resolve; }));
    const submitContact = vi.fn().mockResolvedValue(contactResponse);
    const result = renderWithLocale(<PublicPropertyDetails locale={locale} url="/properties/published-home" authClient={{ getAuthorizationHeader: () => 'Bearer seeker' }} load={load} actions={{ submitContact, submitViewing: vi.fn() }} />, { locale });
    await screen.findByRole('heading', { name: detailsData.name[locale] ?? detailsData.slug, level: 1 });
    const form = screen.getByRole('form', { name: copy.contactTitle });
    fireEvent.change(screen.getByLabelText(copy.fullName), { target: { value: 'Example Seeker' } });
    fireEvent.change(screen.getByLabelText(copy.phoneNumber), { target: { value: '01001234567' } });
    fireEvent.change(screen.getByRole('combobox', { name: copy.contactTime }), { target: { value: 'morning' } });
    fireEvent.change(screen.getByLabelText(copy.messageLabel), { target: { value: 'Please share the details.' } });
    fireEvent.submit(form);
    await screen.findByText(copy.actionSuccessTitle);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('form', { name: copy.contactTitle })).toBe(form);
    expect(result.container.querySelector('[data-details-state="success"]')).toBeInTheDocument();
    finishRefresh?.({ ...detailsData, contact: { phone: '+201234567890' } });
    await waitFor(() => expect(screen.queryByRole('link', { name: '+201234567890' })).not.toBeInTheDocument());
    expect(screen.getByRole('form', { name: copy.contactTitle })).toBe(form);
    expect(screen.getByLabelText(copy.fullName)).toHaveValue('Example Seeker');
    expect(screen.getByLabelText(copy.phoneNumber)).toHaveValue('01001234567');
    expect(screen.getByRole('combobox', { name: copy.contactTime })).toHaveValue('morning');
    expect(screen.getByLabelText(copy.messageLabel)).toHaveValue('Please share the details.');
    expect(form.querySelector('[role="status"]')).toHaveTextContent(copy.actionSuccessTitle);
  });

  it('retains a successful send if the background contact read fails', async () => {
    const copy = getPublicPropertyDetailsCopy('en');
    const load = vi.fn().mockResolvedValueOnce(detailsData).mockRejectedValueOnce(new Error('offline'));
    renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/published-home" authClient={{ getAuthorizationHeader: () => 'Bearer seeker' }} load={load} actions={{ submitContact: vi.fn().mockResolvedValue(contactResponse), submitViewing: vi.fn() }} />, { locale: 'en' });
    await screen.findByRole('heading', { name: 'Published home', level: 1 });
    fireEvent.change(screen.getByLabelText(copy.fullName), { target: { value: 'Example Seeker' } });
    fireEvent.change(screen.getByLabelText(copy.phoneNumber), { target: { value: '01001234567' } });
    fireEvent.change(screen.getByRole('combobox', { name: copy.contactTime }), { target: { value: 'morning' } });
    fireEvent.submit(screen.getByRole('form', { name: copy.contactTitle }));
    await screen.findByText(copy.actionSuccessTitle);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('form', { name: copy.contactTitle })).toBeInTheDocument();
    expect(screen.queryByText(copy.actionErrorTitle)).not.toBeInTheDocument();
  });

  it('renders loading, retry, permission, and not-found states without exposing protected data', async () => {
    const copy = getPublicPropertyDetailsCopy('en');
    const pendingLoad = vi.fn(() => new Promise<typeof detailsData>(() => undefined));
    renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/published-home" load={pendingLoad} />, { locale: 'en' });
    expect(screen.getByRole('status', { name: copy.loadingTitle })).toBeInTheDocument();

    const retryLoad = vi.fn().mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' })).mockResolvedValueOnce(detailsData);
    renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/published-home" load={retryLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('status', { name: copy.retryTitle })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Published home', level: 1 })).toBeInTheDocument());

    const permissionLoad = vi.fn().mockRejectedValue(new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }));
    renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/published-home" load={permissionLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('alert', { name: copy.permissionTitle })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: copy.actionPermissionLink })).toHaveAttribute('href', expect.stringContaining('/auth/login?returnTo='));

    renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/not a slug" initialState="not_found" />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.notFoundTitle, level: 1 })).toBeInTheDocument();
  });
});
