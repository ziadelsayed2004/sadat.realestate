import { expect, test } from '@playwright/test';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures';

test('homepage about section uses the available width without clipping its text or image', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicHomepageApi(page);
  const fixture = publicHomepageFixture();
  fixture.data.content = fixture.data.content.map(item => item.type === 'about' ? {
    ...item, imageUrl: undefined,
    title: { ar: 'عن منصة عقارات السادات', en: 'About Sadat Real Estate' },
    body: { ar: 'أنشأنا هذه المنصة لأن السوق العقاري في مدينة السادات يحتاج منصة متخصصة وموثوقة.', en: 'We built this platform because Sadat City needs a specialized and trusted real-estate marketplace.' }
  } : item);
  await page.route('**/api/v1/public/home**', route => route.fulfill({ json: fixture }));
  await page.goto(`/?lang=${locale}`);
  const section = page.locator('.public-homepage__section--about');
  await section.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const image = section.locator('img');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', '/assets/canonical/public/home-hero-sadat-city.png');
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const geometry = await section.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const content = element.querySelector<HTMLElement>('.public-homepage__about-content')!;
    const media = element.querySelector<HTMLElement>('.public-homepage__about-media')!;
    const contentRect = content.getBoundingClientRect(); const mediaRect = media.getBoundingClientRect();
    return { width: rect.width, viewport: document.documentElement.clientWidth, contentWidth: contentRect.width,
      contentFits: content.scrollWidth <= content.clientWidth + 1,
      imageFits: mediaRect.left >= rect.left && mediaRect.right <= rect.right && mediaRect.bottom <= rect.bottom + 1,
      direction: getComputedStyle(content).direction,
      below: mediaRect.top >= contentRect.bottom - 1,
      documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      height: rect.height
    };
  });
  await section.screenshot({ path: test.info().outputPath(`homepage-about-${locale}.png`) });
  expect(geometry.width).toBeGreaterThanOrEqual(geometry.viewport - 1);
  expect(geometry.contentFits).toBe(true);
  expect(geometry.imageFits).toBe(true);
  expect(geometry.documentFits).toBe(true);
  expect(geometry.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
  if (geometry.viewport <= 900) {
    expect(geometry.below).toBe(true);
    expect(geometry.contentWidth).toBeGreaterThanOrEqual(geometry.viewport - 64);
  }
});

for (const broken of [false, true]) {
  test(`homepage about ${broken ? 'recovers from an unavailable managed image' : 'preserves the managed image'}`, async ({ page }) => {
    await routePublicHomepageApi(page);
    const fixture = publicHomepageFixture();
    const customImage = broken ? '/missing-about-image.png' : '/assets/canonical/public/property-home.png';
    fixture.data.content = fixture.data.content.map(item => item.type === 'about' ? { ...item, imageUrl: customImage } : item);
    if (broken) await page.route('**/missing-about-image.png', route => route.fulfill({ status: 404, body: '' }));
    await page.route('**/api/v1/public/home**', route => route.fulfill({ json: fixture }));
    await page.goto(`/?lang=${test.info().project.name.endsWith('-en') ? 'en' : 'ar'}`);
    const image = page.locator('.public-homepage__about-media img');
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('src', broken ? '/assets/canonical/public/home-hero-sadat-city.png' : customImage);
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });
}
