import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  adminSettingsDataSchema,
  type AdminSettingsData,
  type AdminSettingsNamespace
} from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { AdminSettings } from '../src/features/admin_settings/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const session = { status: 'authenticated' as const, role: 'admin' as const };

function settings(namespace: AdminSettingsNamespace, values: Record<string, unknown> = {}): AdminSettingsData {
  return adminSettingsDataSchema.parse({
    namespace,
    schemaVersion: 1,
    values,
    version: 2,
    updatedBy: 'cccccccccccccccccccccccc',
    updatedAt: '2026-08-20T08:00:00.000Z'
  });
}

describe('frontend_074 settings namespaces', () => {
  it.each([
    ['ar', 'properties', '/admin/settings/properties', 'ADM-53'],
    ['ar', 'requests', '/admin/settings/requests', 'ADM-54'],
    ['en', 'advertising', '/admin/settings/advertising', 'ADM-55'],
    ['en', 'seo', '/admin/settings/seo', 'ADM-56'],
    ['zh-CN', 'privacy-security', '/admin/settings/privacy-security', 'ADM-57'],
    ['zh-CN', 'display', '/admin/settings/display', 'ADM-58']
  ] as const)('renders %s %s at the approved route and screen', async (locale, namespace, path, screenId) => {
    const result = renderWithLocale(<AdminSettings path={path} locale={locale} session={session} initialData={settings(namespace)} />, { locale });
    await waitFor(() => expect(result.container.querySelector(`[data-screen-id="${screenId}"]`)).not.toBeNull());
    expect(result.container.querySelector(`[data-route="${path}"]`)).not.toBeNull();
    expect(result.container.querySelector(`[data-testid="admin-settings-${namespace}-form"]`)).not.toBeNull();
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    result.unmount();
  });

  it('edits only server-provided dynamic values and sends the current version', async () => {
    const requests: Array<{ namespace: AdminSettingsNamespace; input: unknown }> = [];
    renderWithLocale(
      <AdminSettings
        path="/admin/settings/display"
        locale="en"
        session={session}
        initialData={settings('display', { show_map: true })}
        update={async (namespace, input) => {
          requests.push({ namespace, input });
          return settings(namespace, { show_map: false });
        }}
      />,
      { locale: 'en' }
    );

    await waitFor(() => expect(screen.getByTestId('admin-settings-display-form')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('show_map'));
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update approved display setting' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      namespace: 'display',
      input: { expectedVersion: 2, schemaVersion: 1, reason: 'Update approved display setting', values: { show_map: false } }
    });
  });

  it('does not load a settings namespace for a non-admin session', async () => {
    let calls = 0;
    renderWithLocale(<AdminSettings path="/admin/settings/requests" locale="en" session={{ status: 'authenticated', role: 'provider' }} load={async () => { calls += 1; return settings('requests'); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Access is not permitted' })).toBeInTheDocument());
    expect(calls).toBe(0);
  });
});
