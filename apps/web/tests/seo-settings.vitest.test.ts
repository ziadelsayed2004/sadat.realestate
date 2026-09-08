import { describe, expect, it } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { render } from '../src/features/frontend_foundation/entry-server.tsx';
import { loadPublicSeoSettings, PUBLIC_SEO_SETTINGS_ROUTE } from '../src/features/seo/index.ts';

const publicSeoSettings = {
  title: { ar: 'عقارات السادات', en: 'Configured Sadat Real Estate' },
  description: { ar: 'عقارات منشورة في مدينة السادات', en: 'Configured public description' },
  canonicalUrl: 'https://canonical.example',
  robots: 'noindex,nofollow' as const,
  titleSeparator: '|',
  sitemapStatus: 'inactive' as const,
  googleSiteVerification: 'verification-value'
};

describe('public SEO settings cycle', () => {
  it('loads only the public projection through its anonymous API route', async () => {
    const requests: string[] = [];
    const client = new ApiClient({ fetcher: async input => {
      requests.push(String(input));
      return new Response(JSON.stringify({ data: publicSeoSettings, meta: { requestId: 'seo-settings-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    } });
    await expect(loadPublicSeoSettings({ apiClient: client })).resolves.toEqual(publicSeoSettings);
    expect(requests).toEqual([`/api/v1${PUBLIC_SEO_SETTINGS_ROUTE}`]);
  });

  it('applies configured homepage metadata, canonical origin, and global noindex in SSR', async () => {
    const home = await render('/?lang=en', { publicOrigin: 'https://request.example', publicSeoSettings });
    expect(home.title).toBe('Configured Sadat Real Estate');
    expect(home.seo?.description).toBe('Configured public description');
    expect(home.seo?.robots).toBe('noindex,nofollow');
    expect(home.seo?.googleSiteVerification).toBe('verification-value');
    expect(home.publicOrigin).toBe('https://canonical.example');

    const listing = await render('/properties?lang=en', { publicSeoSettings });
    expect(listing.title).toContain('| Configured Sadat Real Estate');
    expect(listing.seo?.robots).toBe('noindex,nofollow');
  });
});
