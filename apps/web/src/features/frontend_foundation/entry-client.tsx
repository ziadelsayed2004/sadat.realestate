import { hydrateRoot } from 'react-dom/client';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { App } from './app.js';
import { resolveLocale } from './locale.js';

const root = document.getElementById('app');
if (root === null) throw new Error('SSR root element is missing');

const locale = resolveLocale(document.documentElement.lang, navigator.language) as SupportedLocale;
hydrateRoot(root, <App url={window.location.href} locale={locale} />);
