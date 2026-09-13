import { expect, test } from '@playwright/test';
import { getSeekerSavedCopy } from '../../src/features/seeker/saved-copy.ts';

const firstId = '4123456789abcdef01234567';
const secondId = '5123456789abcdef01234567';
const thirdId = '6123456789abcdef01234567';
const fourthId = '7123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function favoriteData(id: string, status: 'published' | 'hidden' = 'published') {
  const records = {
    [firstId]: {
      slug: 'luxury-apartment-first-district', kind: 'property', name: { ar: 'شقة فاخرة في الحي الأول', en: 'Luxury apartment in the First District' }, transactionType: 'sale',
      area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 1 }, price: { amount: 1900000, currency: 'EGP' },
      imageUrl: '/assets/canonical/public/listing-property-home.png', locationName: { ar: 'الحي الأول', en: 'First District' }, publicCode: 'SDT-1234', viewCount: 342,
      featured: true, installmentAvailable: true, sourceName: { ar: 'شركة السادات للتطوير العقاري', en: 'Sadat Real Estate Development' }, sourceImageUrl: '/assets/canonical/public/listing-provider-sadat.png', sourceType: 'developer_company', sourceVerified: true
    },
    [secondId]: {
      slug: 'independent-villa-upscale-district', kind: 'property', name: { ar: 'فيلا مستقلة بالمنطقة الراقية', en: 'Independent villa in the upscale district' }, transactionType: 'sale',
      area: { value: 320, unit: 'sqm' }, layout: { bedrooms: 5, bathrooms: 4, floor: 2 }, price: { amount: 5200000, currency: 'EGP' },
      imageUrl: '/assets/canonical/public/listing-property-villa.png', locationName: { ar: 'المنطقة الراقية', en: 'Upscale District' }, publicCode: 'SDT-0892', viewCount: 512,
      featured: true, installmentAvailable: true, sourceName: { ar: 'مجموعة النيل العقارية', en: 'Al Nile Real Estate Group' }, sourceImageUrl: '/assets/canonical/public/listing-provider-nile.png', sourceType: 'developer_company', sourceVerified: true
    },
    [thirdId]: {
      slug: 'rental-apartment-third-district', kind: 'unit', name: { ar: 'شقة للإيجار في الحي الثالث', en: 'Rental apartment in the Third District' }, transactionType: 'rent',
      area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 2, floor: 3 }, price: { amount: 8500, currency: 'EGP' },
      imageUrl: '/assets/canonical/public/listing-property-rental.png', locationName: { ar: 'الحي الثالث', en: 'Third District' }, publicCode: 'SDT-0234', viewCount: 267,
      featured: false, installmentAvailable: false, sourceName: { ar: 'أحمد حسن', en: 'Ahmed Hassan' }, sourceImageUrl: '/assets/canonical/public/listing-provider-ahmed.png', sourceType: 'brokerage_office', sourceVerified: false
    },
    [fourthId]: {
      slug: 'luxury-duplex-fifth-district', kind: 'property', name: { ar: 'دوبلكس فاخر في الحي الخامس', en: 'Luxury duplex in the Fifth District' }, transactionType: 'sale',
      area: { value: 240, unit: 'sqm' }, layout: { bedrooms: 4, bathrooms: 3 }, price: { amount: 3100000, currency: 'EGP' },
      imageUrl: '/assets/canonical/public/listing-property-duplex.png', locationName: { ar: 'الحي الخامس', en: 'Fifth District' }, publicCode: 'SDT-0567', viewCount: 423,
      featured: true, installmentAvailable: true, sourceName: { ar: 'شركة السادات للتطوير العقاري', en: 'Sadat Real Estate Development' }, sourceImageUrl: '/assets/canonical/public/listing-provider-sadat.png', sourceType: 'developer_company', sourceVerified: true
    }
  } as const;
  const record = records[id as keyof typeof records] ?? records[firstId];
  return {
    id,
    ...record,
    savedAt: '2026-01-15T12:00:00.000Z',
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
      const data = emptyState ? [] : [favoriteData(firstId), favoriteData(secondId), favoriteData(thirdId), favoriteData(fourthId)];
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
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/seeker/SEK-06.png; Figma node 6027:4748' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker dashboard is approved for desktop only.');
    await routeSession(page);
    await routeFavorites(page);
  });

  test('renders localized saved properties, safe projection, focus, and visual baseline', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerSavedCopy(locale);
    await page.setViewportSize({ width: 1551, height: 1228 });
    await page.goto(`/seeker/saved?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-06"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`seeker-saved-property-${firstId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-saved-property-${secondId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-saved-property-${thirdId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-saved-property-${fourthId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/seekerId|providerId|accessToken|refreshToken/u);
    await expect(page.getByRole('link', { name: copy.view }).first()).toBeVisible();
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await expect(page.getByRole('button', { name: copy.remove }).first()).toBeVisible();
    const compare = page.getByTestId(`seeker-saved-property-${firstId}`).locator('.seeker-saved-property-card__compare');
    await expect(compare).toHaveAccessibleName(locale === 'ar' ? 'أضف للمقارنة' : 'Add to compare');
    await compare.click();
    await expect(compare).toHaveAttribute('aria-pressed', 'true');
    await compare.click();
    await expect(compare).toHaveAttribute('aria-pressed', 'false');
    await expect(page).toHaveScreenshot(`seeker-saved-${locale}.png`, { fullPage: true });
  });

  test('keeps the saved-property grid within responsive viewports', async ({ page }) => {
    const locale = localeForProject();
    for (const width of [393, 768, 1280]) {
      await page.setViewportSize({ width, height: 863 });
      await page.goto(`/seeker/saved?lang=${encodeURIComponent(locale)}`);
      await expect(page.getByTestId(`seeker-saved-property-${firstId}`)).toBeVisible();
      const geometry = await page.locator('.seeker-saved__grid').evaluate(element => {
        const grid = element.getBoundingClientRect();
        const card = element.querySelector<HTMLElement>('.seeker-saved-property-card')?.getBoundingClientRect();
        return {
          columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
          gridLeft: grid.left,
          gridRight: grid.right,
          cardWidth: card?.width ?? 0,
          viewportWidth: window.innerWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });
      expect(geometry.hasHorizontalOverflow).toBe(false);
      expect(geometry.gridLeft).toBeGreaterThanOrEqual(-1);
      expect(geometry.gridRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.cardWidth).toBeGreaterThan(0);
      expect(geometry.columns).toBe(width > 1100 ? 3 : 1);
    }
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
