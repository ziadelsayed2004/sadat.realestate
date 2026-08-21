import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  adminSettingsDataSchema,
  type AdminSettingsData,
  type AdminSettingsNamespace
} from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  AdminSettings,
  createAdminSettingsSource,
  loadAdminSettings,
  updateAdminSettings
} from '../src/features/admin_settings/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const adminId = 'cccccccccccccccccccccccc';
const session = { status: 'authenticated' as const, role: 'admin' as const };

function settings(namespace: AdminSettingsNamespace = 'platform', version = 4): AdminSettingsData {
  return adminSettingsDataSchema.parse({
    namespace,
    schemaVersion: 1,
    values: namespace === 'platform'
      ? {
          platform_name: { ar: 'منصة سادات', en: 'Sadat Real Estate', 'zh-CN': '萨达特房地产' },
          short_name: { ar: 'سادات', en: 'Sadat', 'zh-CN': '萨达特' },
          primary_email: 'ops@example.com',
          approved_unknown_value: 'preserved'
        }
      : namespace === 'contact'
        ? { primary_phone: '+201000000000', office_address: { ar: 'مدينة السادات', en: 'Sadat City', 'zh-CN': '萨达特市' } }
        : { facebook_url: 'https://facebook.com/sadat', instagram_url: 'https://instagram.com/sadat' },
    version,
    updatedBy: adminId,
    updatedAt: '2026-08-20T08:00:00.000Z'
  });
}

function envelope(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-settings-test' } }), { status, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown;
      requests.push({ method: init?.method ?? 'GET', path: url.pathname, body });
      const namespace = url.pathname.endsWith('/contact') ? 'contact' : url.pathname.endsWith('/social') ? 'social' : 'platform';
      return envelope(settings(namespace, init?.method === 'PUT' ? 5 : 4));
    }
  });
}

describe('Admin platform, contact, and social settings', () => {
  it('uses only the implemented versioned settings routes and rejects unsafe payloads', async () => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const client = apiClientFor(requests);
    await expect(loadAdminSettings('platform', { apiClient: client })).resolves.toMatchObject({ namespace: 'platform', version: 4 });
    await expect(updateAdminSettings('contact', { schemaVersion: 1, values: { primary_phone: '+201000000000' }, expectedVersion: 4, reason: 'Update contact phone' }, { apiClient: client })).resolves.toMatchObject({ namespace: 'contact', version: 5 });
    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual(['GET /api/v1/admin/settings/platform', 'PUT /api/v1/admin/settings/contact']);
    await expect(updateAdminSettings('social', { schemaVersion: 1, values: { api_key: 'secret-value' }, expectedVersion: 4, reason: 'Unsafe update' }, { apiClient: client })).rejects.toThrow();
  });

  it.each([
    ['ar', 'platform', '/admin/settings/platform', 'ADM-50'],
    ['en', 'contact', '/admin/settings/contact', 'ADM-51'],
    ['zh-CN', 'social', '/admin/settings/social', 'ADM-52']
  ] as const)('renders %s %s with the approved screen, direction, and safe projection', async (locale, namespace, path, screenId) => {
    const result = renderWithLocale(<AdminSettings path={path} locale={locale} session={session} initialData={settings(namespace)} />, { locale });
    await waitFor(() => expect(result.container.querySelector(`[data-screen-id="${screenId}"]`)).not.toBeNull());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|privateUrl|secret|token|auditData|internalNotes/u);
    result.unmount();
  });

  it('fails closed for anonymous sessions without invoking the loader', async () => {
    let calls = 0;
    renderWithLocale(<AdminSettings path="/admin/settings/platform" locale="en" session={{ status: 'anonymous' }} load={async () => { calls += 1; return settings(); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Access is not permitted' })).toBeInTheDocument());
    expect(calls).toBe(0);
  });

  it('shows an unavailable namespace with an empty safe draft state', async () => {
    renderWithLocale(<AdminSettings path="/admin/settings/social" locale="en" session={session} load={async () => { throw new ApiClientError('missing', { code: 'HTTP_ERROR', status: 404 }); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Settings are not available yet' })).toBeInTheDocument());
    expect(screen.getByTestId('admin-settings-social-form')).toBeInTheDocument();
    expect(screen.getByText(/No unverified production values are added/u)).toBeInTheDocument();
  });

  it('requires a reason and sends the server version plus multilingual values on save', async () => {
    const requests: Array<{ namespace: AdminSettingsNamespace; input: unknown }> = [];
    const source = createAdminSettingsSource({ apiClient: apiClientFor([]) });
    renderWithLocale(<AdminSettings path="/admin/settings/platform" locale="en" session={session} initialData={settings()} update={async (namespace, input) => { requests.push({ namespace, input }); return settings(namespace, 5); }} source={source} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('admin-settings-platform-form')).toBeInTheDocument());
    fireEvent.submit(screen.getByTestId('admin-settings-platform-form').querySelector('form')!);
    expect(screen.getByText('A change reason is required.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update approved platform contact' } });
    fireEvent.change(screen.getByLabelText('English', { selector: '#admin-settings-platform_name-en' }), { target: { value: 'Sadat Homes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(requests).toHaveLength(1));
    const request = requests[0];
    if (!request) throw new Error('Expected one settings update request.');
    expect(request).toMatchObject({ namespace: 'platform', input: { expectedVersion: 4, schemaVersion: 1, reason: 'Update approved platform contact' } });
    expect(request.input).toMatchObject({ values: { platform_name: { en: 'Sadat Homes' }, approved_unknown_value: 'preserved' } });
  });

  it('surfaces an optimistic version conflict instead of overwriting the draft', async () => {
    renderWithLocale(<AdminSettings path="/admin/settings/contact" locale="en" session={session} initialData={settings('contact')} update={async () => { throw new ApiClientError('conflict', { code: 'HTTP_ERROR', status: 409 }); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('admin-settings-contact-form')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update contact details' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Version conflict' })).toBeInTheDocument());
  });
});
