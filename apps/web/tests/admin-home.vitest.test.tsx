import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  adBannerListDataSchema,
  cmsAdminContentDataSchema,
  type CmsAdminContentData
} from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  AdminHome,
  createAdminHomeSource,
  loadAdminBanners,
  loadAdminHomeContent,
  updateAdminHomeContent
} from '../src/features/admin_home/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const adminId = 'cccccccccccccccccccccccc';
const bannerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const tipId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const homepageId = 'dddddddddddddddddddddddd';
const session = { status: 'authenticated' as const, role: 'admin' as const };

function tipsContent(data: CmsAdminContentData): Extract<CmsAdminContentData, { namespace: 'tips' }> {
  if (data.namespace !== 'tips') throw new Error('Expected tips content');
  return data;
}

function homepageContent(data: CmsAdminContentData): Extract<CmsAdminContentData, { namespace: 'homepage' }> {
  if (data.namespace !== 'homepage') throw new Error('Expected homepage content');
  return data;
}

const banners = adBannerListDataSchema.parse({
  items: [{
    id: bannerId,
    placementKey: 'homepage.hero',
    title: { ar: 'بانر الصفحة الرئيسية', en: 'Homepage banner',},
    altText: { en: 'Homepage banner' },
    startAt: '2026-08-20T08:00:00.000Z',
    endAt: '2026-09-20T08:00:00.000Z',
    status: 'active',
    sortOrder: 0,
    version: 2,
    createdBy: adminId,
    updatedBy: adminId,
    createdAt: '2026-08-19T08:00:00.000Z',
    updatedAt: '2026-08-19T08:00:00.000Z'
  }],
  page: 1,
  limit: 20,
  total: 1
});

const tips = tipsContent(cmsAdminContentDataSchema.parse({
  namespace: 'tips',
  items: [{
    id: tipId,
    key: 'buying_safely',
    title: { ar: 'نصيحة شراء', en: 'Buying safely',},
    body: { ar: 'تحقق من البيانات المنشورة.', en: 'Check the published data.',},
    order: 1,
    active: true,
    status: 'published',
    version: 3,
    updatedBy: adminId,
    updatedAt: '2026-08-19T08:00:00.000Z',
    availableActions: ['update', 'deactivate']
  }]
}));

const homepage = homepageContent(cmsAdminContentDataSchema.parse({
  namespace: 'homepage',
  items: [{
    id: homepageId,
    key: 'featured_properties',
    title: { ar: 'عقارات مميزة', en: 'Featured properties',},
    body: { en: 'Approved homepage section.' },
    order: 2,
    visible: true,
    status: 'published',
    version: 4,
    updatedBy: adminId,
    updatedAt: '2026-08-19T08:00:00.000Z',
    availableActions: ['update', 'publish']
  }]
}));

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-home-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      requests.push({ method: init?.method ?? 'GET', path: url.pathname, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown });
      if (url.pathname === '/api/v1/admin/banners') return envelope(banners);
      if (url.pathname.endsWith('/admin/content/tips')) return envelope(tips);
      if (url.pathname.endsWith('/admin/content/homepage')) return envelope(homepage);
      return envelope(banners.items[0]);
    }
  });
}

describe('Admin banners, tips, and homepage administration', () => {
  it('uses the implemented banner and CMS routes with strict contracts', async () => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const client = apiClientFor(requests);
    await expect(loadAdminBanners({ apiClient: client })).resolves.toMatchObject({ items: [{ id: bannerId }], page: 1, total: 1 });
    await expect(loadAdminHomeContent('tips', { apiClient: client })).resolves.toMatchObject({ namespace: 'tips', items: [{ id: tipId }] });
    await expect(updateAdminHomeContent('homepage', { id: homepageId, version: 4, order: 1, reason: 'Move homepage section' }, { apiClient: client })).resolves.toMatchObject({ namespace: 'homepage' });
    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual(['GET /api/v1/admin/banners', 'GET /api/v1/admin/content/tips', 'PUT /api/v1/admin/content/homepage']);
    await expect(updateAdminHomeContent('tips', { id: tipId, version: 3, reason: 'bad', unknown: true }, { apiClient: client })).rejects.toThrow();
  });

  it.each([
    ['ar', banners, '/admin/banners', 'ADM-46'],
    ['en', banners, '/admin/banners/new', 'ADM-47'],
    ['en', homepage, '/admin/content/homepage', 'ADM-49']
  ] as const)('renders %s %s with the approved screen, direction, and safe projection', async (locale, data, path, screenId) => {
    const result = renderWithLocale(
      <AdminHome
        url={path}
        locale={locale}
        session={session}
        initialBanners={path.includes('/banners') && path.endsWith('/banners') ? banners : undefined}
        initialContent={path.endsWith('/tips') ? tips : path.endsWith('/homepage') ? homepage : undefined}
      />,
      { locale }
    );
    await waitFor(() => expect(result.container.querySelector(`[data-screen-id="${screenId}"]`)).not.toBeNull());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|assignedTo|auditData/u);
    result.unmount();
  });

  it('renders the empty and permission states without inventing records', async () => {
    const empty = adBannerListDataSchema.parse({ items: [], page: 1, limit: 20, total: 0 });
    const result = renderWithLocale(<AdminHome url="/admin/banners" locale="en" session={session} initialBanners={empty} />, { locale: 'en' });
    await waitFor(() => expect(result.container.querySelector('[data-state="empty"]')).not.toBeNull());
    result.unmount();
    renderWithLocale(<AdminHome url="/admin/banners" locale="en" session={{ status: 'anonymous' }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Access is not permitted' })).toBeInTheDocument());
  });

  it('requires a reason for CMS mutation and preserves the server version', async () => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const source = createAdminHomeSource({ apiClient: apiClientFor(requests) });
    renderWithLocale(<AdminHome url="/admin/content/tips" locale="en" session={session} initialContent={tips} source={source} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`admin-home-tips-${tipId}`)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId(`admin-home-tips-${tipId}`).querySelector('button')!);
    fireEvent.submit(screen.getByTestId('admin-home-tips-editor').querySelector('form')!);
    expect(screen.getByText('A change reason is required.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update approved tip' } });
    fireEvent.click(screen.getByTestId('admin-home-tips-editor').querySelector('button[type="submit"]')!);
    await waitFor(() => expect(requests.some(request => request.method === 'PUT' && request.path.endsWith('/admin/content/tips'))).toBe(true));
    expect(requests.find(request => request.method === 'PUT')?.body).toMatchObject({ id: tipId, version: 3, reason: 'Update approved tip' });
  });
});
