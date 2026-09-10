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

test('developer profile media and identity stay inside their responsive frame', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.route('**/api/v1/public/developers/approved-builder', route => route.fulfill({ json: {
    data: {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa', kind: 'developer_company', slug: 'approved-builder',
      name: { ar: 'شركة السادات للتطوير العقاري', en: 'Sadat Real Estate Development' },
      description: { ar: 'شركة رائدة في تطوير العقارات بمدينة السادات منذ أكثر من خمسة عشر عامًا.', en: 'A leading Sadat City developer for more than fifteen years.' },
      imageUrl: '/assets/clone/pub05-a.png', logoUrl: '/assets/clone/pub05-b.png',
      locations: [{ ar: 'الحي الأول', en: 'First District' }], verified: true,
      projectCount: 1, propertyCount: 0,
      projects: [{ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'central-project', name: { ar: 'المشروع المركزي', en: 'Central project' } }],
      properties: [], stats: { publishedProjects: 1, availableProperties: 0, saleProperties: 0, rentalProperties: 0 }
    }, meta: { requestId: 'developer-layout' }
  } }));
  await page.goto(`/developers/approved-builder?lang=${locale}`, { waitUntil: 'networkidle' });
  await expect(page.locator('#public-developer-profile-title')).toBeVisible();
  const geometry = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.public-developer-profile__hero')!.getBoundingClientRect();
    const media = document.querySelector<HTMLElement>('.public-developer-profile__hero-media')!.getBoundingClientRect();
    const identity = document.querySelector<HTMLElement>('.public-developer-profile__identity')!.getBoundingClientRect();
    const tabs = document.querySelector<HTMLElement>('.public-developer-profile__tabs')!.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      mediaHeight: Math.round(media.height),
      identityHeight: Math.round(identity.height),
      identityInsideHero: identity.left >= hero.left - 1 && identity.right <= hero.right + 1 && identity.bottom <= hero.bottom + 1,
      tabsAfterHero: tabs.top >= hero.bottom - 1,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  expect(geometry.mediaHeight).toBe(geometry.viewport <= 768 ? 192 : 288);
  expect(geometry.identityHeight).toBeLessThan(geometry.viewport <= 768 ? 420 : 300);
  expect(geometry.identityInsideHero).toBe(true);
  expect(geometry.tabsAfterHero).toBe(true);
  expect(geometry.overflow).toBe(false);
});
