import { SUPPORTED_LOCALES, type SupportedLocale } from '@sadat-real-estate/contracts';

export type RobotsDirective = 'index,follow' | 'noindex,nofollow' | 'noindex,follow' | 'index,nofollow';
export type OpenGraphType = 'website' | 'article' | 'profile';

export interface SeoAlternatePath {
  readonly hrefLang: string;
  readonly href: string;
}

export interface SeoOpenGraph {
  readonly type: OpenGraphType;
  readonly title: string;
  readonly description?: string;
  readonly url: string;
}

export interface PublicSeoMetadata {
  readonly title: string;
  readonly description?: string;
  readonly canonicalPath: string;
  readonly alternatePaths: readonly SeoAlternatePath[];
  readonly robots: RobotsDirective;
  readonly openGraph: SeoOpenGraph;
  readonly jsonLd: Readonly<Record<string, unknown>>;
}

export interface PublicSeoInput {
  readonly title: string;
  readonly locale: SupportedLocale;
  readonly canonicalPath: string;
  readonly description?: string;
  readonly robots?: RobotsDirective;
  readonly openGraphType?: OpenGraphType;
  readonly jsonLd?: Readonly<Record<string, unknown>>;
}

/** The public collection routes are safe to advertise without inventing dynamic records. */
export const PUBLIC_SITEMAP_PATHS = [
  '/',
  '/properties',
  '/developers',
  '/articles',
  '/community',
  '/about',
  '/team'
] as const;

function normalizePath(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '') || '/';
}

export function canonicalPathForUrl(url: string): string {
  try {
    return normalizePath(new URL(url, 'http://sadat.local').pathname);
  } catch {
    return '/';
  }
}

export function localizedAlternatePaths(canonicalPath: string): readonly SeoAlternatePath[] {
  const normalizedPath = normalizePath(canonicalPath);
  const localized = SUPPORTED_LOCALES.map(locale => ({
    hrefLang: locale,
    href: `${normalizedPath}?lang=${encodeURIComponent(locale)}`
  }));
  return [...localized, { hrefLang: 'x-default', href: normalizedPath }];
}

export function createPublicSeo(input: PublicSeoInput): PublicSeoMetadata {
  const canonicalPath = normalizePath(input.canonicalPath);
  const description = input.description?.trim() || undefined;
  const openGraphType = input.openGraphType ?? 'website';
  const jsonLd = input.jsonLd ?? {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.title,
    url: canonicalPath,
    ...(description === undefined ? {} : { description })
  };
  return {
    title: input.title,
    ...(description === undefined ? {} : { description }),
    canonicalPath,
    alternatePaths: localizedAlternatePaths(canonicalPath),
    robots: input.robots ?? 'index,follow',
    openGraph: {
      type: openGraphType,
      title: input.title,
      ...(description === undefined ? {} : { description }),
      url: canonicalPath
    },
    jsonLd
  };
}

export function normalizePublicOrigin(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (url.username || url.password || url.search || url.hash) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function absolutePublicUrl(origin: string, pathname: string): string {
  return new URL(pathname, `${origin}/`).toString();
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  })[character] ?? character);
}

export function createSitemapXml(origin: string, paths: readonly string[] = PUBLIC_SITEMAP_PATHS): string {
  const locations = [...new Set(paths.map(pathname => normalizePath(pathname)))].sort((left, right) => left.localeCompare(right));
  const entries = locations.map(pathname => `<url><loc>${escapeXml(absolutePublicUrl(origin, pathname))}</loc></url>`).join('');
  return '<?xml version="1.0" encoding="UTF-8"?>'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + entries
    + '</urlset>';
}

export function createRobotsTxt(sitemapUrl?: string): string {
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /auth/',
    'Disallow: /provider/',
    'Disallow: /provider-application/',
    'Disallow: /seeker/'
  ];
  if (sitemapUrl !== undefined) lines.push(`Sitemap: ${sitemapUrl}`);
  return `${lines.join('\n')}\n`;
}
