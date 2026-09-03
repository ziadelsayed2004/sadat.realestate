import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  seekerProfileDataSchema,
  type SeekerPreferencesData,
  type SeekerProfileData
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  SeekerProfile,
  createSeekerProfileActions,
  getSeekerProfileCopy,
  loadSeekerPreferences,
  loadSeekerProfile
} from '../src/features/seeker/index.ts';
import type { SeekerProfileActions } from '../src/features/seeker/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const profile = seekerProfileDataSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  roleType: 'seeker',
  status: 'verified',
  email: 'mohamed.salem@example.com',
  firstName: 'Mohamed',
  lastName: 'Salem',
  locale: 'ar'
});

const preferences: SeekerPreferencesData = {
  preferences: { propertyTypes: ['apartment'], locations: ['new-cairo'], purpose: 'buy', minPrice: 500000, maxPrice: 1500000, bedroomsMin: 2, bedroomsMax: 4 },
  updatedAt: '2026-08-18T10:00:00.000Z'
};

const session = { status: 'authenticated' as const, role: 'seeker' as const };

describe('Seeker profile, preferences, and settings', () => {
  it('uses the implemented owned profile and preference routes with authorization', async () => {
    const calls: Array<{ url: string; method: string; authorization: string | null; body: string | undefined }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        calls.push({ url, method, authorization: new Headers(init?.headers).get('authorization'), body: typeof init?.body === 'string' ? init.body : undefined });
        const data = url.endsWith('/auth/account-access/change')
          ? { changed: true }
          : url.endsWith('/preferences')
            ? preferences
            : profile;
        return new Response(JSON.stringify({ data, meta: { requestId: 'seeker-profile-test' } }), { status: 200 });
      }
    });
    const authorization = { getAuthorizationHeader: () => 'Bearer seeker.profile.token' };

    await expect(loadSeekerProfile({ apiClient: client, authorization })).resolves.toEqual(profile);
    await expect(loadSeekerPreferences({ apiClient: client, authorization })).resolves.toEqual(preferences);
    const actions = createSeekerProfileActions({ apiClient: client, authorization });
    await expect(actions.updateProfile({ firstName: 'Mariam' })).resolves.toEqual(profile);
    await expect(actions.updatePreferences({ locations: ['sheikh-zayed'] })).resolves.toEqual(preferences);
    await expect(actions.changePassword({ currentPassword: 'Current-Password-1!', newPassword: 'New-Password-2!' })).resolves.toBeUndefined();

    expect(calls).toEqual([
      { url: '/api/v1/me', method: 'GET', authorization: 'Bearer seeker.profile.token', body: undefined },
      { url: '/api/v1/me/preferences', method: 'GET', authorization: 'Bearer seeker.profile.token', body: undefined },
      { url: '/api/v1/me', method: 'PATCH', authorization: 'Bearer seeker.profile.token', body: JSON.stringify({ firstName: 'Mariam' }) },
      { url: '/api/v1/me/preferences', method: 'PATCH', authorization: 'Bearer seeker.profile.token', body: JSON.stringify({ locations: ['sheikh-zayed'] }) },
      { url: '/api/v1/auth/account-access/change', method: 'POST', authorization: 'Bearer seeker.profile.token', body: JSON.stringify({ currentPassword: 'Current-Password-1!', newPassword: 'New-Password-2!' }) }
    ]);
  });

  it.each(['ar', 'en'] as const)('renders the preference screen in the approved direction for %s', async locale => {
    const copy = getSeekerProfileCopy(locale);
    const result = renderWithLocale(
      <SeekerProfile locale={locale} session={session} tab="preferences" loadProfile={async () => profile} loadPreferences={async () => preferences} actions={emptyActions()} />,
      { locale }
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.preferences.heading, level: 2 })).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-screen-id="SEK-08"]')).not.toBeNull();
    expect(screen.getByDisplayValue('500000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.tabs.profile })).toHaveAttribute('href', `/seeker/profile?tab=personal&lang=${locale}`);
    expect(result.container.textContent).not.toContain('accessToken');
    expect(result.container.textContent).not.toContain('internalNote');
    result.unmount();
  });

  it('validates preference ranges before mutation and saves a valid patch', async () => {
    const actions = emptyActions();
    const copy = getSeekerProfileCopy('en');
    renderWithLocale(<SeekerProfile locale="en" session={session} tab="preferences" loadProfile={async () => profile} loadPreferences={async () => preferences} actions={actions} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.preferences.heading, level: 2 })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(copy.preferences.minPrice), { target: { value: '2000000' } });
    fireEvent.change(screen.getByLabelText(copy.preferences.maxPrice), { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: copy.preferences.save }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.validation);
    expect(actions.updatePreferences).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(copy.preferences.maxPrice), { target: { value: '2500000' } });
    fireEvent.click(screen.getByRole('button', { name: copy.preferences.save }));
    await waitFor(() => expect(actions.updatePreferences).toHaveBeenCalledWith(expect.objectContaining({ minPrice: 2000000, maxPrice: 2500000 })));
    expect(await screen.findByText(copy.preferences.saved)).toBeInTheDocument();
  });

  it('maps the preference chips to the supported preference patch', async () => {
    const actions = emptyActions();
    const copy = getSeekerProfileCopy('en');
    renderWithLocale(<SeekerProfile locale="en" session={session} tab="preferences" loadProfile={async () => profile} loadPreferences={async () => preferences} actions={actions} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.preferences.heading, level: 2 })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Duplex' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: copy.preferences.save }));
    await waitFor(() => expect(actions.updatePreferences).toHaveBeenCalledWith(expect.objectContaining({ propertyTypes: ['apartment', 'duplex'], locations: ['new-cairo'], bedroomsMin: 3, bedroomsMax: 3 })));
  });

  it('renders personal data and settings without unsupported account fields', async () => {
    const profileResult = renderWithLocale(<SeekerProfile locale="en" session={session} tab="profile" loadProfile={async () => profile} actions={emptyActions()} />, { locale: 'en' });
    const profileCopy = getSeekerProfileCopy('en');
    await waitFor(() => expect(screen.getByRole('heading', { name: profileCopy.profile.heading, level: 2 })).toBeInTheDocument());
    expect(profileResult.container.querySelector('[data-screen-id="SEK-09"]')).not.toBeNull();
    expect(screen.getByDisplayValue(profile.email)).toBeDisabled();
    profileResult.unmount();

    const settingsResult = renderWithLocale(<SeekerProfile locale="en" session={session} tab="settings" loadProfile={async () => profile} actions={emptyActions()} />, { locale: 'en' });
    const settingsCopy = getSeekerProfileCopy('en');
    await waitFor(() => expect(screen.getByRole('heading', { name: settingsCopy.settings.heading, level: 1 })).toBeInTheDocument());
    expect(settingsResult.container.querySelector('[data-screen-id="SEK-10"]')).not.toBeNull();
    expect(screen.getAllByText(settingsCopy.unavailable).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue(profile.email)).toBeDisabled();
    expect(settingsResult.container.querySelectorAll('.seeker-profile__settings-card')).toHaveLength(5);
    expect(screen.getByLabelText('Current password')).toBeEnabled();
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Delete account permanently' })).toBeDisabled();
    settingsResult.unmount();
  });

  it('changes a valid password and signs the current browser out', async () => {
    const actions = emptyActions();
    const authClient = {
      getSnapshot: () => ({ status: 'authenticated' }),
      getAuthorizationHeader: () => 'Bearer seeker.profile.token',
      logout: vi.fn().mockResolvedValue(undefined)
    };
    renderWithLocale(<SeekerProfile locale="en" session={session} tab="settings" loadProfile={async () => profile} actions={actions} authClient={authClient} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByLabelText('Current password')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Current-Password-1!' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'New-Password-2!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'New-Password-2!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(actions.changePassword).toHaveBeenCalledWith({ currentPassword: 'Current-Password-1!', newPassword: 'New-Password-2!' }));
    await waitFor(() => expect(authClient.logout).toHaveBeenCalledTimes(1));
  });

  it('resolves the canonical personal profile URL to SEK-09', async () => {
    const originalLocation = `${window.location.pathname}${window.location.search}`;
    window.history.pushState({}, '', '/seeker/profile?tab=personal');
    const result = renderWithLocale(<SeekerProfile locale="en" session={session} loadProfile={async () => profile} actions={emptyActions()} />, { locale: 'en' });
    try {
      await waitFor(() => expect(screen.getByRole('heading', { name: getSeekerProfileCopy('en').profile.heading, level: 2 })).toBeInTheDocument());
      expect(result.container.querySelector('[data-screen-id="SEK-09"]')).not.toBeNull();
      expect(result.container.querySelector('[data-route="/seeker/profile?tab=personal"]')).not.toBeNull();
      expect(screen.getByDisplayValue(profile.email)).toBeDisabled();
    } finally {
      result.unmount();
      window.history.pushState({}, '', originalLocation || '/');
    }
  });

  it('supports retry and fails closed for an anonymous session', async () => {
    const copy = getSeekerProfileCopy('en');
    const load = vi.fn<() => Promise<SeekerProfileData>>()
      .mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }))
      .mockResolvedValue(profile);
    renderWithLocale(<SeekerProfile locale="en" session={session} tab="profile" loadProfile={load} actions={emptyActions()} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('button', { name: copy.retry })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.retry }));
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.profile.heading, level: 2 })).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);

    renderWithLocale(<SeekerProfile locale="en" session={{ status: 'anonymous' }} loadProfile={async () => profile} actions={emptyActions()} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
  });
});

function emptyActions(): SeekerProfileActions & { readonly updateProfile: ReturnType<typeof vi.fn>; readonly updatePreferences: ReturnType<typeof vi.fn>; readonly changePassword: ReturnType<typeof vi.fn> } {
  return {
    updateProfile: vi.fn().mockResolvedValue(profile),
    updatePreferences: vi.fn().mockResolvedValue(preferences),
    changePassword: vi.fn().mockResolvedValue(undefined)
  };
}
