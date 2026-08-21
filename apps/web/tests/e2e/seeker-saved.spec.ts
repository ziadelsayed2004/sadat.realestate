import { expect, test } from '@playwright/test';
import { getSeekerSavedCopy } from '../../src/features/seeker/saved-copy.ts';

const firstId = '4123456789abcdef01234567';
const secondId = '5123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function favoriteData(id: string, status: 'published' | 'hidden' = 'published') {
  return {
    id,
    slug: id === firstId ? 'published-home' : 'central-apartment',
    kind: id === firstId ? 'property' : 'unit',
    name: id === firstId ? { ar: 'منزل منشور', en: 'Published home', 'zh-CN': '已发布房产' } : { ar: 'شقة مركزية', en: 'Central apartment', 'zh-CN': '中心公寓' },
    transactionType: id === firstId ? 'sale' : 'rent',
    area: { value: id === firstId ? 120 : 90, unit: 'sqm' },
    layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
    price: { amount: id === firstId ? 1250000 : 18000, currency: 'EGP' },
    savedAt: id === firstId ? '2026-08-18T10:00:00.000Z' : '2026-08-17T10:00:00.000Z',
    ...(status === 'hidden' ? { status } : {})
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'saved-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { accessToken: 'seeker.access.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'seeker', status: 'verified' } }, ...successMeta('saved-refresh') })
    });
  });
}

async function routeFavorites(page: import('@playwright/test').Page): Promise<void> {
  let removeCount = 0;
  await page.route('**/api/v1/seeker/favorites**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.access.token');
    const request = route.request();
    if (request.method() === 'GET') {
      const emptyState = new URL(page.url()).searchParams.get('state') === 'empty';
      const data = emptyState ? [] : [favoriteData(firstId), favoriteData(secondId)];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: data, page: 1, limit: 20, total: data.length }, ...successMeta('saved-list') }) });
      return;
    }
    if (request.method() === 'DELETE') {
      removeCount += 1;
      if (removeCount === 2) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FAVORITE_PROPERTY_UNAVAILABLE', messageKey: 'errors.properties.notFound', details: [], requestId: 'saved-unavailable' } }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { removed: true }, ...successMeta('saved-remove') }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { saved: true, alreadySaved: true, item: favoriteData(firstId) }, ...successMeta('saved-save') }) });
  });
}

test.describe('SEK-06 Seeker Saved Properties', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'SEK-06' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/seeker/SEK-06.png; Figma node 6027-3579' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker dashboard is approved for desktop only.');
    await routeSession(page);
    await routeFavorites(page);
  });

  test('renders localized saved properties, safe projection, focus, and visual baseline', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerSavedCopy(locale);
    await page.goto(`/seeker/saved?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-06"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`seeker-saved-property-${firstId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-saved-property-${secondId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/seekerId|providerId|accessToken|refreshToken/u);
    await expect(page.getByRole('link', { name: copy.view }).first()).toBeVisible();
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await expect(page.getByRole('button', { name: copy.remove }).first()).toBeVisible();
    await expect(page).toHaveScreenshot(`seeker-saved-${locale}.png`, { fullPage: true });
  });

  test('removes saved properties and renders unavailable responses safely', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerSavedCopy(locale);
    await page.goto(`/seeker/saved?lang=${encodeURIComponent(locale)}`);
    const removeButtons = page.getByRole('button', { name: copy.remove });
    await expect(removeButtons.first()).toBeVisible();
    await removeButtons.first().dispatchEvent('click');
    await expect(page.locator('.seeker-saved__feedback[data-state="success"]')).toBeVisible();
    await removeButtons.nth(1).dispatchEvent('click');
    await expect(page.locator('.seeker-saved__feedback[data-state="unavailable"]')).toBeVisible();
  });

  test('renders the truthful empty state and fails closed when refresh is denied', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerSavedCopy(locale);
    await page.goto(`/seeker/saved?lang=${encodeURIComponent(locale)}&state=empty`);
    await expect(page.locator('[data-state="empty"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.empty.title, level: 2 })).toBeVisible();

    await page.unroute('**/api/v1/auth/refresh');
    await routeSession(page, false);
    await page.goto(`/seeker/saved?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="SEK-06"]')).toHaveCount(0);
  });
});
