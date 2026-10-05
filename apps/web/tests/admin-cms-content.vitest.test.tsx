import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  cmsAdminContentDataSchema,
  type CmsAdminContentData,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  AdminCmsContent,
  deleteAdminCmsTeamMember,
  getAdminCmsCopy,
  loadAdminCmsContent,
  updateAdminCmsContent
} from '../src/features/admin_content/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const adminId = 'cccccccccccccccccccccccc';
const aboutId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const teamId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const session = { status: 'authenticated' as const, role: 'admin' as const };

const about = cmsAdminContentDataSchema.parse({
  namespace: 'about',
  items: [{ id: aboutId, key: 'mission', title: { ar: 'عن المنصة', en: 'About the platform',}, body: { ar: 'محتوى معتمد', en: 'Approved content',}, order: 1, active: true, status: 'published', updatedBy: adminId, version: 4, updatedAt: '2026-08-19T10:00:00.000Z', availableActions: ['update', 'deactivate'] }]
});
const team = cmsAdminContentDataSchema.parse({
  namespace: 'team',
  items: [{ id: teamId, key: 'lead', name: { ar: 'مدير المنصة', en: 'Platform lead',}, title: { en: 'Director' }, bio: { en: 'Approved bio' }, order: 1, active: true, status: 'published', updatedBy: adminId, version: 2, updatedAt: '2026-08-19T10:00:00.000Z', availableActions: ['update'] }]
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
  it.each(['ar', 'en'] as const)('edits the selected team member and clears removed optional fields in %s', async locale => {
    const copy = getAdminCmsCopy(locale);
    const data = cmsAdminContentDataSchema.parse({ namespace: 'team', items: [team.items[0], { ...team.items[0], id: aboutId, key: 'second', name: { en: 'Second member' } }] });
    const update = vi.fn(async () => data);
    renderWithLocale(<AdminCmsContent path="/admin/content/team" locale={locale} session={session} initialData={data} update={update} />, { locale });
    fireEvent.click(screen.getByTestId(`admin-cms-team-${teamId}`).querySelectorAll('button')[1]!);
    fireEvent.change(screen.getByLabelText('EN ' + copy.name), { target: { value: 'Unsaved first member' } });
    fireEvent.click(screen.getByTestId(`admin-cms-team-${aboutId}`).querySelectorAll('button')[1]!);
    expect(screen.getByLabelText('EN ' + copy.name)).toHaveValue('Second member');
    fireEvent.change(screen.getByLabelText('EN ' + copy.name), { target: { value: 'Updated second member' } });
    fireEvent.change(screen.getByLabelText('EN ' + copy.body), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(copy.reason), { target: { value: 'Update team profile' } });
    fireEvent.submit(screen.getByTestId('admin-cms-team-editor').querySelector('form')!);
    await waitFor(() => expect(update).toHaveBeenCalledWith('team', expect.objectContaining({ id: aboutId, version: 2, name: expect.objectContaining({ en: 'Updated second member' }), bio: null })));
  });

  it.each(['ar', 'en'] as const)('confirms a team deletion with a reason and the current version in %s', async locale => {
    const copy = getAdminCmsCopy(locale);
    const data = cmsAdminContentDataSchema.parse({ namespace: 'team', items: [{ ...team.items[0], availableActions: ['update', 'delete'] }] });
    const deleteTeam = vi.fn(async () => ({ namespace: 'team' as const, items: [] }));
    renderWithLocale(<AdminCmsContent path="/admin/content/team" locale={locale} session={session} initialData={data} deleteTeam={deleteTeam} />, { locale });
    fireEvent.click(screen.getByRole('button', { name: copy.delete }));
    expect(deleteTeam).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByTestId('admin-cms-team-delete').querySelector('form')!);
    expect(deleteTeam).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(copy.reason), { target: { value: 'Member left the team' } });
    fireEvent.submit(screen.getByTestId('admin-cms-team-delete').querySelector('form')!);
    await waitFor(() => expect(deleteTeam).toHaveBeenCalledWith({ id: teamId, version: 2, reason: 'Member left the team' }));
    await waitFor(() => expect(screen.queryByTestId(`admin-cms-team-${teamId}`)).not.toBeInTheDocument());
  });

  it('keeps the editor and draft values after an API conflict without showing internal message keys', async () => {
    const update = vi.fn(async () => { throw new ApiClientError('errors.conflict', { code: 'HTTP_ERROR', status: 409 }); });
    renderWithLocale(<AdminCmsContent path="/admin/content/team" locale="en" session={session} initialData={team} update={update} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('EN Name'), { target: { value: 'Changed name' } });
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update team profile' } });
    fireEvent.submit(screen.getByTestId('admin-cms-team-editor').querySelector('form')!);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(getAdminCmsCopy('en').mutation.conflict));
    expect(screen.getByLabelText('EN Name')).toHaveValue('Changed name');
    expect(screen.queryByText('errors.conflict')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('sends team deletion to the protected API route with a strict body', async () => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const client = apiClientFor(requests, { namespace: 'team', items: [] });
    await deleteAdminCmsTeamMember({ id: teamId, version: 2, reason: 'Member left the team' }, { apiClient: client });
    expect(requests[0]).toMatchObject({ method: 'DELETE', path: '/api/v1/admin/content/team', body: { id: teamId, version: 2 } });
    await expect(deleteAdminCmsTeamMember({ id: teamId, version: 2, reason: 'x' }, { apiClient: client })).rejects.toThrow();
    expect(requests).toHaveLength(1);
  });
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
    ['en', team, '/admin/content/team', 'ADM-31'],] as const)('renders %s with its approved screen, direction, and safe projection', async (locale: SupportedLocale, data: CmsAdminContentData, path: string, screenId: string) => {
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
