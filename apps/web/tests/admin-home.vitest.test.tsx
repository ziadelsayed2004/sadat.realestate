import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  adBannerListDataSchema,
  cmsAdminContentDataSchema,
  type CmsAdminContentData
} from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  AdminHome,
  createAdminHomeSource,
  loadAdminBanners,
  loadAdminHomeContent,
  updateAdminHomeContent
} from '../src/features/admin_home/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { getAdminHomeCopy } from '../src/features/admin_home/copy.ts';

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
      if (url.pathname === '/api/v1/admin/banners/config') return envelope({ enabled: true, version: 0, placements: [{ key: 'homepage.hero', label: { en: 'Homepage banner' }, active: true }] });
      if (url.pathname === '/api/v1/admin/banners') return envelope(init?.method === 'POST' ? banners.items[0] : banners);
      if (url.pathname.endsWith('/admin/content/tips')) return envelope(tips);
      if (url.pathname.endsWith('/admin/content/homepage')) return envelope(homepage);
      return envelope(banners.items[0]);
    }
  });
}

describe('Admin banners, tips, and homepage administration', () => {
  it.each(['ar', 'en'] as const)('explains a missing banner placement in %s without exposing message keys', async locale => {
    const copy = getAdminHomeCopy(locale);
    const client = new ApiClient({ fetcher: async () => { throw new ApiClientError('errors.notFound', { code: 'HTTP_ERROR', status: 404 }); } });
    const source = createAdminHomeSource({ apiClient: client });
    renderWithLocale(<AdminHome url="/admin/banners/new" locale={locale} session={session} source={source} />, { locale });
    await screen.findByTestId('admin-home-banner-editor');
    fireEvent.change(document.getElementById('admin-home-banner-title-en')!, { target: { value: 'New banner' } });
    fireEvent.change(screen.getByLabelText(copy.schedule.startDate), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText(copy.schedule.endDate), { target: { value: '2026-10-06' } });
    fireEvent.submit(screen.getByTestId('admin-home-banner-editor').querySelector('form')!);
    await waitFor(() => expect(document.querySelector('.admin-home__editor [role="alert"]')).toHaveTextContent(copy.mutation.placementNotFound));
    expect(screen.queryByText('errors.notFound')).not.toBeInTheDocument();
    expect(document.getElementById('admin-home-banner-title-en')).toHaveValue('New banner');
  });
  it.each(['ar', 'en'] as const)('saves separate banner dates with complete midnight defaults in %s', async locale => {
    const copy = getAdminHomeCopy(locale);
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const source = createAdminHomeSource({ apiClient: apiClientFor(requests) });
    renderWithLocale(<AdminHome url="/admin/banners/new" locale={locale} session={session} source={source} />, { locale });
    await screen.findByTestId('admin-home-banner-editor');
    fireEvent.change(document.getElementById('admin-home-banner-title-en')!, { target: { value: 'New banner' } });
    const startDate = screen.getByLabelText(copy.schedule.startDate);
    const endDate = screen.getByLabelText(copy.schedule.endDate);
    expect(startDate).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(copy.schedule.startTime)).toHaveAttribute('type', 'time');
    expect(screen.getByLabelText(copy.schedule.startTime)).toHaveValue('00:00');
    expect(screen.getByLabelText(copy.schedule.endTime)).toHaveValue('00:00');
    fireEvent.change(startDate, { target: { value: '2026-10-05' } });
    fireEvent.change(endDate, { target: { value: '2026-10-06' } });
    const form = screen.getByTestId('admin-home-banner-editor').querySelector('form')!;
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    await waitFor(() => expect(document.querySelector('.admin-home__feedback[role="status"]')).toHaveTextContent(copy.saved));
    expect(requests.find(request => request.method === 'POST')?.body).toMatchObject({
      startAt: new Date('2026-10-05T00:00').toISOString(), endAt: new Date('2026-10-06T00:00').toISOString()
    });
  });

  it('rejects incomplete and reversed schedules and saves precise times on the same day', async () => {
    const copy = getAdminHomeCopy('ar');
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const source = createAdminHomeSource({ apiClient: apiClientFor(requests) });
    renderWithLocale(<AdminHome url="/admin/banners/new" locale="ar" session={session} source={source} />, { locale: 'ar' });
    await screen.findByTestId('admin-home-banner-editor');
    fireEvent.change(document.getElementById('admin-home-banner-title-en')!, { target: { value: 'Timed banner' } });
    const form = screen.getByTestId('admin-home-banner-editor').querySelector('form')!;
    fireEvent.submit(form);
    expect(document.querySelector('.admin-home__editor [role="alert"]')).toHaveTextContent(copy.validation);
    for (const label of [copy.schedule.startDate, copy.schedule.endDate]) fireEvent.change(screen.getByLabelText(label), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText(copy.schedule.startTime), { target: { value: '14:30' } });
    for (const endTime of ['14:29', '14:30']) {
      fireEvent.change(screen.getByLabelText(copy.schedule.endTime), { target: { value: endTime } });
      fireEvent.submit(form);
      expect(document.querySelector('.admin-home__editor [role="alert"]')).toHaveTextContent(copy.schedule.invalidRange);
    }
    fireEvent.change(screen.getByLabelText(copy.schedule.endTime), { target: { value: '' } });
    fireEvent.submit(form);
    expect(document.querySelector('.admin-home__editor [role="alert"]')).toHaveTextContent(copy.validation);
    expect(requests.some(request => request.method === 'POST')).toBe(false);
    fireEvent.change(screen.getByLabelText(copy.schedule.endTime), { target: { value: '16:45' } });
    fireEvent.submit(form);
    await waitFor(() => expect(document.querySelector('.admin-home__feedback[role="status"]')).toHaveTextContent(copy.saved));
    expect(requests.find(request => request.method === 'POST')?.body).toMatchObject({
      startAt: new Date('2026-10-05T14:30').toISOString(), endAt: new Date('2026-10-05T16:45').toISOString()
    });
  });

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
        source={createAdminHomeSource({ apiClient: apiClientFor([]) })}
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
    const result = renderWithLocale(<AdminHome url="/admin/banners" locale="en" session={session} source={createAdminHomeSource({ apiClient: apiClientFor([]) })} initialBanners={empty} />, { locale: 'en' });
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
