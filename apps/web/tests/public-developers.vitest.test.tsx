import { fireEvent, screen, waitFor } from '@testing-library/react';
import { publicOrganizationListDataSchema, publicOrganizationProfileSchema, requestDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../src/features/contracts/index.ts';
import {
  PublicDeveloperProfile,
  PublicDevelopers,
  defaultPublicDeveloperDirectoryQuery,
  getPublicDevelopersCopy,
  parsePublicDeveloperDirectoryQuery,
  publicDeveloperDirectoryUrl
} from '../src/features/public/index.ts';
import { PublicAuthRoleContext } from '../src/features/public/components.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const directoryData = publicOrganizationListDataSchema.parse({
  items: [{
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    kind: 'developer_company',
    slug: 'approved-builder',
    name: { en: 'Approved builder' },
    description: { en: 'Published developer description.' },
    verified: true,
    locations: [{ en: 'Central district' }],
    projectCount: 2,
    propertyCount: 4
  }],
  page: 1,
  limit: 20,
  total: 1
});

const profileData = publicOrganizationProfileSchema.parse({
  ...directoryData.items[0],
  projects: [{
    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    slug: 'central-project',
    name: { en: 'Central project' },
    description: { en: 'Project description.' },
    website: 'https://example.com/central-project'
  }],
  properties: [{
    id: 'cccccccccccccccccccccccc',
    slug: 'published-home',
    kind: 'property',
    name: { en: 'Published home' },
    transactionType: 'sale',
    projectId: 'bbbbbbbbbbbbbbbbbbbbbbbb'
  }],
  stats: {
    publishedProjects: 2,
    availableProperties: 4,
    saleProperties: 4,
    rentalProperties: 0
  }
});

describe('public developer directory and profiles', () => {
  it('sends a real company inquiry and retains its controlled draft when the surrounding page rerenders', async () => {
    const submitContact = vi.fn(async (payload) => requestDataSchema.parse({ id: 'f'.repeat(24), type: 'contact', source: 'seeker', status: 'new', payload, version: 0, availableActions: ['cancel'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    const actions = { submitContact, submitViewing: vi.fn() };
    const props = { locale: 'en' as const, url: '/developers/approved-builder?lang=en', initialData: profileData, actions };
    const result = renderWithLocale(<PublicDeveloperProfile {...props} />, { locale: 'en' });
    const form = result.container.querySelector('form.public-developer-profile__inquiry')!;
    fireEvent.change(form.querySelector('[name=name]')!, { target: { value: 'Example Customer' } });
    fireEvent.change(form.querySelector('[name=phone]')!, { target: { value: '01012345678' } });
    fireEvent.change(form.querySelector('[name=message]')!, { target: { value: 'First line\nSecond line' } });
    result.rerender(<PublicDeveloperProfile {...props} />);
    expect(form.querySelector('[name=message]')).toHaveValue('First line\nSecond line');
    fireEvent.submit(form);
    await waitFor(() => expect(submitContact).toHaveBeenCalledWith(expect.objectContaining({ organizationId: profileData.id, contactChannel: 'provider', message: 'First line\nSecond line' })));
    await waitFor(() => expect(form.querySelector('[role=status]')).toHaveTextContent('Your inquiry was sent successfully.'));
    expect(form.querySelector('[name=name]')).toHaveValue('Example Customer');
    expect(form.querySelector('[name=message]')).toHaveValue('First line\nSecond line');
  });
  it('parses only the implemented directory query and creates the approved route', () => {
    const query = parsePublicDeveloperDirectoryQuery('/developers?kind=developer_company&search=builder&sort=name&direction=desc&page=2&limit=40&%24where=true');

    expect(query).toMatchObject({ kind: 'developer_company', search: 'builder', sort: 'name', direction: 'desc', page: 2, limit: 40 });
    expect(publicDeveloperDirectoryUrl(query)).toBe('/developers?kind=developer_company&search=builder&sort=name&direction=desc&page=2&limit=40');
    expect(defaultPublicDeveloperDirectoryQuery()).toMatchObject({ sort: 'slug', direction: 'asc', page: 1, limit: 20 });
  });

  it.each(['ar', 'en'] as const)('renders the directory contract projection and direction for %s', (locale) => {
    const result = renderWithLocale(<PublicDevelopers locale={locale} initialData={directoryData} />, { locale });
    const copy = getPublicDevelopersCopy(locale);

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Approved builder' })).toHaveAttribute('href', `/developers/approved-builder?lang=${locale}`);
    expect(screen.getByText('Central district')).toBeInTheDocument();
    expect(result.container.querySelector('.public-developer-directory__card-counts')).toHaveTextContent(copy.projectCount(2));
    expect(result.container.textContent).not.toContain('providerId');
    expect(result.container.textContent).not.toContain('audit');
  });

  it('renders projects and approved properties without inventing media or contact data', () => {
    const result = renderWithLocale(<PublicDeveloperProfile locale="en" url="/developers/approved-builder" initialData={profileData} />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Approved builder', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Central project', level: 3 })).toBeInTheDocument();
    const projectDetails = result.container.querySelector('.public-developer-profile__project-details');
    expect(projectDetails?.querySelector('summary')).toHaveTextContent('View project');
    fireEvent.click(projectDetails!.querySelector('summary')!);
    expect(projectDetails).toHaveAttribute('open');
    expect(screen.getByText('Project description.')).toBeInTheDocument();
    expect(projectDetails?.querySelector('a[href="https://example.com/central-project"]')).toBeInTheDocument();
    expect(result.container.querySelector('a[href*="/properties?projectId="]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Published home' })).toHaveAttribute('href', '/properties/published-home?lang=en');
    expect(screen.getByRole('button', { name: 'Send inquiry' })).toBeInTheDocument();
    expect(result.container.querySelector('form[action="/auth/login"]')).toBeNull();
    expect(result.container.querySelector('[data-state="missing_image"]')).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('organizationId');
  });

  it('supports directory filtering and retries network failures', async () => {
    window.history.replaceState({}, '', '/developers');
    const load = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }))
      .mockResolvedValue(directoryData);
    const copy = getPublicDevelopersCopy('en');
    renderWithLocale(<PublicDevelopers locale="en" load={load} />, { locale: 'en' });

    await waitFor(() => expect(screen.getByRole('status', { name: copy.retryTitle })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Approved builder' })).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'builder' } });
    fireEvent.click(screen.getByRole('button', { name: copy.searchAction }));
    await waitFor(() => expect(load).toHaveBeenCalledWith(expect.objectContaining({ search: 'builder', page: 1 }), expect.any(AbortSignal)));
    expect(window.location.search).toContain('search=builder');
  });

  it.each(['ar', 'en'] as const)('keeps company search available for empty results and clears it without losing language or page history in %s', async locale => {
    window.history.replaceState({ keptPosition: true }, '', `/developers?lang=${locale}`);
    const load = vi.fn().mockResolvedValueOnce({ ...directoryData, items: [], total: 0 }).mockResolvedValueOnce(directoryData);
    const copy = getPublicDevelopersCopy(locale);
    renderWithLocale(<PublicDevelopers locale={locale} initialData={directoryData} load={load} />, { locale });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Missing company' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(document.querySelector('[data-developers-state="empty"]')).not.toBeNull());
    expect(screen.getByRole('searchbox')).toHaveValue('Missing company');
    expect(new URLSearchParams(window.location.search).get('lang')).toBe(locale);
    expect(window.history.state).toMatchObject({ keptPosition: true });
    fireEvent.click(screen.getByRole('button', { name: copy.resetFilters }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Approved builder' })).toBeInTheDocument());
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(new URLSearchParams(window.location.search).has('search')).toBe(false);
    expect(new URLSearchParams(window.location.search).get('lang')).toBe(locale);
    expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.any(AbortSignal));
  });

  it('keeps forbidden and missing profiles safe', async () => {
    const copy = getPublicDevelopersCopy('en');
    const permissionLoad = vi.fn().mockRejectedValue(new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }));
    renderWithLocale(<PublicDevelopers locale="en" load={permissionLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('alert', { name: copy.permissionTitle })).toBeInTheDocument());

    renderWithLocale(<PublicDeveloperProfile locale="en" url="/developers/missing-builder" load={vi.fn().mockRejectedValue(new ApiClientError('missing', { code: 'HTTP_ERROR', status: 404 }))} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.notFoundTitle, level: 1 })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: copy.notFoundLink })).toHaveAttribute('href', '/developers');
  });
});

