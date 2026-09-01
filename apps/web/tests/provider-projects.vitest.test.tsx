import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { projectDataSchema, type ProjectData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  createProviderProjectMutationApi,
  getProviderProjectsCopy,
  loadProviderProjects,
  ProviderProjects,
  type ProviderProjectMutationApi,
  type ProviderProjectsData,
  type ProviderProjectsQuery
} from '../src/features/provider/index.ts';
import { getProviderCopy } from '../src/features/provider/copy.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const projectId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function project(overrides: Partial<ProjectData> = {}): ProjectData {
  return projectDataSchema.parse({
    id: projectId,
    providerId,
    name: { ar: 'مشروع المزود', en: 'Provider project',},
    slug: 'provider-project',
    description: { en: 'Provider-owned project.' },
    status: 'draft',
    version: 2,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions: ['update', 'submit'],
    ...overrides
  });
}

const draft = project();
const published = project({ id: 'cccccccccccccccccccccccc', slug: 'published-project', status: 'published', availableActions: [], reviewReason: undefined });
const data: ProviderProjectsData = { items: [draft, published], page: 1, limit: 5, total: 2 };
const session = { status: 'authenticated' as const, role: 'provider' as const };

function success(payload: unknown, requestId: string, meta: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data: payload, meta: { requestId, ...meta } }), { status: 200 });
}

