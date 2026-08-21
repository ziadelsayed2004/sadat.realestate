import { expect, type Page, type Route } from '@playwright/test';

export type AdminMasterDataLocale = 'ar' | 'en' | 'zh-CN';
export type AdminMasterDataSessionRole = 'admin' | 'seeker';

export const MASTER_CATEGORY_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const MASTER_LOCATION_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
export const MASTER_FEATURE_ID = 'cccccccccccccccccccccccc';

export function localeForMasterDataProject(projectName: string): AdminMasterDataLocale {
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function meta(requestId: string, total = 1) {
  return { meta: { requestId, page: 1, limit: 20, total } };
}

function categoryFixture() {
  return {
    id: MASTER_CATEGORY_ID,
    kind: 'category',
    name: { ar: 'عقارات', en: 'Properties', 'zh-CN': '房产' },
    slug: 'properties',
    order: 1,
    active: true,
    version: 2,
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-18T08:00:00.000Z',
    availableActions: ['update', 'delete']
  };
}

function locationFixture() {
  return {
    id: MASTER_LOCATION_ID,
    kind: 'location',
    name: { ar: 'مدينة السادات', en: 'Sadat City', 'zh-CN': '萨达特城' },
    slug: 'sadat-city',
    order: 1,
    active: true,
    version: 1,
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-18T08:00:00.000Z',
    availableActions: ['update', 'delete']
  };
}

function featureFixture() {
  return {
    id: MASTER_FEATURE_ID,
    kind: 'feature',
    groupKey: 'building_amenities',
    name: { ar: 'مصعد', en: 'Elevator', 'zh-CN': '电梯' },
    slug: 'elevator',
    order: 1,
    active: true,
    version: 1,
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-18T08:00:00.000Z',
    availableActions: ['update', 'delete']
  };
}

function assertAdminRequest(route: Route, token: string, methods: readonly string[] = ['GET']): void {
  expect(methods).toContain(route.request().method());
  expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
}

async function fulfillList(route: Route, item: unknown, requestId: string): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { items: [item] }, ...meta(requestId) })
  });
}

export async function routeAdminMasterData(page: Page, role: AdminMasterDataSessionRole = 'admin', token = 'admin.master-data.e2e'): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: 'dddddddddddddddddddddddd', roleType: role, status: 'verified' }
        },
        ...meta('admin-master-data-refresh')
      })
    });
  });

  await page.route('**/api/v1/admin/property-categories**', async route => {
    assertAdminRequest(route, token, ['GET', 'POST', 'PATCH', 'DELETE']);
    const method = route.request().method();
    if (method === 'GET') return fulfillList(route, categoryFixture(), 'admin-master-data-categories');
    if (method === 'POST' || method === 'PATCH') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: categoryFixture(), ...meta('admin-master-data-category-mutation') }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: MASTER_CATEGORY_ID, deleted: true }, ...meta('admin-master-data-category-delete', 0) }) });
  });

  await page.route('**/api/v1/admin/locations**', async route => {
    assertAdminRequest(route, token, ['GET', 'POST', 'PATCH', 'DELETE']);
    const method = route.request().method();
    if (method === 'GET') return fulfillList(route, locationFixture(), 'admin-master-data-locations');
    if (method === 'POST' || method === 'PATCH') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: locationFixture(), ...meta('admin-master-data-location-mutation') }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: MASTER_LOCATION_ID, deleted: true }, ...meta('admin-master-data-location-delete', 0) }) });
  });

  await page.route('**/api/v1/admin/features**', async route => {
    assertAdminRequest(route, token, ['GET', 'POST', 'PATCH', 'DELETE']);
    const method = route.request().method();
    if (method === 'GET') return fulfillList(route, featureFixture(), 'admin-master-data-features');
    if (method === 'POST' || method === 'PATCH') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: featureFixture(), ...meta('admin-master-data-feature-mutation') }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: MASTER_FEATURE_ID, deleted: true }, ...meta('admin-master-data-feature-delete', 0) }) });
  });
}
