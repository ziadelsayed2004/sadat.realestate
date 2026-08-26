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
  name: { ar: 'منزل منشور', en: 'Published home', 'zh-CN': '已发布房产' },
  transactionType: 'sale',
  description: { ar: 'وصف المنزل المنشور', en: 'A published home description', 'zh-CN': '已发布房产描述' },
  area: { value: 120, unit: 'sqm' },
  layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
  price: { amount: 1_250_000, currency: 'EGP' },
  source: { sourceType: 'developer_company', organizationId: projectId },
  seo: {
    title: { ar: 'تفاصيل منزل منشور', en: 'Published home details', 'zh-CN': '已发布房产详情' },
    description: { ar: 'وصف محرك البحث', en: 'Search description', 'zh-CN': '搜索描述' },
    slug: 'published-home'
  },
  project: {
    id: projectId,
    slug: 'central-project',
    name: { ar: 'المشروع المركزي', en: 'Central project', 'zh-CN': '中央项目' },
    description: { ar: 'نبذة المشروع', en: 'Project description', 'zh-CN': '项目描述' }
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
    name: { ar: 'منزل مشابه', en: 'Related home', 'zh-CN': '相似房产' },
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
  it('uses the implemented details contract with one API prefix and a validated slug', async () => {
    let seenUrl = '';
    const client = new ApiClient({
      fetcher: async input => {
        seenUrl = String(input);
        return new Response(JSON.stringify({ data: detailsData, meta: { requestId: 'details-request' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
    });

    await expect(loadPublicPropertyDetails({ slug: detailsData.slug, apiClient: client })).resolves.toEqual(detailsData);
    expect(seenUrl).toBe('/api/v1/public/properties/published-home');
    expect(propertyDetailsSlugFromUrl('/properties/published-home?lang=en')).toBe('published-home');
    expect(propertyDetailsSlugFromUrl('/properties/published-home?%24where=true')).toBe('published-home');
    expect(propertyDetailsSlugFromUrl('/properties/invalid slug')).toBeUndefined();
    expect(publicPropertyDetailsUrl(detailsData.slug)).toBe('/properties/published-home');
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
    expect(screen.getAllByRole('status', { name: copy.imageUnavailable }).length).toBeGreaterThan(0);
    expect(result.container.querySelector('[data-page="public-property-details"]')).toHaveAttribute('data-details-state', 'success');
    expect(result.container.textContent).not.toContain('providerId');
    expect(result.container.textContent).not.toContain('storageKey');
    expect(result.container.textContent).not.toContain('sha256');
  });

  it('submits contact and viewing requests through injected implemented actions', async () => {
    const submitContact = vi.fn().mockResolvedValue(contactResponse);
    const submitViewing = vi.fn().mockResolvedValue(viewingResponse);
    const actions: PublicPropertyDetailsActions = { submitContact, submitViewing };
    const copy = getPublicPropertyDetailsCopy('en');
    renderWithLocale(<PublicPropertyDetails locale="en" url="/properties/published-home" initialData={detailsData} actions={actions} />, { locale: 'en' });

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Example Seeker' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '01001234567' } });
    fireEvent.change(screen.getByLabelText('Contact time'), { target: { value: 'morning' } });
    fireEvent.change(screen.getByLabelText(copy.messageLabel), { target: { value: 'Please share the details.' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitContact }));
    await waitFor(() => expect(submitContact).toHaveBeenCalledWith({
      message: 'Please share the details.',
      propertyId,
      projectId,
      locale: 'en'
    }));

    fireEvent.click(screen.getByRole('button', { name: copy.requestViewing }));
    const requestedAt = '2099-01-01T10:00';
    fireEvent.change(screen.getByLabelText(copy.requestedAt), { target: { value: requestedAt } });
    fireEvent.change(screen.getByLabelText(copy.timezone), { target: { value: 'Africa/Cairo' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitViewing }));
    await waitFor(() => expect(submitViewing).toHaveBeenCalledWith({
      propertyId,
      requestedAt: expect.any(String),
      timezone: 'Africa/Cairo'
    }));
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
