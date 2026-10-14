import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  adBannerListDataSchema,
  cmsAdminContentDataSchema,
  type CmsAdminContentData
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
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
import { BannerDisplayControls } from '../src/features/admin_home/banner-controls.tsx';

const adminId = 'cccccccccccccccccccccccc';
const bannerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const tipId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const homepageId = 'dddddddddddddddddddddddd';
const session = { status: 'authenticated' as const, role: 'admin' as const };

it('renews an expired session once before retrying a private draft image', async () => {
  let token = 'Bearer expired';
  const authorization = { getAuthorizationHeader: () => token, refresh: vi.fn(async () => { token = 'Bearer renewed'; }) };
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(new Response('image', { headers: { 'content-type': 'image/png' } }));
  vi.stubGlobal('fetch', fetcher);
  try {
    const blob = await createAdminHomeSource({ authorization }).loadMediaBlob(`/api/v1/public/banner-media/${bannerId}`);
    expect(blob.type).toBe('image/png');
    expect(authorization.refresh).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(new Headers(fetcher.mock.calls[0]?.[1].headers).get('authorization')).toBe('Bearer expired');
    expect(new Headers(fetcher.mock.calls[1]?.[1].headers).get('authorization')).toBe('Bearer renewed');
  } finally { vi.unstubAllGlobals(); }
});

it.each([401, 403, 404, 503])('fails closed on an unavailable preview (HTTP %s) and never repeats indefinitely', async status => {
  const authorization = { getAuthorizationHeader: () => 'Bearer admin', refresh: vi.fn(async () => {}) };
  const fetcher = vi.fn(async () => new Response('', { status })); vi.stubGlobal('fetch', fetcher);
  try {
    await expect(createAdminHomeSource({ authorization }).loadMediaBlob(`/api/v1/public/banner-media/${bannerId}`)).rejects.toMatchObject({ status });
    expect(authorization.refresh).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    expect(fetcher).toHaveBeenCalledTimes(status === 401 ? 2 : 1);
  } finally { vi.unstubAllGlobals(); }
});

