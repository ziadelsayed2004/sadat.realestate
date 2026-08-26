import { screen, waitFor } from '@testing-library/react';
import { seekerOverviewDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { SeekerOverview, getSeekerCopy, loadSeekerOverview } from '../src/features/seeker/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const overview = seekerOverviewDataSchema.parse({
  requests: 2,
  viewings: 1,
  savedProperties: 7,
  notifications: 3,
  unreadNotifications: 2
});

const session = { status: 'authenticated' as const, role: 'seeker' as const };

describe('Seeker overview', () => {
  it('loads the implemented overview route with the seeker authorization header', async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        requests.push({ url: String(input), authorization: new Headers(init?.headers).get('authorization') });
        return new Response(JSON.stringify({ data: overview, meta: { requestId: 'seeker-overview-test' } }), { status: 200 });
      }
    });

    await expect(loadSeekerOverview({ apiClient: client, authorization: { getAuthorizationHeader: () => 'Bearer seeker-token' } })).resolves.toEqual(overview);
    expect(requests).toEqual([{ url: '/api/v1/seeker/overview', authorization: 'Bearer seeker-token' }]);
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders real summary values and the approved direction for %s', async locale => {
    const result = renderWithLocale(
      <SeekerOverview locale={locale} session={session} initialData={overview} />,
      { locale }
    );
    const copy = getSeekerCopy(locale);
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByTestId('seeker-summary-requests')).toHaveTextContent('2');
    expect(screen.getByTestId('seeker-summary-viewings')).toHaveTextContent('1');
    expect(screen.getByTestId('seeker-summary-saved')).toHaveTextContent('7');
    expect(screen.getByTestId('seeker-summary-notifications')).toHaveTextContent('2');
    expect(screen.getByRole('heading', { name: copy.overview.title, level: 1 })).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="SEK-01"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain('assignedTo');
    expect(result.container.textContent).not.toContain('internalNotes');
    result.unmount();
  });

  it('supports retry and permission states without fallback data', async () => {
    const copy = getSeekerCopy('en');
    const load = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }))
      .mockResolvedValue(overview);
    renderWithLocale(<SeekerOverview locale="en" session={session} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('button', { name: copy.retry })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.states.retry.title })).toBeInTheDocument());

    renderWithLocale(<SeekerOverview locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not render prefetched counts before denying an anonymous session', () => {
    const result = renderWithLocale(
      <SeekerOverview locale="en" session={{ status: 'anonymous' }} initialData={overview} />,
      { locale: 'en' }
    );

    expect(screen.getByRole('heading', { name: getSeekerCopy('en').states.permission.title })).toBeInTheDocument();
    expect(screen.queryByTestId('seeker-summary-requests')).not.toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="SEK-01"]')).toBeInTheDocument();
  });

  it('does not render prefetched counts for an authenticated non-seeker role', () => {
    const result = renderWithLocale(
      <SeekerOverview locale="en" session={{ status: 'authenticated', role: 'provider' }} initialData={overview} />,
      { locale: 'en' }
    );

    expect(screen.getByRole('heading', { name: getSeekerCopy('en').states.permission.title })).toBeInTheDocument();
    expect(screen.queryByTestId('seeker-summary-requests')).not.toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="SEK-01"]')).toBeInTheDocument();
  });
});
