import { expect, test, type Page } from '@playwright/test';
import { publicTeamFixture } from './public-fixtures';

async function mockContent(page: Page) {
  const fixture = publicTeamFixture();
  const items = Array.from({ length: 20 }, (_, index) => ({
    ...fixture.data.items[index % fixture.data.items.length],
    key: `member_${index}`,
    category: index % 2 ? 'sales' : 'management',
    imageUrl: `/assets/team-mobile-test-${index}.svg`,
    order: index
  }));
  await page.route('**/api/v1/public/about', route => route.fulfill({ json: {
    data: { items: [{ key: 'about_intro', title: { en: 'About' }, body: { en: 'Published introduction.' }, order: 0 }] },
    meta: { requestId: 'team-mobile-about' }
  } }));
  await page.route('**/api/v1/public/team', route => route.fulfill({ json: { ...fixture, data: { items } } }));
  const photos = new Set<string>();
  await page.route('**/assets/team-mobile-test-*.svg', route => {
    photos.add(route.request().url());
    return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#eee"/></svg>' });
  });
  return photos;
}

async function scrollDown(page: Page, browserName: string) {
  if (browserName === 'webkit') {
    // Playwright cannot synthesize a swipe or wheel in mobile WebKit. Check
    // actual document scrolling separately from the real tap interactions.
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'instant' }));
  } else await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
}

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
test.beforeEach(() => { test.skip(!test.info().project.name.startsWith('mobile-'), 'Mobile navigation regression.'); });

test('touch navigation stays scrollable, defers distant portraits, and keeps filters and menu responsive', async ({ page, browserName }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const photos = await mockContent(page);
  await page.goto(`/about?lang=${locale}`);
  await expect(page.locator('[data-about-state="success"]')).toBeVisible();
  // A previous keyboard focus must not put a gold rectangle on a touch route title.
  await page.keyboard.press('Tab');
  const menu = page.locator('.public-homepage__menu-toggle');
  await menu.tap();
  await page.locator('#public-site-navigation a[href*="/team"]').tap();
  const heading = page.locator('.public-team h1');
  await expect(heading).toHaveAttribute('data-navigation-focus', 'pointer');
  await expect(heading).toBeFocused();
  await expect(heading).toHaveCSS('outline-style', 'none');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(page.locator('.public-team__card')).toHaveCount(20);
  await expect(page.locator('.public-team__photo').first()).toHaveJSProperty('naturalWidth', 800);
  await expect(page.locator('.public-team__photo[loading="lazy"]')).toHaveCount(19);
  expect(photos.size).toBeLessThan(20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await scrollDown(page, browserName);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('.public-team__filters button', { hasText: locale === 'ar' ? 'مبيعات' : 'Sales' }).tap();
  await expect(page.locator('.public-team__card')).toHaveCount(10);
  await menu.tap();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await menu.tap();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await scrollDown(page, browserName);
});

test('keyboard navigation still announces the title and shows focus on filters', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await mockContent(page);
  await page.goto(`/about?lang=${locale}`);
  await expect(page.locator('[data-about-state="success"]')).toBeVisible();
  await page.locator('.public-site-footer a[href*="/team"]').first().focus();
  await page.keyboard.press('Enter');
  const heading = page.locator('.public-team h1');
  await expect(heading).toHaveAttribute('data-navigation-focus', 'keyboard');
  await expect(heading).toBeFocused();
  await expect(heading).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Tab');
  const filter = page.locator('.public-team__filters button').first();
  await expect(filter).toBeFocused();
  await expect(filter).toHaveCSS('outline-style', 'solid');
});
