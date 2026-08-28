import { expect, test } from '@playwright/test';
import { routePublicHomepageApi, routePublicPropertyListApi } from './public-fixtures.ts';

type TestLocale = 'ar' | 'en' | 'zh-CN';

const PERFORMANCE_BUDGETS = Object.freeze({
  ttfbMs: 5_000,
  domContentLoadedMs: 5_000,
  loadEventMs: 10_000,
  scriptBytes: 6_000_000,
  stylesheetBytes: 2_000_000
});

const PERFORMANCE_ROUTES = [
  { path: '/', id: 'public-home' },
  { path: '/properties', id: 'public-properties' }
] as const;

function localeForProject(): TestLocale {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function directionForLocale(locale: TestLocale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

test.describe('local production performance and Core Web Vitals inputs', () => {
  test.beforeEach(async ({ page }) => {
    test.info().annotations.push({ type: 'source-of-truth', description: 'Measured against the built local SSR runtime; no fabricated score or external production data.' });
    test.info().annotations.push({ type: 'locale-matrix', description: 'Configured Playwright project locale and direction are asserted for ar/RTL, en/LTR, and zh-CN/LTR.' });
    page.on('pageerror', error => {
      test.info().annotations.push({ type: 'page-error', description: error.message });
    });
  });

  for (const route of PERFORMANCE_ROUTES) {
    test(`${route.id} stays within measured SSR, hydration, bundle, and image budgets`, async ({ page }) => {
      const locale = localeForProject();
      const direction = directionForLocale(locale);
      if (route.id === 'public-home') await routePublicHomepageApi(page);
      else await routePublicPropertyListApi(page);
      const response = await page.goto(`${route.path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'load' });
      const ssrHtml = response === null ? '' : await response.text();

      expect(response?.status(), route.id).toBe(200);
      expect(ssrHtml, route.id).toContain(`data-route-id="${route.id}"`);
      await expect(page.locator('.route-shell')).toBeVisible();
      if (route.id === 'public-home') {
        await expect(page.locator('[data-page="public-home"]')).toHaveAttribute('data-homepage-state', 'success');
      } else {
        await expect(page.locator('[data-page="public-properties"]')).toHaveAttribute('data-listing-state', 'success');
      }

      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const sizeFor = (initiatorType: string): number => resources
          .filter(resource => resource.initiatorType === initiatorType)
          .reduce((total, resource) => total + (resource.encodedBodySize || resource.transferSize || 0), 0);
        const images = Array.from(document.images).map(image => ({
          src: image.getAttribute('src') ?? '',
          loading: image.loading,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          top: Math.round(image.getBoundingClientRect().top)
        }));
        return {
          ttfbMs: navigation === undefined ? 0 : Math.round(navigation.responseStart - navigation.startTime),
          domContentLoadedMs: navigation === undefined ? 0 : Math.round(navigation.domContentLoadedEventEnd - navigation.startTime),
          loadEventMs: navigation === undefined ? 0 : Math.round(navigation.loadEventEnd - navigation.startTime),
          scriptBytes: sizeFor('script'),
          stylesheetBytes: sizeFor('link'),
          images,
          lang: document.documentElement.lang,
          direction: document.documentElement.dir,
          routeId: document.querySelector('.route-shell')?.getAttribute('data-route-id')
        };
      });

      test.info().annotations.push({ type: 'performance-measurement', description: JSON.stringify({ route: route.id, locale, device: test.info().project.name, budgets: PERFORMANCE_BUDGETS, metrics }) });
      console.log(`[performance] ${JSON.stringify({ route: route.id, locale, project: test.info().project.name, metrics })}`);

      expect(metrics.lang, route.id).toBe(locale);
      expect(metrics.direction, route.id).toBe(direction);
      expect(metrics.routeId, route.id).toBe(route.id);
      expect(metrics.ttfbMs, route.id).toBeLessThan(PERFORMANCE_BUDGETS.ttfbMs);
      expect(metrics.domContentLoadedMs, route.id).toBeLessThan(PERFORMANCE_BUDGETS.domContentLoadedMs);
      expect(metrics.loadEventMs, route.id).toBeLessThan(PERFORMANCE_BUDGETS.loadEventMs);
      expect(metrics.scriptBytes, route.id).toBeLessThan(PERFORMANCE_BUDGETS.scriptBytes);
      expect(metrics.stylesheetBytes, route.id).toBeLessThan(PERFORMANCE_BUDGETS.stylesheetBytes);
      const aboveFold = metrics.images.filter(image => image.top < 720);
      expect(aboveFold.every(image => image.loading === 'eager' || image.complete), `${route.id}: above-fold media`).toBe(true);
      expect(metrics.images.some(image => image.top >= 720 && image.loading === 'lazy'), `${route.id}: below-fold lazy media`).toBe(true);

      await page.evaluate(async () => {
        const step = Math.max(480, Math.floor(window.innerHeight * 0.8));
        for (let top = 0; top <= document.documentElement.scrollHeight; top += step) {
          window.scrollTo(0, top);
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        await Promise.all(Array.from(document.images).map(async image => {
          if (image.complete && image.naturalWidth > 0) return;
          try { await image.decode(); } catch { /* asserted below */ }
        }));
      });
      const finalImages = await page.locator('img').evaluateAll(images => images.map(element => {
        const image = element as HTMLImageElement;
        return { complete: image.complete, naturalWidth: image.naturalWidth };
      }));
      expect(finalImages.every(image => image.complete && image.naturalWidth > 0), `${route.id}: images after lazy-load exercise`).toBe(true);
    });
  }
});
