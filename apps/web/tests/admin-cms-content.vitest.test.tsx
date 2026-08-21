import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  cmsAdminContentDataSchema,
  type CmsAdminContentData,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  AdminCmsContent,
  getAdminCmsCopy,
  loadAdminCmsContent,
  updateAdminCmsContent
} from '../src/features/admin_content/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const adminId = 'cccccccccccccccccccccccc';
const aboutId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const teamId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const populationId = 'dddddddddddddddddddddddd';
const session = { status: 'authenticated' as const, role: 'admin' as const };

const about = cmsAdminContentDataSchema.parse({
  namespace: 'about',
  items: [{ id: aboutId, key: 'mission', title: { ar: 'عن المنصة', en: 'About the platform', 'zh-CN': '关于平台' }, body: { ar: 'محتوى معتمد', en: 'Approved content', 'zh-CN': '已批准内容' }, order: 1, active: true, status: 'published', updatedBy: adminId, version: 4, updatedAt: '2026-08-19T10:00:00.000Z', availableActions: ['update', 'deactivate'] }]
});
const team = cmsAdminContentDataSchema.parse({
  namespace: 'team',
  items: [{ id: teamId, key: 'lead', name: { ar: 'مدير المنصة', en: 'Platform lead', 'zh-CN': '平台负责人' }, title: { en: 'Director' }, bio: { en: 'Approved bio' }, order: 1, active: true, status: 'published', updatedBy: adminId, version: 2, updatedAt: '2026-08-19T10:00:00.000Z', availableActions: ['update'] }]
});
const population = cmsAdminContentDataSchema.parse({
  namespace: 'population',
  items: [{ id: populationId, status: 'available', value: 342000, sourceLabel: { en: 'Approved source' }, sourceUrl: 'https://example.test/population', asOf: '2026-08-01T00:00:00.000Z', reason: 'Approved source update', updatedBy: adminId, version: 3, updatedAt: '2026-08-19T10:00:00.000Z', availableActions: ['update'] }]
});

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-cms-content-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; body: unknown }>, data: CmsAdminContentData): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      requests.push({ method: init?.method ?? 'GET', path: url.pathname, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown });
      return envelope(data);
    }
  });
}

describe('admin About, Team, and population CMS content', () => {
  it('uses the implemented namespace routes and strict request schemas', async () => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const client = apiClientFor(requests, about);
    await expect(loadAdminCmsContent('about', { apiClient: client })).resolves.toMatchObject({ namespace: 'about', items: [{ id: aboutId }] });
    await expect(updateAdminCmsContent('about', { id: aboutId, version: 4, order: 2, reason: 'Reorder About content' }, { apiClient: client })).resolves.toMatchObject({ namespace: 'about' });
    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual(['GET /api/v1/admin/content/about', 'PUT /api/v1/admin/content/about']);
    await expect(updateAdminCmsContent('about', { id: aboutId, version: 4, order: 2, reason: 'x', unknown: true }, { apiClient: client })).rejects.toThrow();
  });

  it.each([
    ['ar', about, '/admin/content/about', 'ADM-30'],
    ['en', team, '/admin/content/team', 'ADM-31'],
    ['zh-CN', population, '/admin/content/population-counter', 'ADM-32']
  ] as const)('renders %s with its approved screen, direction, and safe projection', async (locale: SupportedLocale, data: CmsAdminContentData, path: string, screenId: string) => {
    const result = renderWithLocale(<AdminCmsContent path={path} locale={locale} session={session} initialData={data} />, { locale });
    await waitFor(() => expect(result.container.querySelector(`[data-screen-id="${screenId}"]`)).not.toBeNull());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|assignedTo|auditData/u);
    result.unmount();
  });

  it('requires a reason and sends the server version when editing About content', async () => {
    const update = vi.fn(async () => about);
    renderWithLocale(<AdminCmsContent path="/admin/content/about" locale="en" session={session} initialData={about} update={update} />, { locale: 'en' });
    fireEvent.click(screen.getByTestId(`admin-cms-about-${aboutId}`).querySelectorAll('button')[1]!);
    fireEvent.submit(screen.getByTestId('admin-cms-about-editor').querySelector('form')!);
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText(getAdminCmsCopy('en').reasonRequired)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update About content' } });
    fireEvent.click(screen.getAllByRole('button', { name: getAdminCmsCopy('en').save }).slice(-1)[0]!);
    await waitFor(() => expect(update).toHaveBeenCalledWith('about', expect.objectContaining({ id: aboutId, version: 4, reason: 'Update About content' })));
  });

  it('fails closed for a non-admin session without loading', async () => {
    const load = vi.fn();
    renderWithLocale(<AdminCmsContent path="/admin/content/team" locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminCmsCopy('en').states.permission.title })).toBeInTheDocument());
    expect(load).not.toHaveBeenCalled();
  });
});
