import { fireEvent, screen, waitFor } from '@testing-library/react';
import { seekerOverviewDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { SeekerNavigation, SeekerOverview, getSeekerCopy, loadSeekerOverview } from '../src/features/seeker/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const overview = seekerOverviewDataSchema.parse({
  requests: 2,
  activeRequests: 2,
  viewings: 1,
  savedProperties: 7,
  notifications: 3,
  unreadNotifications: 2
});

const session = { status: 'authenticated' as const, role: 'seeker' as const };

describe('Seeker overview', () => {
  it.each([[0, 0], [3, 0], [3, 2]])('only marks the bell for actual unread notifications (total %s, unread %s)', (notifications, unreadNotifications) => {
    renderWithLocale(<SeekerOverview locale="en" session={session} initialData={{ ...overview, notifications, unreadNotifications }} />, { locale: 'en' });
    expect(screen.queryByTestId('seeker-notifications-indicator') !== null).toBe(unreadNotifications > 0);
  });

  it('loads the real count on other seeker pages and clears it when refreshed', async () => {
    let unreadCount = 1;
    const fetcher = vi.fn(async (input: string | URL | Request) => new Response(JSON.stringify({
      data: String(input).includes('/seeker/notifications')
        ? { items: unreadCount ? [{ id: '4123456789abcdef01234567', type: 'request.updated', title: { en: 'Request updated' }, readAt: null, createdAt: '2026-08-18T10:00:00.000Z' }] : [], unreadCount, page: 1, limit: 1, total: unreadCount }
        : { id: '64b7f39d1f5a2a0012345678', roleType: 'seeker', status: 'verified', email: 'private@example.com', firstName: 'Mohamed', lastName: 'Ahmed', locale: 'en' },
      meta: { requestId: 'seeker-navigation-count' }
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const result = renderWithLocale(<SeekerNavigation locale="en" activePath="/seeker/saved" authClient={{ getAuthorizationHeader: () => 'Bearer seeker-token' }} />, { locale: 'en' });
    expect(screen.queryByTestId('seeker-notifications-indicator')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('seeker-notifications-indicator')).toBeInTheDocument());
    unreadCount = 0;
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(screen.queryByTestId('seeker-notifications-indicator')).not.toBeInTheDocument());
    expect(fetcher).toHaveBeenCalledWith('/api/v1/seeker/notifications?page=1&limit=1&unreadOnly=false', expect.objectContaining({ headers: expect.any(Object) }));
    result.unmount();
    vi.unstubAllGlobals();
  });

  it('loads the authenticated profile name for the shared navigation without rendering the email', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: '64b7f39d1f5a2a0012345678',
        roleType: 'seeker',
        status: 'verified',
        email: 'private@example.com',
        firstName: 'Mohamed',
        lastName: 'Ahmed',
        locale: 'en'
      },
      meta: { requestId: 'seeker-profile-navigation-test' }
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);

    const result = renderWithLocale(
      <SeekerNavigation locale="en" activePath="/seeker" authClient={{ getAuthorizationHeader: () => 'Bearer seeker-token' }} />,
      { locale: 'en' }
    );

    await waitFor(() => expect(screen.getAllByText('Mohamed Ahmed')).toHaveLength(2));
    expect(result.container).not.toHaveTextContent('private@example.com');
    expect(fetcher).toHaveBeenCalledWith('/api/v1/me', expect.objectContaining({
      headers: expect.any(Object)
    }));
    vi.unstubAllGlobals();
  });

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

  it.each(['ar', 'en',] as const)('renders real summary values and the approved direction for %s', async locale => {
    const result = renderWithLocale(
      <SeekerOverview locale={locale} session={session} initialData={overview} />,
      { locale }
    );
    const copy = getSeekerCopy(locale);
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByTestId('seeker-summary-requests')).toHaveTextContent('2');
    expect(screen.getByTestId('seeker-summary-active-requests')).toHaveTextContent('2');
    expect(screen.getByTestId('seeker-summary-viewings')).toHaveTextContent('1');
    expect(screen.getByTestId('seeker-summary-saved')).toHaveTextContent('7');
    expect(screen.getByRole('heading', { name: copy.overview.title, level: 1 })).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="SEK-01"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain('assignedTo');
    expect(result.container.textContent).not.toContain('internalNotes');
    result.unmount();
  });

  it('renders the optional activity projection without exposing internal fields', () => {
    const projected = seekerOverviewDataSchema.parse({
      ...overview,
      recentRequests: [{
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa', type: 'property_search', status: 'under_review',
        payload: { locations: ['First District'] },
        createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-02T10:00:00.000Z'
      }],
      upcomingViewings: [{
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb', propertyId: 'cccccccccccccccccccccccc', status: 'confirmed',
        requestedAt: '2026-08-11T14:00:00.000Z', timezone: 'Africa/Cairo'
      }],
      recentNotifications: [{
        id: 'dddddddddddddddddddddddd', type: 'request.updated',
        title: { ar: 'تم تحديث طلبك', en: 'Your request was updated' },
        message: { ar: 'سيتواصل معك الفريق قريباً.', en: 'The team will contact you soon.' },
        readAt: null, createdAt: '2026-08-03T10:00:00.000Z'
      }]
    });
    const result = renderWithLocale(<SeekerOverview locale="ar" session={session} initialData={projected} />, { locale: 'ar' });
    expect(result.container.querySelector('[data-activity-state="projected"]')).not.toBeNull();
    expect(screen.getByText(getSeekerCopy('ar').overview.recent.requests)).toBeInTheDocument();
    expect(screen.getByText('REQ-AAAA')).toBeInTheDocument();
    expect(screen.getByText('تم تحديث طلبك')).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('internalNotes');
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
    expect(screen.queryByTestId('seeker-notifications-indicator')).not.toBeInTheDocument();
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
