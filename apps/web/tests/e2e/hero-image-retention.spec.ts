import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';

const urls = ['/assets/hero-retained-first.png', '/assets/hero-retained-second.png'];
async function setup(page: Page, locale: 'ar' | 'en') {
  await page.clock.install({ time: new Date('2026-10-11T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await routePublicHomepageApi(page);
  const response = publicHomepageFixture();
  response.data.banners = urls.map((imageUrl, index) => ({ key: `banner_retained_${index}`, title: { ar: `إعلان ${index + 1}`, en: `Banner ${index + 1}` }, imageUrl, displaySeconds: 3, order: index }));
  await page.route('**/api/v1/public/home**', route => route.fulfill({ json: response }));
  const body = await readFile(new URL('../../public/assets/canonical/public/listing-property-rental.png', import.meta.url));
  const counts = [0, 0];
  return { body, counts, href: `/?lang=${locale}`, title: (index: number) => response.data.banners[index]!.title![locale]! };
}

test('loads each hero image once even with no-store and retains the same nodes across arrows, timers and refreshes', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const fixture = await setup(page, locale);
  await page.route('**/assets/hero-retained-*.png', async route => {
    fixture.counts[urls.indexOf(new URL(route.request().url()).pathname)]!++;
    await route.fulfill({ body: fixture.body, contentType: 'image/png', headers: { 'cache-control': 'no-store' } });
  });
  await page.goto(fixture.href);
  const hero = page.locator('#homepage-hero');
  const images = hero.locator('.public-homepage__hero-media img');
  await expect(images).toHaveCount(2);
  await expect.poll(() => images.evaluateAll(elements => elements.every(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const nodes = await images.elementHandles();
  const current = hero.locator('.public-homepage__hero-media img:not([hidden])');
  const next = hero.getByRole('button', { name: locale === 'ar' ? 'الصورة التالية' : 'Next image', exact: true });
  const previous = hero.getByRole('button', { name: locale === 'ar' ? 'الصورة السابقة' : 'Previous image', exact: true });
  for (let iteration = 0; iteration < 4; iteration++) {
    await next.click();
    await expect(current).toHaveAttribute('src', urls[1]!);
    await previous.click();
    await expect(current).toHaveAttribute('src', urls[0]!);
  }
  for (let iteration = 0; iteration < 12; iteration++) {
    await page.clock.runFor(3000);
    await expect(current).toHaveAttribute('src', urls[(iteration + 1) % 2]!);
  }
  for (const node of nodes) expect(await node.evaluate(element => element.isConnected)).toBe(true);
  expect(fixture.counts).toEqual([1, 1]);
  await hero.screenshot({ path: info.outputPath('retained-hero.png') });
});

test('keeps the current image and title visible until a slow next image has loaded', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const fixture = await setup(page, locale);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/hero-retained-*.png', async route => {
    const index = urls.indexOf(new URL(route.request().url()).pathname);
    fixture.counts[index]!++;
    if (index === 1) await gate;
    await route.fulfill({ body: fixture.body, contentType: 'image/png', headers: { 'cache-control': 'no-store' } });
  });
  try {
    await page.goto(fixture.href, { waitUntil: 'domcontentloaded' });
    const hero = page.locator('#homepage-hero');
    const current = hero.locator('.public-homepage__hero-media img:not([hidden])');
    await expect.poll(() => current.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect.poll(() => fixture.counts).toEqual([1, 1]);
    await hero.getByRole('button', { name: locale === 'ar' ? 'الصورة التالية' : 'Next image', exact: true }).click();
    await page.clock.runFor(5000);
    await expect(current).toHaveAttribute('src', urls[0]!);
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(fixture.title(0));
    release();
    await expect(current).toHaveAttribute('src', urls[1]!);
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(fixture.title(1));
    await hero.getByRole('button', { name: locale === 'ar' ? 'الصورة السابقة' : 'Previous image', exact: true }).click();
    await expect(current).toHaveAttribute('src', urls[0]!);
    expect(fixture.counts).toEqual([1, 1]);
  } finally { release(); }
});
