import { fireEvent, screen, waitFor } from '@testing-library/react';
import { publicOrganizationListDataSchema, publicOrganizationProfileSchema } from '@sadat-real-estate/contracts';
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
import { renderWithLocale } from '../src/features/testing/index.ts';

const directoryData = publicOrganizationListDataSchema.parse({
  items: [{
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    kind: 'developer_company',
    slug: 'approved-builder',
    name: { en: 'Approved builder' },
    description: { en: 'Published developer description.' },
    verified: true,
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
  }]
});

describe('public developer directory and profiles', () => {
  it('parses only the implemented directory query and creates the approved route', () => {
    const query = parsePublicDeveloperDirectoryQuery('/developers?kind=developer_company&search=builder&sort=name&direction=desc&page=2&limit=40&%24where=true');

    expect(query).toMatchObject({ kind: 'developer_company', search: 'builder', sort: 'name', direction: 'desc', page: 2, limit: 40 });
    expect(publicDeveloperDirectoryUrl(query)).toBe('/developers?kind=developer_company&search=builder&sort=name&direction=desc&page=2&limit=40');
    expect(defaultPublicDeveloperDirectoryQuery()).toMatchObject({ sort: 'slug', direction: 'asc', page: 1, limit: 20 });
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders the directory contract projection and direction for %s', (locale) => {
    const result = renderWithLocale(<PublicDevelopers locale={locale} initialData={directoryData} />, { locale });
    const copy = getPublicDevelopersCopy(locale);

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Approved builder' })).toHaveAttribute('href', '/developers/approved-builder');
    expect(screen.getByText(copy.projectCount(2))).toBeInTheDocument();
    expect(screen.getByText(copy.propertyCount(4))).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('providerId');
    expect(result.container.textContent).not.toContain('audit');
  });

  it('renders projects and approved properties without inventing media or contact data', () => {
    const result = renderWithLocale(<PublicDeveloperProfile locale="en" url="/developers/approved-builder" initialData={profileData} />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Approved builder', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Central project', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Project description.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Published home' })).toHaveAttribute('href', '/properties/published-home');
    expect(screen.getByText('Public contact details are not available in this profile yet.')).toBeInTheDocument();
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
