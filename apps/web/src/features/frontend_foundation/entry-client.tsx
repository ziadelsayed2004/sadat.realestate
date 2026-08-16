import { hydrateRoot } from 'react-dom/client';
import { App } from './app.js';
import { applyLocaleToDocument, createBrowserLocaleStore } from '../localization/index.js';

const root = document.getElementById('app');
if (root === null) throw new Error('SSR root element is missing');

const localeStore = createBrowserLocaleStore({
  explicitLocale: document.documentElement.lang,
  acceptLanguage: navigator.language
});
const { locale } = localeStore.getSnapshot();
applyLocaleToDocument(locale);
hydrateRoot(root, <App url={window.location.href} locale={locale} />);
