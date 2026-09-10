import { expect, test } from '@playwright/test';
import { routePublicHomepageApi, routePublicPropertyListApi } from './public-fixtures.ts';

test('detail gallery badges are separated over the image and show the transaction type', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.route('**/api/v1/public/properties/badge-check', route => route.fulfill({
    json: { data: {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'badge-check', kind: 'property',
      name: { ar: 'عقار للاختبار', en: 'Badge layout property' }, transactionType: 'rent', installmentAvailable: true,
      imageUrl: '/assets/canonical/public/property-villa.png',
      source: { sourceType: 'developer_company' },
      seo: { slug: 'badge-check', title: { en: 'Badge layout property' } }, project: null, media: [], features: [], services: [], relatedProperties: []
    }, meta: { requestId: 'badge-layout' } }
  }));
  await page.goto(`/properties/badge-check?lang=${locale}`, { waitUntil: 'networkidle' });
  const gallery = page.locator('.public-property-details__gallery');
  await expect(gallery).toBeVisible();
  await expect(gallery.locator('.public-property-details__gallery-badge--transaction')).toHaveText(locale === 'ar' ? 'إيجار' : 'For rent');
  const valid = await gallery.evaluate(element => {
    const media = element.querySelector('.public-property-details__gallery-main')!.getBoundingClientRect();
    const badges = [...element.querySelectorAll('.public-property-details__gallery-badge')];
    return badges.every(badge => {
      const rect = badge.getBoundingClientRect();
      return rect.left >= media.left && rect.right <= media.right && rect.top >= media.top && rect.bottom <= media.bottom && getComputedStyle(badge).backgroundColor !== 'rgba(0, 0, 0, 0)';
    }) && document.documentElement.scrollWidth <= window.innerWidth;
  });
  expect(valid).toBe(true);
  await gallery.screenshot({ path: test.info().outputPath('gallery.png') });
});

test('property badges and provider identity fit the card on every device', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicPropertyListApi(page);
  await page.goto(`/properties?lang=${locale}`, { waitUntil: 'networkidle' });
  const cards = page.locator('.public-property-listing__card');
  await expect(cards.first()).toBeVisible();
  const failures = await cards.evaluateAll(elements => elements.flatMap(card => {
    const media = card.querySelector('.ui-property-card__media')!.getBoundingClientRect();
    return [...card.querySelectorAll('.ui-property-card__badges span')].flatMap(badge => {
      const rect = badge.getBoundingClientRect();
      const style = getComputedStyle(badge);
      return rect.left < media.left || rect.right > media.right + 1 || rect.bottom > media.bottom || style.backgroundColor === 'rgba(0, 0, 0, 0)' ? [badge.textContent] : [];
    });
  }));
  expect(failures).toEqual([]);
  await expect(page.locator('.public-property-listing__source-identity').first()).toHaveCSS('display', 'flex');
  await cards.first().screenshot({ path: test.info().outputPath('property-card.png') });
});

test('banner text remains fully visible and its action fits inside the banner', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicHomepageApi(page);
  await page.goto(`/?lang=${locale}`, { waitUntil: 'networkidle' });
  const card = page.locator('.public-homepage__banner-card');
  await expect(card).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await card.screenshot({ path: test.info().outputPath('banner.png') });
  const geometry = await card.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      clipped: [...element.querySelectorAll('.public-homepage__banner-copy > *, .public-homepage__banner-highlight')].flatMap(child => {
        const rect = child.getBoundingClientRect();
        const style = getComputedStyle(child);
        const clipsText = style.overflowY !== 'visible' && child.scrollHeight > child.clientHeight + 1;
        return rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.bottom > bounds.bottom + 1 || clipsText ? [child.className] : [];
      })
    };
  });
  expect(geometry).toEqual({ overflow: false, clipped: [] });
  await card.screenshot({ path: test.info().outputPath('banner.png') });
});
