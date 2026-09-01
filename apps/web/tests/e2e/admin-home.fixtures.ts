import type { Page } from '@playwright/test';

export const adminHomeBannerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminHomeTipId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
export const adminHomeSectionId = 'dddddddddddddddddddddddd';
const adminId = 'cccccccccccccccccccccccc';

export function adminHomeBannerFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: adminHomeBannerId,
    placementKey: 'homepage.hero',
    title: { ar: 'بانر الصفحة الرئيسية', en: 'Homepage banner',},
    altText: { ar: 'بانر الصفحة الرئيسية', en: 'Homepage banner',},
    startAt: '2026-08-20T08:00:00.000Z',
    endAt: '2026-09-20T08:00:00.000Z',
    status: 'active',
    sortOrder: 0,
    version: 2,
    createdBy: adminId,
    updatedBy: adminId,
    createdAt: '2026-08-19T08:00:00.000Z',
    updatedAt: '2026-08-19T08:00:00.000Z',
    ...overrides
  };
}

export function adminHomeTipFixture() {
  return {
    id: adminHomeTipId,
    key: 'buying_safely',
    title: { ar: 'نصيحة شراء', en: 'Buying safely',},
    body: { ar: 'تحقق من البيانات المنشورة.', en: 'Check the published data.',},
    order: 1,
    active: true,
    status: 'published',
    version: 3,
    updatedBy: adminId,
    updatedAt: '2026-08-19T08:00:00.000Z',
    availableActions: ['update', 'deactivate']
  };
}

export function adminHomeSectionFixture() {
  return {
    id: adminHomeSectionId,
    key: 'featured_properties',
    title: { ar: 'عقارات مميزة', en: 'Featured properties',},
    body: { ar: 'محتوى الصفحة الرئيسية المعتمد.', en: 'Approved homepage section.',},
    order: 2,
    visible: true,
    status: 'published',
    version: 4,
    updatedBy: adminId,
    updatedAt: '2026-08-19T08:00:00.000Z',
    availableActions: ['update', 'publish']
  };
}

function success(data: unknown, requestId: string, meta: Record<string, unknown> = {}) {
  return { data, meta: { requestId, ...meta } };
}

export async function routeAdminHomeApis(page: Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({
    status: allow ? 200 : 401,
    contentType: 'application/json',
    body: JSON.stringify(allow
      ? success({ accessToken: 'admin.home.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: adminId, roleType: 'admin', status: 'verified' } }, 'admin-home-refresh')
      : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-home-refresh-denied' } })
  }));

  await page.route('**/api/v1/admin/banners**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const banner = adminHomeBannerFixture(method === 'POST' ? { status: 'draft', version: 0 } : {});
    if (url.pathname.endsWith('/preview')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ banner, preview: true }, 'admin-home-preview')) });
      return;
    }
    if (url.pathname.endsWith('/media')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ id: 'eeeeeeeeeeeeeeeeeeeeeeee', bannerId: adminHomeBannerId, url: 'https://example.com/banner.png', mime: 'image/png', width: 1200, height: 400, active: true, version: 0, createdBy: adminId, createdAt: '2026-08-19T08:00:00.000Z', updatedAt: '2026-08-19T08:00:00.000Z' }, 'admin-home-media')) });
      return;
    }
    if (url.pathname.endsWith('/order')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success([banner], 'admin-home-order')) });
      return;
    }
    if (method === 'PATCH') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ ...banner, version: 3 }, 'admin-home-banner-update')) });
      return;
    }
    if (method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(banner, 'admin-home-banner-create')) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [banner], page: 1, limit: 20, total: 1 }, 'admin-home-banners', { page: 1, limit: 20, total: 1 })) });
  });

  await page.route('**/api/v1/admin/content/**', async route => {
    const url = new URL(route.request().url());
    const namespace = url.pathname.endsWith('/homepage') ? 'homepage' : 'tips';
    const data = namespace === 'homepage' ? { namespace, items: [adminHomeSectionFixture()] } : { namespace, items: [adminHomeTipFixture()] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(data, `admin-home-${namespace}-${route.request().method().toLowerCase()}`)) });
  });
}
