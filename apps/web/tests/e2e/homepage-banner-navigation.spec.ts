import { expect, test } from '@playwright/test';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';

test('featured advertiser logo stays separate from the cover and is shown without cropping', async ({ page }) => {
  const lang = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicHomepageApi(page);
  const home = publicHomepageFixture();
  const promotion = home.data.banners.find(item => item.key === 'city_banner')!;
  const logo = '/qa-advertiser-logo.svg';
  home.data.banners = [{ ...promotion, presentation: 'featured', advertiserImageUrl: logo }];
  await page.route('**/qa-advertiser-logo.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="60" viewBox="0 0 180 60"><rect width="180" height="60" fill="#fff"/><text x="8" y="40" fill="#145442" font-size="36">LOGO</text></svg>' }));
  await page.route('**/api/v1/public/home**', route => route.fulfill({ json: home }));
  await page.goto(`/?lang=${lang}`);
  const card = page.locator('.public-homepage__banner-card');
  await card.scrollIntoViewIfNeeded();
  const identity = card.locator('.public-homepage__banner-provider > img');
  await expect(identity).toHaveAttribute('src', logo);
  await expect(identity).toHaveCSS('object-fit', 'contain');
  await expect(identity).toHaveCSS('border-radius', '0px');
  await expect.poll(() => identity.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(180);
  await expect(card.locator('.public-homepage__banner-media-wrapper img')).toHaveAttribute('src', promotion.imageUrl!);
  await card.screenshot({ path: test.info().outputPath('featured-advertiser-logo.png') });
});

test('only the promotion button navigates, carousel controls stay on home and the project opens expanded', async ({ page }) => {
  const lang = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicHomepageApi(page);
  const home = publicHomepageFixture();
  const promotion = home.data.banners.find(item => item.key === 'city_banner')!;
  promotion.targetUrl = '/properties/demo-open-view-apartment';
  await page.route('**/api/v1/public/home**', route => route.fulfill({ json: home }));
  await page.route('**/api/v1/public/developers/as-real-estate-development', async route => {
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill({ json: { data: {
      id: 'a'.repeat(24), slug: 'as-real-estate-development', kind: 'developer_company', verified: true,
      name: { ar: 'شركة AS للتطوير العقاري', en: 'AS Real Estate Development' }, projectCount: 1, propertyCount: 0,
      projects: [{ id: 'b'.repeat(24), slug: 'elite-compound', name: { ar: 'كمبوند النخبة', en: 'Elite Compound' },
        description: { ar: 'تفاصيل كمبوند النخبة في الحي الأول', en: 'Elite Compound details in the First District' },
        imageUrl: '/assets/canonical/public/banner-elite-compound-figma.png', unitCount: 22,
        locationName: { ar: 'الحي الأول', en: 'First District' }, priceLabel: { ar: 'تبدأ من 1.2 مليون جنيه', en: 'Starting from EGP 1.2 million' } }],
      properties: [], stats: { publishedProjects: 1, availableProperties: 0, saleProperties: 0, rentalProperties: 0 }
    }, meta: { requestId: 'banner-project-destination' } } });
  });
  await page.goto(`/?lang=${lang}`);
  const card = page.locator('.public-homepage__banner-card');
  await card.scrollIntoViewIfNeeded();
  const homeUrl = page.url();
  expect(await card.locator('a').count()).toBe(1);
  for (const selector of ['.public-homepage__banner-title', '.public-homepage__banner-body', '.public-homepage__banner-highlight', '.public-homepage__banner-media-wrapper img']) {
    await card.locator(selector).click();
    expect(page.url()).toBe(homeUrl);
  }
  await card.click({ position: { x: 8, y: 8 } }); expect(page.url()).toBe(homeUrl);
  await card.locator('.public-homepage__banner-control--next').click();
  await expect(page.locator('.public-homepage__banner-dot').nth(1)).toHaveClass(/is-active/u);
  expect(page.url()).toBe(homeUrl);
  await card.locator('.public-homepage__banner-control--previous').click();
  await expect(page.locator('.public-homepage__banner-dot').first()).toHaveClass(/is-active/u);
  expect(page.url()).toBe(homeUrl);
  const cta = card.getByRole('link', { name: lang === 'ar' ? 'اكتشف المشروع' : 'Discover the project', exact: true });
  await expect(cta).toHaveAttribute('href', `/developers/as-real-estate-development?lang=${lang}#project-elite-compound`);
  await cta.click();
  await expect(page).toHaveURL(new RegExp(`/developers/as-real-estate-development\\?lang=${lang}#project-elite-compound$`));
  const project = page.locator('#project-elite-compound');
  await expect(project).toBeVisible();
  await expect(project.locator('details')).toHaveAttribute('open', '');
  await expect(project).toContainText(lang === 'ar' ? 'تفاصيل كمبوند النخبة' : 'Elite Compound details');
  await expect.poll(() => project.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const headerBottom = document.querySelector('.public-site-header')?.getBoundingClientRect().bottom ?? 0;
    return bounds.top >= headerBottom - 1 && bounds.top < innerHeight;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('promotion-project.png'), fullPage: true });
});
