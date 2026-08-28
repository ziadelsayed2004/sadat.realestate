import { fireEvent, screen, waitFor } from '@testing-library/react';
import { cmsPublicContentListDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  PublicAbout,
  PublicTeam,
  getPublicAboutTeamCopy,
  loadPublicAbout,
  loadPublicTeam
} from '../src/features/content/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const aboutData = cmsPublicContentListDataSchema.parse({
  items: [
    { key: 'mission', title: { ar: 'رسالتنا', en: 'Our mission', 'zh-CN': '我们的使命' }, body: { en: 'A published mission.' }, order: 0 },
    { key: 'trust', title: { en: 'Trust' }, body: { en: 'A published trust principle.' }, order: 1 }
  ]
});

const teamData = cmsPublicContentListDataSchema.parse({
  items: [{
    key: 'leader',
    title: { en: 'Platform lead' },
    name: { en: 'Published team member' },
    role: { en: 'Platform lead' },
    bio: { en: 'A public biography.' },
    photoAssetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    order: 0
  }]
});

describe('public About and Team content', () => {
  it('loads the implemented versioned public CMS routes and keeps the safe projection', async () => {
    const requests: string[] = [];
    const client = new ApiClient({
      fetcher: async input => {
        requests.push(String(input));
        const data = String(input).includes('/team') ? teamData : aboutData;
        return new Response(JSON.stringify({ data, meta: { requestId: 'about-team-request' } }), { status: 200 });
      }
    });

    await expect(loadPublicAbout({ apiClient: client })).resolves.toEqual(aboutData);
    await expect(loadPublicTeam({ apiClient: client })).resolves.toEqual(teamData);
    expect(requests).toEqual(['/api/v1/public/about', '/api/v1/public/team']);
    expect(JSON.stringify(teamData)).not.toContain('updatedBy');
    expect(JSON.stringify(teamData)).not.toContain('status');
    expect(JSON.stringify(aboutData)).not.toContain('active');
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders published About content with the correct direction for %s', locale => {
    const result = renderWithLocale(<PublicAbout locale={locale} initialData={aboutData} />, { locale });
    const copy = getPublicAboutTeamCopy(locale);
    const howTitle = locale === 'ar'
      ? 'رحلتك معنا خطوة بخطوة'
      : locale === 'zh-CN'
        ? '与我们一起一步一步'
        : 'Your journey with us, step by step';

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(copy.aboutTitle);
    expect(screen.getByRole('heading', { name: howTitle, level: 2 })).toBeInTheDocument();
    expect(result.container.querySelector('[data-about-state="success"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain('updatedBy');
    result.unmount();
  });

  it('renders the safe Team projection without inventing image URLs', () => {
    const result = renderWithLocale(<PublicTeam locale="en" initialData={teamData} />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Published team member', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Platform lead')).toBeInTheDocument();
    expect(screen.getByText('A public biography.')).toBeInTheDocument();
    expect(result.container.querySelector('[data-media-state="unavailable"]')).not.toBeNull();
    expect(result.container.querySelector('img[src*="aaaaaaaa"]')).toBeNull();
  });

  it('supports empty and retry states without production fallback content', async () => {
    const copy = getPublicAboutTeamCopy('en');
    const load = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }))
      .mockResolvedValue(aboutData);
    renderWithLocale(<PublicAbout locale="en" load={load} />, { locale: 'en' });

    await waitFor(() => expect(screen.getByRole('region', { name: copy.retryTitle })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(copy.aboutTitle));
    expect(load).toHaveBeenCalledTimes(2);

    renderWithLocale(<PublicTeam locale="en" initialData={{ items: [], }} />, { locale: 'en' });
    expect(screen.getByRole('region', { name: copy.emptyTitle })).toBeInTheDocument();
  });
});
