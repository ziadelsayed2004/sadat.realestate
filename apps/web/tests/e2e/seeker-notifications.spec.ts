import { expect, test } from '@playwright/test';
import { getSeekerNotificationsCopy } from '../../src/features/seeker/notifications-copy.ts';

const firstId = '4123456789abcdef01234567';
const secondId = '5123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function notificationData(id: string, readAt: string | null = null) {
  return id === firstId
    ? {
        id,
        type: 'viewing.reminder',
        title: { ar: 'تذكير بموعد المعاينة', en: 'Viewing reminder',},
        message: { ar: 'لديك موعد معاينة غداً.', en: 'You have a viewing tomorrow.',},
        link: `/seeker/viewings?viewing=${id}`,
        readAt,
        createdAt: '2026-08-18T10:00:00.000Z'
      }
    : {
        id,
        type: 'request.updated',
        title: { ar: 'تم تحديث طلبك', en: 'Your request was updated',},
        message: { ar: 'تتوفر تفاصيل جديدة لطلبك.', en: 'New details are available for your request.',},
        link: `/seeker/requests/${id}`,
        readAt: readAt ?? '2026-08-17T10:00:00.000Z',
        createdAt: '2026-08-17T09:00:00.000Z'
      };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'notifications-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { accessToken: 'seeker.access.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'seeker', status: 'verified' } }, ...successMeta('notifications-refresh') })
    });
  });
}

async function routeNotifications(page: import('@playwright/test').Page): Promise<void> {
  const readIds = new Set<string>([secondId]);
  let allRead = false;
  await page.route('**/api/v1/seeker/notifications**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.access.token');
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET') {
      const emptyState = new URL(page.url()).searchParams.get('state') === 'empty';
      const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
      const items = emptyState
        ? []
        : [notificationData(firstId, allRead || readIds.has(firstId) ? '2026-08-18T12:00:00.000Z' : null), notificationData(secondId, '2026-08-17T10:00:00.000Z')]
          .filter(item => !unreadOnly || item.readAt === null);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items, unreadCount: allRead ? 0 : 1, page: Number(url.searchParams.get('page') ?? 1), limit: 20, total: items.length }, ...successMeta('notifications-list') }) });
      return;
    }
    if (url.pathname.endsWith('/read-all')) {
      allRead = true;
      readIds.add(firstId);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { updatedCount: 1 }, ...successMeta('notifications-read-all') }) });
      return;
    }
    const id = url.pathname.split('/').at(-2);
    if (id === firstId) readIds.add(id);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id, readAt: '2026-08-18T12:00:00.000Z' }, ...successMeta('notifications-read') }) });
  });
}

test.describe('SEK-07 Seeker Notifications', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'SEK-07' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/seeker/SEK-07.png; Figma node 6027-3579' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker dashboard is approved for desktop only.');
    await routeSession(page);
    await routeNotifications(page);
  });

  test('renders localized owned notifications, safe links, keyboard focus, and visual baseline', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerNotificationsCopy(locale);
    await page.goto(`/seeker/notifications?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-07"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`seeker-notification-${firstId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-notification-${secondId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/recipientId|internalNote|accessToken|refreshToken|providerDocument/u);
    await expect(page.locator('.seeker-notifications__count')).toContainText(copy.unreadCount);
    await expect(page.getByRole('link', { name: copy.openLink }).first()).toHaveAttribute('href', `/seeker/viewings?viewing=${firstId}&lang=${locale}`);
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.seeker-notifications__tab').first().focus();
    await expect(page.locator('.seeker-notifications__tab').first()).toBeFocused();
    await expect(page.getByRole('button', { name: new RegExp(`^${copy.markAll}`) })).toBeVisible();
    await expect(page).toHaveScreenshot(`seeker-notifications-${locale}.png`, { fullPage: true });
  });

  test('filters unread notifications and supports read and read-all actions', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerNotificationsCopy(locale);
    await page.goto(`/seeker/notifications?lang=${encodeURIComponent(locale)}`);
    await page.locator('.seeker-notifications__tab').nth(1).click();
    await expect(page.getByTestId(`seeker-notification-${firstId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-notification-${secondId}`)).toHaveCount(0);
    await page.getByTestId(`seeker-notification-${firstId}`).getByRole('button', { name: copy.markRead }).click();
    await expect(page.locator('.seeker-notifications__feedback[data-state="success"]')).toContainText(copy.mutation.markedRead);
    await page.locator('.seeker-notifications__tab').first().click();
    await expect(page.getByTestId(`seeker-notification-${secondId}`)).toBeVisible();
    await page.getByRole('button', { name: new RegExp(`^${copy.markAll}`) }).click();
    await expect(page.locator('.seeker-notifications__feedback[data-state="success"]')).toContainText(copy.mutation.markedAll);
    await expect(page.locator('.seeker-notifications__count')).toContainText('0');
  });

  test('renders the truthful empty state and fails closed when refresh is denied', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerNotificationsCopy(locale);
    await page.goto(`/seeker/notifications?lang=${encodeURIComponent(locale)}&state=empty`);
    await expect(page.locator('[data-state="empty"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.empty.all.title, level: 3 })).toBeVisible();

    await page.unroute('**/api/v1/auth/refresh');
    await routeSession(page, false);
    await page.goto(`/seeker/notifications?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="SEK-07"]')).toHaveCount(0);
  });
});