it('rejects non-image responses without creating a misleading preview', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Login</html>', { headers: { 'content-type': 'text/html' } })));
  try { await expect(createAdminHomeSource().loadMediaBlob(`/api/v1/public/banner-media/${bannerId}`)).rejects.toThrow('INVALID_BANNER_IMAGE'); }
  finally { vi.unstubAllGlobals(); }
});

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
  it.each(['ar', 'en'] as const)('finds stopped banners, previews privately, and edits without publishing in %s', async locale => {
    const copy = getAdminHomeCopy(locale);
    const source = createAdminHomeSource({ apiClient: apiClientFor([]) });
    let stopped = { ...banners.items[0]!, status: 'draft' as const, endAt: '2099-09-20T08:00:00.000Z' };
    const load = vi.spyOn(source, 'loadBanners').mockImplementation(async query => ({ ...banners, page: query.page ?? 1, items: [stopped] }));
    const update = vi.spyOn(source, 'updateBanner').mockImplementation(async (_id, input) => { stopped = { ...stopped, ...input, status: 'draft', version: stopped.version + 1 } as typeof stopped; return stopped; });
    const preview = vi.spyOn(source, 'previewBanner').mockImplementation(async () => ({ banner: stopped, preview: true }));
    renderWithLocale(<AdminHome url="/admin/banners" locale={locale} session={session} initialBanners={banners} source={source} />, { locale });
    fireEvent.change(screen.getByLabelText(locale === 'ar' ? 'حالة البانر' : 'Banner status'), { target: { value: 'draft' } });
    await waitFor(() => expect(load).toHaveBeenCalledWith(expect.objectContaining({ page: 1, status: 'draft', placementKey: 'homepage.hero' }), expect.any(AbortSignal)));
    const row = await screen.findByTestId(`admin-home-banner-${bannerId}`);
    expect(row).toHaveTextContent(locale === 'ar' ? 'مسودة / موقوف' : 'Draft / stopped');
    fireEvent.click(within(row).getByRole('button', { name: copy.preview }));
    const panel = await screen.findByRole('complementary', { name: copy.preview });
    expect(panel.parentElement).toHaveFocus();
    expect(update).not.toHaveBeenCalled();
    expect(preview).toHaveBeenCalledWith(bannerId);
    fireEvent.click(within(row).getByRole('button', { name: locale === 'ar' ? 'تعديل' : 'Edit' }));
    const editor = await screen.findByTestId('admin-home-banner-editor');
    expect(screen.queryByRole('complementary', { name: copy.preview })).not.toBeInTheDocument();
    expect(editor.parentElement).toHaveFocus();
    fireEvent.change(editor.querySelector(`#admin-home-banner-title-${locale}`)!, { target: { value: 'Changed while stopped' } });
    fireEvent.change(within(editor).getByLabelText(copy.reason), { target: { value: 'Edit stopped banner' } });
    fireEvent.submit(editor.querySelector('form')!);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.calls.every(([, input]) => input.status === undefined)).toBe(true);
    expect(stopped.status).toBe('draft');
    expect(stopped.title[locale]).toBe('Changed while stopped');
  });

  it('loads a linked stopped filter instead of showing unfiltered initial banners', async () => {
    const source = createAdminHomeSource({ apiClient: apiClientFor([]) });
    const load = vi.spyOn(source, 'loadBanners').mockResolvedValue({ ...banners, items: [] });
    renderWithLocale(<AdminHome url="/admin/banners?status=draft" locale="en" session={session} initialBanners={banners} source={source} />, { locale: 'en' });
    await waitFor(() => expect(load).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', page: 1 }), expect.any(AbortSignal)));
    expect(screen.getByLabelText('Banner status')).toHaveValue('draft');
    await waitFor(() => expect(screen.queryByTestId(`admin-home-banner-${bannerId}`)).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Banner display settings' })).toHaveAttribute('href', '#banner-display-settings');
  });

  it('resets server pagination when switching to stopped banners', async () => {
    const source = createAdminHomeSource({ apiClient: apiClientFor([]) });
    const load = vi.spyOn(source, 'loadBanners').mockImplementation(async query => ({ ...banners, page: query.page ?? 1, total: query.status ? 0 : 21, items: query.status ? [] : banners.items }));
    renderWithLocale(<AdminHome url="/admin/banners" locale="en" session={session} initialBanners={{ ...banners, total: 21 }} source={source} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(load).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal)));
    fireEvent.click(await screen.findByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.any(AbortSignal)));
    fireEvent.change(screen.getByLabelText('Banner status'), { target: { value: 'draft' } });
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 'draft' }), expect.any(AbortSignal)));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument());
  });

  it.each(['ar', 'en'] as const)('opens the hero editor directly and saves the introductory text in %s', async locale => {
    const data = homepageContent(cmsAdminContentDataSchema.parse({ namespace: 'homepage', items: [{ ...homepage.items[0], key: 'hero', eyebrow: { ar: 'نص قديم', en: 'Old introduction' } }] }));
    const source = createAdminHomeSource({ apiClient: apiClientFor([]) });
    const update = vi.spyOn(source, 'updateContent').mockResolvedValue(data);
    renderWithLocale(<AdminHome url={`/admin/content/homepage?section=hero&lang=${locale}`} locale={locale} session={session} initialContent={data} source={source} />, { locale });
    const editor = await screen.findByTestId('admin-home-homepage-editor');
    const input = editor.querySelector<HTMLInputElement>(`#admin-home-homepage-eyebrow-${locale}`)!;
    expect(input).toHaveValue(locale === 'ar' ? 'نص قديم' : 'Old introduction');
    expect(input).toHaveAttribute('maxlength', '120');
    fireEvent.change(input, { target: { value: 'New homepage introduction' } });
    fireEvent.change(editor.querySelector('#admin-home-homepage-reason')!, { target: { value: 'Change introductory text' } });
    fireEvent.click(within(editor).getByRole('button', { name: getAdminHomeCopy(locale).save }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('homepage', expect.objectContaining({ id: data.items[0]!.id, version: data.items[0]!.version, eyebrow: expect.objectContaining({ [locale]: 'New homepage introduction' }) }));
  });
  it.each(['ar', 'en'] as const)('manages placement ads and toggles only the selected placement in %s', async locale => {
    let config = { enabled: false, version: 2, placements: [{ key: 'homepage.hero', label: { ar: 'بانر الرئيسية', en: 'Homepage hero' }, active: true }, { key: 'homepage.featured', label: { ar: 'إعلانات مميزة', en: 'Featured ads' }, active: true }] };
    const source = createAdminHomeSource({ apiClient: new ApiClient({ fetcher: async () => envelope(config) }) });
    const update = vi.spyOn(source, 'updateBannerConfig').mockImplementation(async input => {
      const patch = input as { enabled: boolean; heroActive?: boolean; featuredActive?: boolean };
      config = { ...config, enabled: patch.enabled, version: config.version + 1, placements: config.placements.map(item => ({ ...item, active: item.key === 'homepage.hero' ? patch.heroActive ?? item.active : patch.featuredActive ?? item.active })) };
      return config;
    });
    renderWithLocale(<BannerDisplayControls locale={locale} source={source} />, { locale });
    const rows = await screen.findAllByRole('row');
    const hero = rows.find(row => row.getAttribute('data-placement') === 'homepage.hero')!;
    const featured = rows.find(row => row.getAttribute('data-placement') === 'homepage.featured')!;
    expect(within(hero).getByRole('link')).toHaveAttribute('href', `/admin/banners?lang=${locale}#banner-list`);
    expect(within(featured).getByRole('link')).toHaveAttribute('href', `/admin/ads/featured?lang=${locale}`);
    fireEvent.click(within(hero).getByRole('button'));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenLastCalledWith({ enabled: false, expectedVersion: 2, heroActive: false, reason: 'Stop placement homepage.hero' });
    await waitFor(() => expect(within(hero).getByRole('button')).toHaveTextContent(locale === 'ar' ? 'تشغيل الموضع' : 'Enable placement'));
    fireEvent.click(within(featured).getByRole('button'));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update).toHaveBeenLastCalledWith({ enabled: false, expectedVersion: 3, featuredActive: false, reason: 'Stop placement homepage.featured' });
  });
  it('renews an expired administrator token once and retries the same banner changes with the renewed token', async () => {
    let token = 'Bearer expired';
    const calls: Array<{ header: string | null; body: unknown }> = [];
    const authorization = { getAuthorizationHeader: () => token, refresh: vi.fn(async () => { token = 'Bearer renewed'; }) };
    const client = new ApiClient({ fetcher: async (_url, init) => {
      calls.push({ header: new Headers(init?.headers).get('authorization'), body: JSON.parse(String(init?.body)) });
      if (calls.length === 1) throw new ApiClientError('errors.unauthorized', { code: 'HTTP_ERROR', status: 401 });
      return envelope(banners.items[0]);
    } });
    const input = { title: { en: 'Kept title' }, expectedVersion: 2, reason: 'Update banner title' };
    await createAdminHomeSource({ apiClient: client, authorization }).updateBanner(bannerId, input);
    expect(authorization.refresh).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([{ header: 'Bearer expired', body: input }, { header: 'Bearer renewed', body: input }]);
  });
  it.each([401, 403])('does not repeatedly renew or bypass a rejected banner save (%s)', async status => {
    const failure = new ApiClientError('errors.forbidden', { code: 'HTTP_ERROR', status });
    const fetcher = vi.fn(async () => { throw failure; });
    const authorization = { getAuthorizationHeader: () => 'Bearer admin', refresh: vi.fn(async () => {}) };
    await expect(createAdminHomeSource({ apiClient: new ApiClient({ fetcher }), authorization }).updateBanner(bannerId, { expectedVersion: 2, reason: 'Update title', title: { en: 'Kept title' } })).rejects.toBe(failure);
    expect(authorization.refresh).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    expect(fetcher).toHaveBeenCalledTimes(status === 401 ? 2 : 1);
  });
  it('does not load a linked customer request before an administrator is authenticated', async () => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const source = createAdminHomeSource({ apiClient: apiClientFor(requests) });
    renderWithLocale(<AdminHome url={`/admin/banners/new?requestId=${bannerId}`} locale="ar" session={{ status: 'anonymous' }} source={source} />, { locale: 'ar' });
    await waitFor(() => expect(document.querySelector('[data-admin-home-state="permission"]')).toBeInTheDocument());
    expect(screen.queryByTestId('admin-home-banner-editor')).not.toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
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
  it.each(['ar', 'en'] as const)('saves required banner dates with optional blank times in %s', async locale => {
    const copy = getAdminHomeCopy(locale);
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const source = createAdminHomeSource({ apiClient: apiClientFor(requests) });
    renderWithLocale(<AdminHome url="/admin/banners/new" locale={locale} session={session} source={source} />, { locale });
    await screen.findByTestId('admin-home-banner-editor');
    fireEvent.change(document.getElementById('admin-home-banner-title-en')!, { target: { value: 'New banner' } });
    const startDate = screen.getByLabelText(copy.schedule.startDate);
    const endDate = screen.getByLabelText(copy.schedule.endDate);
    expect(startDate).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(copy.schedule.startTime)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(copy.schedule.startTime)).toHaveValue('');
    expect(screen.getByLabelText(copy.schedule.endTime)).toHaveValue('');
    expect(screen.getByLabelText(copy.schedule.startTime)).not.toBeRequired();
    expect(screen.getByLabelText(copy.schedule.endTime)).not.toBeRequired();
    expect(startDate).toBeRequired();
    expect(endDate).toBeRequired();
    fireEvent.change(startDate, { target: { value: '2026-10-05' } });
    fireEvent.change(endDate, { target: { value: '2026-10-06' } });
    const form = screen.getByTestId('admin-home-banner-editor').querySelector('form')!;
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    await waitFor(() => expect(document.querySelector('.admin-home__feedback[role="status"]')).toHaveTextContent(copy.saved));
    expect(requests.find(request => request.method === 'POST')?.body).toMatchObject({
      startAt: '2026-10-04T21:00:00.000Z', endAt: '2026-10-05T21:00:00.000Z'
    });
  });

  it.each([
    ['2026-10-05', '12:00', 'am', '12:00', 'pm', '2026-10-04T21:00:00.000Z', '2026-10-05T09:00:00.000Z'],
    ['2027-01-05', '12', 'am', '12', 'pm', '2027-01-04T22:00:00.000Z', '2027-01-05T10:00:00.000Z'],
    ['2027-01-05', '02:30', 'am', '02:30', 'pm', '2027-01-05T00:30:00.000Z', '2027-01-05T12:30:00.000Z'],
    ['2027-01-05', '', 'pm', '02:30', 'pm', '2027-01-04T22:00:00.000Z', '2027-01-05T12:30:00.000Z'],
    ['2027-01-05', '٠٢:٣٠', 'am', '٠٢:٣٠', 'pm', '2027-01-05T00:30:00.000Z', '2027-01-05T12:30:00.000Z']
  ])('converts optional 12-hour times to Cairo instants (%s %s %s)', async (date, startClock, startPeriod, endClock, endPeriod, startAt, endAt) => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    renderWithLocale(<AdminHome url="/admin/banners/new" locale="en" session={session} source={createAdminHomeSource({ apiClient: apiClientFor(requests) })} />, { locale: 'en' });
    await screen.findByTestId('admin-home-banner-editor');
    fireEvent.change(document.getElementById('admin-home-banner-title-en')!, { target: { value: 'Optional clock' } });
    for (const [side, clock, period] of [['start', startClock, startPeriod], ['end', endClock, endPeriod]]) {
      fireEvent.change(document.getElementById(`admin-home-banner-${side}`)!, { target: { value: date } });
      fireEvent.change(document.getElementById(`admin-home-banner-${side}-time`)!, { target: { value: clock } });
      fireEvent.change(document.getElementById(`admin-home-banner-${side}-time-period`)!, { target: { value: period } });
    }
    const form = screen.getByTestId('admin-home-banner-editor').querySelector('form')!;
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    await waitFor(() => expect(requests.find(request => request.method === 'POST')?.body).toMatchObject({ startAt, endAt }));
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
    fireEvent.change(screen.getByLabelText(copy.schedule.startTime), { target: { value: '02:30' } });
    fireEvent.change(document.getElementById('admin-home-banner-start-time-period')!, { target: { value: 'pm' } });
    fireEvent.change(document.getElementById('admin-home-banner-end-time-period')!, { target: { value: 'pm' } });
    for (const endTime of ['02:29', '02:30']) {
      fireEvent.change(screen.getByLabelText(copy.schedule.endTime), { target: { value: endTime } });
      fireEvent.submit(form);
      expect(document.querySelector('.admin-home__editor [role="alert"]')).toHaveTextContent(copy.schedule.invalidRange);
    }
    fireEvent.change(screen.getByLabelText(copy.schedule.endTime), { target: { value: '' } });
    fireEvent.submit(form);
    expect(document.querySelector('.admin-home__editor [role="alert"]')).toHaveTextContent(copy.schedule.invalidRange);
    fireEvent.change(screen.getByLabelText(copy.schedule.endTime), { target: { value: '13:00' } });
    expect(form.checkValidity()).toBe(false);
    fireEvent.submit(form);
    expect(document.querySelector('.admin-home__editor [role="alert"]')).toHaveTextContent(copy.validation);
    expect(requests.some(request => request.method === 'POST')).toBe(false);
    fireEvent.change(screen.getByLabelText(copy.schedule.endTime), { target: { value: '04:45' } });
    fireEvent.submit(form);
    await waitFor(() => expect(document.querySelector('.admin-home__feedback[role="status"]')).toHaveTextContent(copy.saved));
    expect(requests.find(request => request.method === 'POST')?.body).toMatchObject({
      startAt: '2026-10-05T11:30:00.000Z', endAt: '2026-10-05T13:45:00.000Z'
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
    fireEvent.click(Array.from(screen.getByTestId(`admin-home-tips-${tipId}`).querySelectorAll('button')).find(button => button.textContent === 'Edit')!);
    const order = screen.getByLabelText('Display order (optional)');
    expect(order).not.toBeRequired();
    expect(order).toHaveValue(null);
    expect(order).toHaveAttribute('placeholder', '1');
    fireEvent.change(within(screen.getByRole('group', { name: 'Title' })).getByLabelText('English'), { target: { value: 'Unsaved tip title' } });
    fireEvent.change(within(screen.getByRole('group', { name: getAdminHomeCopy('en').body })).getByLabelText('English'), { target: { value: 'Unsaved preview text' } });
    expect(screen.getByRole('complementary', { name: 'Content preview' })).toHaveTextContent('Unsaved tip title');
    expect(screen.getByRole('complementary', { name: 'Content preview' })).toHaveTextContent('Unsaved preview text');
    fireEvent.submit(screen.getByTestId('admin-home-tips-editor').querySelector('form')!);
    expect(screen.getByText('A change reason is required.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update approved tip' } });
    fireEvent.click(screen.getByTestId('admin-home-tips-editor').querySelector('button[type="submit"]')!);
    await waitFor(() => expect(requests.some(request => request.method === 'PUT' && request.path.endsWith('/admin/content/tips'))).toBe(true));
    expect(requests.find(request => request.method === 'PUT')?.body).toMatchObject({ id: tipId, version: 3, reason: 'Update approved tip' });
    expect(requests.find(request => request.method === 'PUT')?.body).not.toHaveProperty('order');
  });

  it.each([undefined, 0, 10])('creates a tip without a manual key and honors optional display order %s', async chosenOrder => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    renderWithLocale(<AdminHome url="/admin/content/tips" locale="en" session={session} initialContent={tips} source={createAdminHomeSource({ apiClient: apiClientFor(requests) })} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: getAdminHomeCopy('en').add }));
    const editor = screen.getByTestId('admin-home-tips-editor');
    const order = within(editor).getByLabelText('Display order (optional)');
    expect(order).toHaveValue(null);
    expect(order).not.toBeRequired();
    expect(editor).toHaveTextContent('Leave blank to add at the end automatically.');
    if (chosenOrder !== undefined) fireEvent.change(order, { target: { value: String(chosenOrder) } });
    expect(within(editor).queryByLabelText(getAdminHomeCopy('en').key)).not.toBeInTheDocument();
    fireEvent.change(within(editor).getByRole('group', { name: 'Title' }).querySelector('#admin-home-tips-title-en')!, { target: { value: 'New advice' } });
    fireEvent.change(editor.querySelector('#admin-home-tips-body-en')!, { target: { value: 'Review the property documents.' } });
    fireEvent.change(within(editor).getByLabelText('Change reason'), { target: { value: 'Add useful advice' } });
    fireEvent.submit(editor.querySelector('form')!);
    await waitFor(() => expect(requests.find(request => request.method === 'PUT')).toBeDefined());
    expect(requests.find(request => request.method === 'PUT')?.body).not.toHaveProperty('key');
    if (chosenOrder === undefined) expect(requests.find(request => request.method === 'PUT')?.body).not.toHaveProperty('order');
    else expect(requests.find(request => request.method === 'PUT')?.body).toHaveProperty('order', chosenOrder);
  });

  it.each([undefined, 0, 10])('automatically chooses the homepage key and default list order without requiring a description (%s)', async chosenOrder => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    renderWithLocale(<AdminHome url="/admin/content/homepage" locale="en" session={session} initialContent={homepage} source={createAdminHomeSource({ apiClient: apiClientFor(requests) })} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: getAdminHomeCopy('en').add }));
    const editor = screen.getByTestId('admin-home-homepage-editor');
    const picker = within(editor).getByLabelText('Section to customize');
    expect(picker.tagName).toBe('SELECT');
    expect(within(picker).getByRole('option', { name: /Featured properties/u })).toBeDisabled();
    fireEvent.change(picker, { target: { value: 'articles' } });
    const order = within(editor).getByLabelText('List order (optional)');
    expect(order).not.toBeRequired();
    expect(order).toHaveValue(null);
    if (chosenOrder !== undefined) fireEvent.change(order, { target: { value: String(chosenOrder) } });
    fireEvent.change(editor.querySelector('#admin-home-homepage-title-en')!, { target: { value: 'Market articles' } });
    fireEvent.change(editor.querySelector('#admin-home-homepage-status')!, { target: { value: 'published' } });
    fireEvent.change(within(editor).getByLabelText('Change reason'), { target: { value: 'Customize the articles heading' } });
    fireEvent.submit(editor.querySelector('form')!);
    await waitFor(() => expect(requests.find(request => request.method === 'PUT')).toBeDefined());
    expect(requests.find(request => request.method === 'PUT')?.body).toMatchObject({ key: 'articles', order: chosenOrder ?? 3, status: 'published', visible: true });
    expect(requests.find(request => request.method === 'PUT')?.body).not.toHaveProperty('body');
  });
});
