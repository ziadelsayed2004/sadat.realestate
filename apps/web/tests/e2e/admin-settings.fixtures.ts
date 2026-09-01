import type { Page } from '@playwright/test';
import type { AdminSettingsNamespace } from '@sadat-real-estate/contracts';

const adminId = 'cccccccccccccccccccccccc';

function success(data: unknown, requestId: string) {
  return { data, meta: { requestId } };
}

function settings(namespace: AdminSettingsNamespace, version = 4) {
  const values = namespace === 'platform'
    ? { platform_name: { ar: 'منصة سادات', en: 'Sadat Real Estate',}, short_name: { ar: 'سادات', en: 'Sadat',}, primary_email: 'ops@example.com' }
    : namespace === 'contact'
      ? { primary_phone: '+201000000000', whatsapp_number: '+201000000001', office_address: { ar: 'مدينة السادات', en: 'Sadat City',}, map_url: 'https://maps.example.com/sadat' }
      : namespace === 'social'
        ? { facebook_url: 'https://facebook.com/sadat', instagram_url: 'https://instagram.com/sadat', linkedin_url: 'https://linkedin.com/company/sadat' }
        : namespace === 'display'
          ? { show_map: true }
          : {};
  return {
    namespace,
    schemaVersion: 1,
    values,
    version,
    updatedBy: adminId,
    updatedAt: '2026-08-20T08:00:00.000Z'
  };
}

export async function routeAdminSettingsApis(page: Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({
    status: allow ? 200 : 401,
    contentType: 'application/json',
    body: JSON.stringify(allow
      ? success({ accessToken: 'admin.settings.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: adminId, roleType: 'admin', status: 'verified' } }, 'admin-settings-refresh')
      : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-settings-refresh-denied' } })
  }));

  await page.route('**/api/v1/admin/settings/**', async route => {
    const url = new URL(route.request().url());
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const namespace = pathSegments[pathSegments.length - 1] as AdminSettingsNamespace;
    const version = route.request().method() === 'PUT' ? 5 : 4;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(settings(namespace, version), `admin-settings-${namespace}-${route.request().method().toLowerCase()}`)) });
  });
}
