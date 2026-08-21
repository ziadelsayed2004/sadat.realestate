import { describe, expect, it } from 'vitest';
import {
  canonicalPathForUrl,
  createPublicSeo,
  createRobotsTxt,
  createSitemapXml,
  localizedAlternatePaths,
  normalizePublicOrigin,
  PUBLIC_SITEMAP_PATHS
} from '../src/features/seo/index.ts';

describe('public SEO metadata', () => {
  it('normalizes canonical paths and emits every supported locale plus x-default', () => {
    expect(canonicalPathForUrl('/articles/buying-in-sadat/?lang=ar&page=2')).toBe('/articles/buying-in-sadat');
    expect(localizedAlternatePaths('/about')).toEqual([
      { hrefLang: 'ar', href: '/about?lang=ar' },
      { hrefLang: 'en', href: '/about?lang=en' },
      { hrefLang: 'zh-CN', href: '/about?lang=zh-CN' },
      { hrefLang: 'x-default', href: '/about' }
    ]);
  });

  it('builds localized public metadata without private fields', () => {
    const metadata = createPublicSeo({
      title: 'Articles',
      locale: 'en',
      canonicalPath: '/articles',
      description: 'Published articles',
      robots: 'noindex,follow'
    });
    expect(metadata.robots).toBe('noindex,follow');
    expect(metadata.openGraph).toEqual({
      type: 'website',
      title: 'Articles',
      description: 'Published articles',
      url: '/articles'
    });
    expect(metadata.jsonLd).not.toHaveProperty('authorId');
  });
});

describe('crawler documents', () => {
  it('uses a validated origin and advertises only approved public collection routes', () => {
    expect(normalizePublicOrigin('https://example.test/public')).toBe('https://example.test');
    expect(normalizePublicOrigin('javascript:alert(1)')).toBeUndefined();
    const sitemap = createSitemapXml('https://example.test');
    for (const pathname of PUBLIC_SITEMAP_PATHS) expect(sitemap).toContain(`<loc>https://example.test${pathname}</loc>`);
    expect(sitemap).not.toContain('/admin/');
    expect(sitemap).not.toContain('/api/');
  });

  it('keeps authenticated and API paths out of crawl results', () => {
    const robots = createRobotsTxt('https://example.test/sitemap.xml');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /admin/');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://example.test/sitemap.xml');
  });
});