describe('Provider projects', () => {
  it('loads the owner-scoped project list with strict query and authorization', async () => {
    const requests: Array<{ url: string; method: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({ url: `${url.pathname}${url.search}`, method: init?.method ?? 'GET', authorization: new Headers(init?.headers).get('authorization') });
        return success({ items: [draft] }, 'provider-projects-list', { page: 2, limit: 5, total: 6 });
      }
    });

    await expect(loadProviderProjects({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider.projects.token' }, query: { status: 'needs_changes', search: 'central', page: 2, limit: 5 } })).resolves.toEqual({ items: [draft], page: 2, limit: 5, total: 6 });
    const url = new URL(requests[0]?.url ?? '', 'http://sadat-real-estate.local');
    expect(requests[0]).toMatchObject({ method: 'GET', authorization: 'Bearer provider.projects.token' });
    expect(Object.fromEntries(url.searchParams)).toEqual({ status: 'needs_changes', search: 'central', sort: 'updatedAt', direction: 'desc', page: '2', limit: '5' });
  });

  it.each([{ page: 0 }, { page: 1, limit: 101 }])('rejects invalid project pagination before network access: %o', async query => {
    let calls = 0;
    const client = new ApiClient({ fetcher: async () => { calls += 1; return success({ items: [] }, 'provider-projects-invalid-pagination'); } });
    await expect(loadProviderProjects({ apiClient: client, query })).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it('uses implemented create, update, and submit routes with provider authorization', async () => {
    const requests: Array<{ url: string; method: string; body: unknown; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown;
        requests.push({ url: new URL(String(input), 'http://sadat-real-estate.local').pathname, method: init?.method ?? 'GET', body, authorization: new Headers(init?.headers).get('authorization') });
        return success(draft, `provider-projects-${requests.length}`);
      }
    });
    const api = createProviderProjectMutationApi({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider.projects.token' } });
    await api.create({ name: { en: 'New project' }, slug: 'new-project', reason: 'Create project' });
    await api.update(projectId, { version: 2, name: { en: 'Updated project' }, reason: 'Update project' });
    await api.submit(projectId, { version: 3, reason: 'Submit project' });
    expect(requests.map(request => [request.method, request.url])).toEqual([
      ['POST', '/api/v1/provider/projects'],
      ['PATCH', `/api/v1/provider/projects/${projectId}`],
      ['POST', `/api/v1/provider/projects/${projectId}/submit`]
    ]);
    expect(requests.every(request => request.authorization === 'Bearer provider.projects.token')).toBe(true);
    expect(requests[2]?.body).toEqual({ version: 3, reason: 'Submit project' });
  });

  it('rejects provider organization assignment before any mutation request', async () => {
    let calls = 0;
    const client = new ApiClient({
      fetcher: async () => {
        calls += 1;
        return success(draft, 'provider-projects-unexpected');
      }
    });
    const api = createProviderProjectMutationApi({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer provider.projects.token' } });

    await expect(api.create({ name: { en: 'Unsafe project' }, slug: 'unsafe-project', organizationId: providerId, reason: 'Attempt organization assignment' })).rejects.toThrow('cannot set organizationId');
    await expect(api.update(projectId, { version: 2, slug: 'updated-project', organizationId: providerId, reason: 'Attempt organization reassignment' })).rejects.toThrow('cannot set organizationId');
    expect(calls).toBe(0);
  });

  it('does not fetch a draft status filter until Apply is submitted', async () => {
    const observedQueries: ProviderProjectsQuery[] = [];
    const load = vi.fn(async (query: ProviderProjectsQuery) => {
      observedQueries.push(query);
      return data;
    });
    const copy = getProviderProjectsCopy('en');
    renderWithLocale(<ProviderProjects locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-projects-count')).toBeInTheDocument());
    expect(observedQueries).toHaveLength(1);

    fireEvent.change(screen.getByLabelText(copy.statusLabel), { target: { value: 'published' } });
    expect(observedQueries).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: copy.apply }));
    await waitFor(() => expect(observedQueries.at(-1)).toMatchObject({ status: 'published' }));
  });

  it.each(['ar', 'en',] as const)('renders safe owned projects and direction for %s', async locale => {
    const load = vi.fn(async (_query: ProviderProjectsQuery) => data);
    const result = renderWithLocale(<ProviderProjects locale={locale} session={session} load={load} />, { locale });
    const copy = getProviderProjectsCopy(locale);
    await waitFor(() => expect(screen.getByTestId('provider-projects-count')).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId(`provider-project-${projectId}`)).toBeInTheDocument();
    expect(within(screen.getByTestId(`provider-project-${projectId}`)).getByText(copy.statuses.draft)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="PRV-15"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain(providerId);
    expect(result.container.textContent).not.toMatch(/reviewedBy|assignedTo|auditData|storageKey|accessToken|refreshToken/u);
    result.unmount();
  });

  it('supports create, update, and submit actions only when returned by the API', async () => {
    const load = vi.fn(async (_query: ProviderProjectsQuery) => data);
    const mutations: ProviderProjectMutationApi = {
      create: vi.fn(async () => draft),
      update: vi.fn(async () => draft),
      submit: vi.fn(async () => ({ ...draft, status: 'pending_review' as const, availableActions: [] }))
    };
    renderWithLocale(<ProviderProjects locale="en" session={session} load={load} mutations={mutations} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`provider-project-${projectId}`)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add new project' }));
    fireEvent.change(screen.getByLabelText('Project name — English'), { target: { value: 'New project' } });
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'new-project' } });
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Create project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutations.create).toHaveBeenCalledWith({ name: { en: 'New project' }, slug: 'new-project', reason: 'Create project' }));

    await waitFor(() => expect(screen.getByTestId(`provider-project-${projectId}`)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: `Edit: ${draft.name.en}` }));
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutations.update).toHaveBeenCalledWith(projectId, expect.objectContaining({ version: 2, reason: 'Update project' })));

    await waitFor(() => expect(screen.getByTestId(`provider-project-${projectId}`)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: `Submit for review: ${draft.name.en}` }));
    fireEvent.change(screen.getByLabelText('Submission reason'), { target: { value: 'Submit project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(mutations.submit).toHaveBeenCalledWith(projectId, { version: 2, reason: 'Submit project' }));
    expect(screen.getByTestId('provider-project-cccccccccccccccccccccccc')).not.toHaveAttribute('data-project-status', 'draft');
  });

  it('fails closed for anonymous sessions and handles an honest empty result', async () => {
    const load = vi.fn(async (_query: ProviderProjectsQuery) => ({ items: [], page: 1, limit: 5, total: 0 }));
    renderWithLocale(<ProviderProjects locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getProviderCopy('en').states.permission.title })).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();

    renderWithLocale(<ProviderProjects locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getProviderProjectsCopy('en').emptyTitle, level: 3 })).toBeInTheDocument());
    expect(screen.getByText(getProviderProjectsCopy('en').emptyBody)).toBeInTheDocument();
  });
});
