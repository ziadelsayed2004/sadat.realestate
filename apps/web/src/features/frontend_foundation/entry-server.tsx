import { renderToString } from 'react-dom/server';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { resolveRoute } from '../../routes/route-table.js';
import { App } from './app.js';
import { directionForLocale, getFoundationCopy, resolveLocale } from './locale.js';

export interface ServerRenderOptions {
  readonly acceptLanguage?: string;
}

export interface ServerRenderResult {
  readonly html: string;
  readonly locale: SupportedLocale;
  readonly direction: 'rtl' | 'ltr';
  readonly statusCode: 200 | 404;
  readonly title: string;
}

export function render(url: string, options: ServerRenderOptions = {}): ServerRenderResult {
  const parsedUrl = new URL(url, 'http://sadat.local');
  const locale = resolveLocale(parsedUrl.searchParams.get('lang'), options.acceptLanguage);
  const route = resolveRoute(url);
  const copy = getFoundationCopy(locale);
  return {
    html: renderToString(<App url={url} locale={locale} />),
    locale,
    direction: directionForLocale(locale),
    statusCode: route.kind === 'not_found' ? 404 : 200,
    title: copy.brand
  };
}