it('keeps providers browsing the company profile and links their inquiry to their existing account', async () => {
  const id = 'f'.repeat(24);
  const submitContact = vi.fn(async payload => requestDataSchema.parse({ id, type: 'contact', source: 'provider', creatorId: 'a'.repeat(24), status: 'new', payload, version: 0, availableActions: ['cancel'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  const result = renderWithLocale(<PublicAuthRoleContext.Provider value="provider"><PublicDeveloperProfile locale="en" initialData={profileData} actions={{ submitContact, submitViewing: vi.fn() }} /></PublicAuthRoleContext.Provider>, { locale: 'en' });
  const form = result.container.querySelector('form.public-developer-profile__inquiry')!;
  fireEvent.change(form.querySelector('[name=name]')!, { target: { value: 'Example Provider' } });
  fireEvent.change(form.querySelector('[name=phone]')!, { target: { value: '01012345678' } });
  fireEvent.change(form.querySelector('[name=message]')!, { target: { value: 'Project inquiry' } });
  fireEvent.submit(form);
  expect(await screen.findByRole('link', { name: 'Track inquiry' })).toHaveAttribute('href', `/provider/customer-requests?search=${id}&lang=en`);
  expect(form.querySelector('[name=name]')).toHaveValue('Example Provider');
  expect(result.container.querySelector('[data-developer-profile-state]')).toHaveAttribute('data-developer-profile-state', 'success');
});

it('shows a company inquiry permission denial without asking the signed-in user to log in again', async () => {
  const submitContact = vi.fn().mockRejectedValue(new ApiClientError('Forbidden', { code: 'HTTP_ERROR', status: 403 }));
  const result = renderWithLocale(<PublicDeveloperProfile locale="en" initialData={profileData} actions={{ submitContact, submitViewing: vi.fn() }} />, { locale: 'en' });
  const form = result.container.querySelector('form.public-developer-profile__inquiry')!;
  fireEvent.change(form.querySelector('[name=name]')!, { target: { value: 'Example Provider' } });
  fireEvent.change(form.querySelector('[name=phone]')!, { target: { value: '01012345678' } });
  fireEvent.change(form.querySelector('[name=message]')!, { target: { value: 'Retained message' } });
  fireEvent.submit(form);
  await waitFor(() => expect(form.querySelector('[role=alert]')).toHaveTextContent('You are still signed in.'));
  expect(form.querySelector('[role=alert] a')).toBeNull();
  expect(form.querySelector('[name=message]')).toHaveValue('Retained message');
});
