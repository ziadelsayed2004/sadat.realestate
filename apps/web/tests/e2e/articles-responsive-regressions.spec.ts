import { expect, test } from '@playwright/test';

test('article content comes before available listings with separate names and prices at every width', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const category = { id: 'a'.repeat(24), slug: 'guides', name: { ar: 'أدلة', en: 'Guides' } };
  const article = { id: 'b'.repeat(24), categoryId: category.id, slug: 'rental-guide', title: { ar: 'دليل الإيجار وما يهمك معرفته', en: 'Your guide to renting a property' }, body: { ar: 'اقرأ شروط العقد وتحقق من البيانات قبل توقيع عقد الإيجار.', en: 'Read the contract and verify the details before signing a lease.' }, category, imageUrl: '/assets/clone/pub07-a.png', publishedAt: '2026-10-01T10:00:00Z' };
  const properties = [0, 1, 2].map(index => ({ id: String(index + 1).repeat(24), kind: 'property', slug: `available-home-${index}`, name: { ar: 'شقة متاحة في مدينة السادات بمساحة مناسبة للأسرة', en: 'Available apartment in Sadat City with space for a family' }, transactionType: 'sale', price: { amount: 150000 + index * 100000, currency: 'EGP' }, ...(index === 0 ? {} : { imageUrl: '/assets/canonical/public/listing-property-duplex.png' }) }));
  await page.route('**/api/v1/public/article-categories**', route => route.fulfill({ json: { data: [category], meta: { requestId: 'article-category' } } }));
  await page.route('**/api/v1/public/articles**', route => route.fulfill({ json: { data: new URL(route.request().url()).pathname.endsWith('/rental-guide') ? article : [article], meta: { requestId: 'article-spacing' } } }));
  await page.route('**/api/v1/public/properties**', route => route.fulfill({ json: { data: { items: properties, categories: [], propertyTypes: [], locations: [], page: 1, limit: 3, total: 3 }, meta: { requestId: 'article-properties' } } }));
  if (info.project.name.startsWith('mobile-')) await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/articles/rental-guide?lang=${locale}`);
  const layout = page.locator('.public-article-details__detail-layout');
  const rail = page.locator('.public-article-details__property-rail');
  await expect(rail.getByRole('link')).toHaveCount(3);
  await expect(rail.getByRole('heading')).toHaveText(locale === 'ar' ? 'عقارات متاحة على المنصة' : 'Available properties');
  expect(await layout.evaluate(el => el.firstElementChild?.tagName)).toBe('ARTICLE');
  const geometry = await layout.evaluate(el => {
    const article = el.querySelector('article')!.getBoundingClientRect();
    const rail = el.querySelector('aside')!.getBoundingClientRect();
    return { articleTop: article.top, articleBottom: article.bottom, railTop: rail.top, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, separate: [...el.querySelectorAll('.public-article-details__property')].every(item => { const name = item.querySelector('strong')!.getBoundingClientRect(); const price = item.querySelector('.public-article-details__property-copy > span')!.getBoundingClientRect(); return price.top >= name.bottom + 3; }) };
  });
  expect(geometry.overflow).toBe(false);
  expect(geometry.separate).toBe(true);
  if (geometry.width <= 1024) expect(geometry.railTop).toBeGreaterThanOrEqual(geometry.articleBottom + 20);
  await expect(rail.getByRole('link').first()).toHaveAttribute('href', `/properties/available-home-0?lang=${locale}`);
  await rail.scrollIntoViewIfNeeded();
  await rail.screenshot({ path: info.outputPath('available-properties.png') });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('article-details.png'), fullPage: true });
});

test('article category stays inside media and clear of card content at 360px', async ({ page }) => {
  test.skip(!['mobile-ar', 'mobile-en'].includes(test.info().project.name), 'Article narrow-layout regression runs on both supported copy directions.');
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const category = {
    id: '67000000000000000000000a', slug: 'buying-tips',
    name: { ar: 'نصائح شراء', en: 'Buying tips' },
    description: { ar: 'إرشادات السوق العقاري', en: 'Property market guidance' }
  };
  await page.route('**/api/v1/public/article-categories**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: [category], meta: { requestId: 'articles-responsive-categories' } })
  }));
  await page.route('**/api/v1/public/articles**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      data: [{
        id: '67000000000000000000000b', categoryId: category.id, slug: 'buying-in-sadat',
        title: { ar: 'دليلك الكامل للشراء في مدينة السادات 2024', en: 'Your complete guide to buying in Sadat City 2024' },
        body: { ar: 'كل ما تحتاج معرفته قبل شراء عقار في مدينة السادات.', en: 'Everything you need before buying property in Sadat City.' },
        publishedAt: '2024-01-15T10:00:00.000Z', imageUrl: '/assets/clone/pub07-a.png',
        category, authorName: { ar: 'أحمد محمود', en: 'Ahmed Mahmoud' }, readingTimeMinutes: 8
      }],
      meta: { requestId: 'articles-responsive-list', page: 1, limit: 20, total: 1 }
    })
  }));

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/articles?lang=${locale}`, { waitUntil: 'domcontentloaded' });
  const card = page.locator('[data-article-card]').first();
  await expect(card).toBeVisible();

  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const badge = rect('.public-articles__card-category');
    const media = rect('.public-articles__card-media');
    const title = rect('.public-articles__card-body h2');
    const toolbar = rect('.public-articles__toolbar');
    const card = rect('[data-article-card]');
    const overlaps = (first?: DOMRect, second?: DOMRect) => first !== undefined && second !== undefined
      && first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      badgeInsideMedia: badge !== undefined && media !== undefined && badge.top >= media.top && badge.bottom <= media.bottom
        && badge.left >= media.left && badge.right <= media.right,
      badgeTitleOverlap: overlaps(badge, title),
      toolbarCardOverlap: overlaps(toolbar, card),
      cardFits: card !== undefined && card.left >= 0 && card.right <= document.documentElement.clientWidth
    };
  });

  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.badgeInsideMedia).toBe(true);
  expect(geometry.badgeTitleOverlap).toBe(false);
  expect(geometry.toolbarCardOverlap).toBe(false);
  expect(geometry.cardFits).toBe(true);
});
