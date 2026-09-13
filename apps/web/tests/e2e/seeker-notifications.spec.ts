import { expect, test } from '@playwright/test';
import { getSeekerNotificationsCopy } from '../../src/features/seeker/notifications-copy.ts';

const firstId = '4123456789abcdef01234567';
const secondId = '5123456789abcdef01234567';
const thirdId = '6123456789abcdef01234567';
const fourthId = '7123456789abcdef01234567';
const fifthId = '8123456789abcdef01234567';
const sixthId = '9123456789abcdef01234567';
const seventhId = 'a123456789abcdef01234567';
const eighthId = 'b123456789abcdef01234567';
const notificationIds = [firstId, secondId, thirdId, fourthId, fifthId, sixthId, seventhId, eighthId] as const;
const unreadIds = new Set<string>([firstId, secondId, thirdId, fourthId]);

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function notificationData(id: string) {
  const now = Date.now();
  const fixtures = {
    [firstId]: {
      type: 'viewing.reminder',
      title: { ar: 'تذكير بموعد معاينة', en: 'Viewing appointment reminder' },
      message: { ar: 'موعد معاينتك لشقة SDT-1890 بالحي الأول غداً الأحد الساعة 4:00 مساءً.', en: 'Your viewing for apartment SDT-1890 in the First District is tomorrow at 4:00 PM.' },
      link: `/seeker/viewings?viewing=${firstId}&ref=VIEW-201`,
      createdAt: new Date(now - 60 * 60 * 1000).toISOString()
    },
    [secondId]: {
      type: 'request.updated',
      title: { ar: 'تحديث حالة الطلب', en: 'Request status update' },
      message: { ar: 'طلبك REQ-4798 انتقل إلى مرحلة معاينة — تم تأكيد الموعد مع المزود.', en: 'Your request REQ-4798 moved to viewing — the provider confirmed the appointment.' },
      link: `/seeker/requests/${secondId}?ref=REQ-4798`,
      createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString()
    },
    [thirdId]: {
      type: 'community.reply',
      title: { ar: 'رد جديد على طلبك', en: 'New reply to your request' },
      message: { ar: 'مكتب النيل العقاري ردّ على استفسارك بخصوص محل SDT-1744.', en: 'Al Nile Real Estate replied to your inquiry about shop SDT-1744.' },
      link: `/seeker/requests/${thirdId}?ref=REQ-4766`,
      createdAt: new Date(now - 25 * 60 * 60 * 1000).toISOString()
    },
    [fourthId]: {
      type: 'property.saved',
      title: { ar: 'تحديث عقار محفوظ', en: 'Saved property update' },
      message: { ar: 'انخفض سعر فيلا SDT-2103 التي حفظتها — راجع التفاصيل الآن.', en: 'The price of saved villa SDT-2103 dropped — review the details now.' },
      link: `/properties/${fourthId}?ref=P002`,
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    [fifthId]: {
      type: 'request.received',
      title: { ar: 'تم استلام طلبك', en: 'Your request was received' },
      message: { ar: 'استلمنا طلبك REQ-4821 وهو الآن قيد المراجعة — سنتواصل معك قريباً.', en: 'We received request REQ-4821 and it is under review — we will contact you soon.' },
      link: `/seeker/requests/${fifthId}?ref=REQ-4821`,
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    [sixthId]: {
      type: 'property.match',
      title: { ar: 'عقار جديد يطابق تفضيلاتك', en: 'A new property matches your preferences' },
      message: { ar: 'شقة جديدة بالحي الثالث، 3 غرف ضمن ميزانيتك — شاهدها الآن.', en: 'A new three-bedroom apartment in the Third District matches your budget — view it now.' },
      link: `/properties/${sixthId}`,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    [seventhId]: {
      type: 'profile.updated',
      title: { ar: 'تم تحديث بيانات حسابك', en: 'Your account details were updated' },
      message: { ar: 'تم تحديث رقم هاتفك بنجاح. إذا لم تقم بهذا التغيير تواصل معنا.', en: 'Your phone number was updated successfully. Contact us if you did not make this change.' },
      link: '/seeker/profile',
      createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    [eighthId]: {
      type: 'viewing.cancelled',
      title: { ar: 'تم إلغاء موعد معاينة', en: 'Viewing appointment cancelled' },
      message: { ar: 'تم إلغاء معاينة شقة SDT-1590 بناءً على طلبك. يمكنك جدولة موعد آخر.', en: 'The viewing for apartment SDT-1590 was cancelled at your request. You can schedule another appointment.' },
      link: `/seeker/viewings?viewing=${eighthId}&ref=VIEW-160`,
      createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  } as const;
  const fixture = fixtures[id as keyof typeof fixtures];
  if (fixture === undefined) throw new Error(`Unknown notification fixture: ${id}`);
  return { id, ...fixture, readAt: unreadIds.has(id) ? null : new Date(now - 30 * 60 * 1000).toISOString() };
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
  const readIds = new Set<string>([fifthId, sixthId, seventhId, eighthId]);
  let allRead = false;
  await page.route('**/api/v1/seeker/notifications**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.access.token');
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET') {
      const emptyState = new URL(page.url()).searchParams.get('state') === 'empty';
      const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
      const allItems = emptyState ? [] : notificationIds.map(id => {
        const item = notificationData(id);
        return allRead || readIds.has(id) ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item;
      });
      const items = allItems.filter(item => !unreadOnly || item.readAt === null);
      const unreadCount = allItems.filter(item => item.readAt === null).length;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items, unreadCount, page: Number(url.searchParams.get('page') ?? 1), limit: 20, total: items.length }, ...successMeta('notifications-list') }) });
      return;
    }
    if (url.pathname.endsWith('/read-all')) {
      allRead = true;
      readIds.add(firstId);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { updatedCount: 4 }, ...successMeta('notifications-read-all') }) });
      return;
    }
    const id = url.pathname.split('/').at(-2);
    if (id !== undefined) readIds.add(id);
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

  test('renders the eight localized SEK-07 notifications, safe links, keyboard focus, and visual baseline', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerNotificationsCopy(locale);
    await page.goto(`/seeker/notifications?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-07"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.locator('.seeker-notifications__item')).toHaveCount(8);
    await expect(page.locator('.seeker-notifications__item[data-state="unread"]')).toHaveCount(4);
    await expect(page.locator('.seeker-notifications__unread-dot')).toHaveCount(4);
    await expect(page.locator('.seeker-notifications__reference')).toHaveText(['VIEW-201', 'REQ-4798', 'REQ-4766', 'P002', 'REQ-4821', 'VIEW-160']);
    await expect(page.locator('body')).not.toContainText(/recipientId|internalNote|accessToken|refreshToken|providerDocument/u);
    await expect(page.locator('.seeker-notifications__count')).toContainText(`4 ${copy.unreadCount}`);
    await expect(page.getByRole('link', { name: locale === 'ar' ? 'تذكير بموعد معاينة' : 'Viewing appointment reminder' })).toHaveAttribute('href', `/seeker/viewings?viewing=${firstId}&ref=VIEW-201&lang=${locale}`);
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.seeker-notifications__tab').first().focus();
    await expect(page.locator('.seeker-notifications__tab').first()).toBeFocused();
    await expect(page.getByRole('button', { name: new RegExp(`^${copy.markAll}`) })).toBeVisible();
    await expect(page).toHaveScreenshot(`seeker-notifications-${locale}.png`, { fullPage: true });
  });

  test('keeps the compact list in bounds at desktop, tablet, and mobile widths', async ({ page }) => {
    const locale = localeForProject();
    for (const viewport of [{ width: 1551, height: 1010 }, { width: 800, height: 900 }, { width: 393, height: 851 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/seeker/notifications?lang=${encodeURIComponent(locale)}`);
      await expect(page.locator('.seeker-notifications__item')).toHaveCount(8);
      const geometry = await page.evaluate(() => {
        const first = document.querySelector<HTMLElement>('.seeker-notifications__item[data-state="unread"]');
        const icon = first?.querySelector<HTMLElement>('.seeker-notifications__icon');
        const dot = first?.querySelector<HTMLElement>('.seeker-notifications__unread-dot');
        const firstRect = first?.getBoundingClientRect();
        const iconRect = icon?.getBoundingClientRect();
        const dotRect = dot?.getBoundingClientRect();
        const list = document.querySelector<HTMLElement>('.seeker-notifications__list');
        const firstStyle = first === null || first === undefined ? undefined : getComputedStyle(first);
        const listStyle = list === null ? undefined : getComputedStyle(list);
        return {
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          firstLeft: firstRect?.left ?? -1,
          firstRight: firstRect?.right ?? window.innerWidth + 1,
          iconLeft: iconRect?.left ?? window.innerWidth,
          dotLeft: dotRect?.left ?? -1,
          rowGap: listStyle?.rowGap,
          rowRadius: firstStyle?.borderTopLeftRadius,
          rowMargin: firstStyle?.marginBlockStart
        };
      });
      expect(geometry.documentWidth, `${locale} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.firstLeft, `${locale} at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(geometry.firstRight, `${locale} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.iconLeft, `${locale} at ${viewport.width}px`).toBeLessThan(geometry.dotLeft);
      expect(geometry.rowGap, `${locale} at ${viewport.width}px`).toBe('0px');
      expect(geometry.rowMargin, `${locale} at ${viewport.width}px`).toBe('0px');
      expect(geometry.rowRadius, `${locale} at ${viewport.width}px`).toBe('0px');
    }
  });

  test('filters unread notifications and supports read and read-all actions', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerNotificationsCopy(locale);
    await page.goto(`/seeker/notifications?lang=${encodeURIComponent(locale)}`);
    await page.locator('.seeker-notifications__tab').nth(1).click();
    await expect(page.locator('.seeker-notifications__item')).toHaveCount(4);
    await expect(page.getByTestId(`seeker-notification-${firstId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-notification-${secondId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-notification-${fifthId}`)).toHaveCount(0);
    await page.getByTestId(`seeker-notification-${firstId}`).getByRole('button', { name: copy.markRead }).click();
    await expect(page.locator('.seeker-notifications__feedback[data-state="success"]')).toContainText(copy.mutation.markedRead);
    await expect(page.locator('.seeker-notifications__item')).toHaveCount(3);
    await page.locator('.seeker-notifications__tab').first().click();
    await expect(page.getByTestId(`seeker-notification-${fifthId}`)).toBeVisible();
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
