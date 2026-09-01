import { fireEvent, screen, waitFor } from '@testing-library/react';
import { projectDataSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  createAdminProjectReviewMutation,
  createAdminProjectsLoader,
  loadAdminProjects,
  reviewAdminProject,
  AdminProjects,
  getAdminProjectsCopy
} from '../src/features/admin_projects/index.ts';
import type { AdminProjectListData } from '../src/features/admin_projects/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const project = projectDataSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  name: { ar: 'مشروع النيل', en: 'Nile Heights',},
  slug: 'nile-heights',
  description: { en: 'A reviewed project.' },
  status: 'pending_review',
  version: 3,
  submittedAt: '2026-08-17T10:00:00.000Z',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
  availableActions: ['needs_changes', 'approve', 'reject']
});

const listData: AdminProjectListData = { items: [project], page: 1, limit: 20, total: 1 };
const session = { status: 'authenticated' as const, role: 'admin' as const };
const authorization = { getAuthorizationHeader: () => 'Bearer admin.projects.test' };

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-projects-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; authorization: string | null; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      const method = init?.method ?? 'GET';
      requests.push({ method, path: url.pathname, authorization: new Headers(init?.headers).get('authorization'), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown });
      if (method === 'GET') return envelope({ items: [project] });
      return envelope(project);
    }
  });
}

describe('Admin project management contracts and views', () => {
  it('uses the implemented list and review routes with strict schemas and authorization', async () => {
    const requests: Array<{ method: string; path: string; authorization: string | null; body: unknown }> = [];
    const client = apiClientFor(requests);
    await expect(loadAdminProjects({ apiClient: client, authorization, query: { status: 'pending_review', page: 2, limit: 10 } })).resolves.toEqual({ items: [project], page: 2, limit: 10, total: 1 });
    await expect(reviewAdminProject(project.id, { version: project.version, action: 'approve', reason: 'Approved after review' }, { apiClient: client, authorization })).resolves.toEqual(project);
    const source = { load: createAdminProjectsLoader({ apiClient: client, authorization }), review: createAdminProjectReviewMutation({ apiClient: client, authorization }) };
    await expect(source.load({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' })).resolves.toEqual({ items: [project], page: 1, limit: 20, total: 1 });
    await expect(source.review(project.id, { version: project.version, action: 'reject', reason: 'Needs a correction' })).resolves.toEqual(project);
    expect(requests.every(request => request.authorization === 'Bearer admin.projects.test')).toBe(true);
    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual([
      'GET /api/v1/admin/projects',
      'POST /api/v1/admin/projects/aaaaaaaaaaaaaaaaaaaaaaaa/review',
      'GET /api/v1/admin/projects',
      'POST /api/v1/admin/projects/aaaaaaaaaaaaaaaaaaaaaaaa/review'
    ]);
    expect(requests[1]?.body).toEqual({ version: 3, action: 'approve', reason: 'Approved after review' });
    await expect(reviewAdminProject(project.id, { version: project.version, action: 'approve', reason: 'x' }, { apiClient: client })).rejects.toThrow();
  });

  it.each(['ar', 'en',] as const)('renders the management and review projections in the locale direction for %s', async (locale: SupportedLocale) => {
    window.history.pushState({}, '', '/admin/projects');
    const result = renderWithLocale(<AdminProjects locale={locale} session={session} initialData={listData} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`admin-project-${project.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-screen-id="ADM-12"]')).not.toBeNull();
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.container.textContent).toContain(locale === 'en' ? 'Nile Heights' : locale === 'ar' ? 'مشروع النيل' : '尼罗高地');
    expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    result.unmount();
  });

  it('renders the review screen, requires a reason, and submits only an available action', async () => {
    window.history.pushState({}, '', `/admin/projects/review?projectId=${project.id}`);
    const review = vi.fn(async () => project);
    renderWithLocale(<AdminProjects locale="en" session={session} initialData={listData} review={review} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminProjectsCopy('en').reviewTitle, level: 1 })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: getAdminProjectsCopy('en').submitReview }));
    expect(review).not.toHaveBeenCalled();
    expect(screen.getByText(getAdminProjectsCopy('en').reasonRequired)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(getAdminProjectsCopy('en').reasonLabel), { target: { value: 'Approved after review' } });
    fireEvent.click(screen.getByRole('button', { name: getAdminProjectsCopy('en').submitReview }));
    await waitFor(() => expect(review).toHaveBeenCalledWith(project.id, { version: project.version, action: 'needs_changes', reason: 'Approved after review' }));
  });

  it('fails closed for a non-admin session without calling the loader', async () => {
    const load = vi.fn();
    renderWithLocale(<AdminProjects locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminProjectsCopy('en').states.permission.title })).toBeInTheDocument());
    expect(load).not.toHaveBeenCalled();
  });
});
