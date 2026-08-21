import { test, expect } from '@playwright/test';

test('public SSR metadata and crawler documents are crawlable and permission-safe', async ({ page, request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Disallow: /admin/');
  expect(await robots.text()).toContain('Sitemap:');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain('<urlset');
  expect(sitemapBody).toContain('/properties</loc>');
  expect(sitemapBody).not.toContain('/api/');

  const response = await page.goto('/properties?lang=en');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/properties$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  expect(await page.content()).not.toMatch(/authorId|updatedBy|reviewReason/);
});
